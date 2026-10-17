"""Adaptateurs de modele de langage.

Deux fournisseurs sont supportes, choisis par la variable QUERYSHIELD_LLM_PROVIDER :

  ollama (defaut) : modele local servi par Ollama, aucune donnee ne quitte le
                    serveur. C'est le mode recommande pour un traitement de
                    messages pouvant contenir des donnees personnelles.
  openai          : toute API compatible OpenAI (vLLM, LM Studio, Together,
                    OpenAI...). Necessite QUERYSHIELD_LLM_API_KEY si le service
                    distant l'exige.

Le modele est interroge avec un format de sortie contraint a du JSON. Toute
reponse non conforme est rejetee silencieusement : mieux vaut aucun constat
qu'un constat corrompu.
"""

from __future__ import annotations

import json
import os
import re
import time

import httpx

from .prompt import SYSTEM_PROMPT, build_user_prompt
from .schema import SEVERITY_WEIGHT, Finding, RawFinding

PROVIDER = os.getenv("QUERYSHIELD_LLM_PROVIDER", "ollama").strip().lower()
DEFAULT_MODEL = "hermes3:8b" if PROVIDER == "ollama" else "gpt-4o-mini"
MODEL_NAME = os.getenv("QUERYSHIELD_LLM_MODEL", DEFAULT_MODEL).strip()
API_KEY = os.getenv("QUERYSHIELD_LLM_API_KEY", "").strip()
TIMEOUT_S = float(os.getenv("QUERYSHIELD_LLM_TIMEOUT_S", "30"))
TEMPERATURE = float(os.getenv("QUERYSHIELD_LLM_TEMPERATURE", "0.1"))

DEFAULT_BASE_URL = "http://127.0.0.1:11434" if PROVIDER == "ollama" else "http://127.0.0.1:8000/v1"
BASE_URL = os.getenv("QUERYSHIELD_LLM_BASE_URL", DEFAULT_BASE_URL).strip().rstrip("/")

VALID_CATEGORIES = {
    "lien",
    "identite",
    "ingenierie-sociale",
    "donnees-sensibles",
    "entetes-email",
    "contenu",
    "metadata",
}


class LLMUnavailable(RuntimeError):
    """Le modele n'a pas pu etre interroge ou sa reponse est inexploitable."""


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMUnavailable("reponse sans objet JSON")

    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise LLMUnavailable(f"JSON invalide: {exc}") from exc


def _call_ollama(messages: list[dict[str, str]]) -> str:
    url = f"{BASE_URL}/api/chat"
    body = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": TEMPERATURE},
    }
    try:
        with httpx.Client(timeout=TIMEOUT_S) as client:
            response = client.post(url, json=body)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        raise LLMUnavailable(f"Ollama injoignable ({url}): {exc}") from exc

    content = payload.get("message", {}).get("content")
    if not isinstance(content, str):
        raise LLMUnavailable("reponse Ollama sans contenu")
    return content


def _call_openai_compatible(messages: list[dict[str, str]]) -> str:
    url = f"{BASE_URL}/chat/completions"
    headers = {"content-type": "application/json"}
    if API_KEY:
        headers["authorization"] = f"Bearer {API_KEY}"

    body = {
        "model": MODEL_NAME,
        "messages": messages,
        "temperature": TEMPERATURE,
        "response_format": {"type": "json_object"},
    }
    try:
        with httpx.Client(timeout=TIMEOUT_S) as client:
            response = client.post(url, json=body, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        raise LLMUnavailable(f"API compatible OpenAI injoignable ({url}): {exc}") from exc

    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMUnavailable("reponse inattendue du fournisseur") from exc

    if not isinstance(content, str):
        raise LLMUnavailable("contenu de reponse non textuel")
    return content


def _normalise(raw_findings: list[dict], text: str) -> list[Finding]:
    """Valide, filtre et normalise les constats produits par le modele."""
    findings: list[Finding] = []
    seen: set[str] = set()

    for item in raw_findings:
        if not isinstance(item, dict):
            continue

        identifier = str(item.get("id", "")).strip().lower()
        if not identifier:
            continue
        if not identifier.startswith("llm-"):
            identifier = f"llm-{identifier}"
        if identifier in seen:
            continue

        category = str(item.get("category", "")).strip()
        severity = str(item.get("severity", "")).strip().lower()
        title = str(item.get("title", "")).strip()
        detail = str(item.get("detail", "")).strip()
        evidence = item.get("evidence")
        evidence = str(evidence).strip() if evidence else None

        if category not in VALID_CATEGORIES or severity not in SEVERITY_WEIGHT:
            continue
        if not title or not detail:
            continue

        # Garde-fou : le modele ne doit pas se prononcer sur les domaines.
        lowered = f"{title} {detail}".lower()
        if any(
            token in lowered
            for token in ("spf", "dkim", "dmarc", "punycode", "adresse ip", "typosquat")
        ):
            continue

        # Garde-fou : l'extrait cite doit exister dans le message.
        if evidence:
            compact_evidence = re.sub(r"\s+", " ", evidence).strip()
            compact_text = re.sub(r"\s+", " ", text)
            if compact_evidence and compact_evidence not in compact_text:
                evidence = None

        seen.add(identifier)
        findings.append(
            Finding(
                id=identifier,
                category=category,  # type: ignore[arg-type]
                severity=severity,  # type: ignore[arg-type]
                title=title[:120],
                detail=detail[:900],
                evidence=evidence[:400] if evidence else None,
                weight=SEVERITY_WEIGHT[severity],
                sources=["llm"],
            )
        )

        if len(findings) >= 4:
            break

    return findings


def analyse_with_llm(
    text: str,
    channel: str,
    subject: str | None = None,
    sender: str | None = None,
) -> tuple[list[Finding], str, int]:
    """Interroge le modele et renvoie (constats, nom du modele, duree en ms)."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(text, channel, subject, sender)},
    ]

    started = time.monotonic()
    raw = _call_ollama(messages) if PROVIDER == "ollama" else _call_openai_compatible(messages)
    duration_ms = int((time.monotonic() - started) * 1000)

    payload = _extract_json(raw)
    raw_findings = payload.get("findings")
    if not isinstance(raw_findings, list):
        raise LLMUnavailable("champ findings absent ou invalide")

    # RawFinding sert de garde de forme avant la normalisation finale.
    for item in raw_findings:
        if isinstance(item, dict):
            try:
                RawFinding.model_validate(item)
            except Exception:  # noqa: BLE001 - on ignore simplement les entrees invalides
                continue

    return _normalise(raw_findings, text), MODEL_NAME, duration_ms
