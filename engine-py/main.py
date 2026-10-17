"""
QueryShield - microservice d'analyse semantique.

Role : ajouter une passe par modele de langage aux heuristiques du moteur
principal. Le service est STRICTEMENT optionnel : s'il est absent, le moteur
Next.js continue de fonctionner avec ses seules heuristiques.

Contrat d'interface (doit rester aligne avec src/lib/engine/remote.ts) :

    POST /analyze
    Authorization: Bearer <QUERYSHIELD_ENGINE_TOKEN>   (si configure)
    {
      "text": "contenu du message",
      "channel": "email|sms|messaging|unknown",
      "subject": "optionnel",
      "sender": "optionnel",
      "rawHeaders": "optionnel"
    }

    -> 200 { "findings": [ Finding, ... ] }

Le service ne stocke rien, ne journalise pas le contenu, et ne visite jamais
les liens presents dans le message.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from engine.llm import LLMUnavailable, analyse_with_llm
from engine.schema import Finding, Severity

MAX_TEXT_LENGTH = 20000

ENGINE_TOKEN = os.getenv("QUERYSHIELD_ENGINE_TOKEN", "").strip()
LLM_PROVIDER = os.getenv("QUERYSHIELD_LLM_PROVIDER", "ollama").strip().lower()

app = FastAPI(
    title="QueryShield Semantic Engine",
    version="0.1.0",
    description=(
        "Passe semantique optionnelle du moteur QueryShield. "
        "Renvoie des constats au format Finding, fusionnes ensuite avec les heuristiques."
    ),
)


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=4, max_length=MAX_TEXT_LENGTH)
    channel: Literal["email", "sms", "messaging", "unknown"] = "unknown"
    subject: str | None = Field(default=None, max_length=400)
    sender: str | None = Field(default=None, max_length=400)
    rawHeaders: str | None = Field(default=None, max_length=30000)


class AnalyzeResponse(BaseModel):
    findings: list[Finding]
    model: str
    durationMs: int


class HealthResponse(BaseModel):
    status: str
    provider: str
    model: str
    auth: str


def _check_auth(authorization: str | None) -> None:
    """Verifie le jeton partage. Si aucun jeton n'est configure, l'acces est libre
    (usage local uniquement : ne pas exposer le service sans jeton)."""
    if not ENGINE_TOKEN:
        return
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_bearer_token")
    provided = authorization.split(" ", 1)[1].strip()
    if provided != ENGINE_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid_token")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    from engine.llm import MODEL_NAME, PROVIDER

    return HealthResponse(
        status="ok",
        provider=PROVIDER,
        model=MODEL_NAME,
        auth="enabled" if ENGINE_TOKEN else "disabled",
    )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest, authorization: str | None = Header(default=None)) -> AnalyzeResponse:
    _check_auth(authorization)

    try:
        findings, model, duration_ms = analyse_with_llm(
            text=payload.text,
            channel=payload.channel,
            subject=payload.subject,
            sender=payload.sender,
        )
    except LLMUnavailable as exc:
        # Le moteur principal traite l'absence de constat comme un cas normal :
        # on renvoie 200 avec une liste vide plutot qu'une erreur, pour ne pas
        # faire echouer l'analyse cote client.
        return AnalyzeResponse(findings=[], model=f"indisponible: {exc}", durationMs=0)

    return AnalyzeResponse(findings=findings, model=model, durationMs=duration_ms)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("QUERYSHIELD_ENGINE_HOST", "127.0.0.1"),
        port=int(os.getenv("QUERYSHIELD_ENGINE_PORT", "8100")),
        log_level="info",
    )
