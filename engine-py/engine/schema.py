"""Modeles de donnees du microservice.

Doit rester strictement aligne avec src/lib/engine/types.ts cote TypeScript.
Toute divergence de format fait perdre les constats du LLM a la fusion.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["critical", "high", "medium", "low", "info"]

Category = Literal[
    "lien",
    "identite",
    "ingenierie-sociale",
    "donnees-sensibles",
    "entetes-email",
    "contenu",
    "metadata",
]

SEVERITY_WEIGHT: dict[str, int] = {
    "critical": 35,
    "high": 20,
    "medium": 9,
    "low": 3,
    "info": 0,
}


class Finding(BaseModel):
    """Constat elementaire produit par le moteur semantique."""

    id: str = Field(description="Identifiant stable de la regle, prefixe llm-")
    category: Category
    severity: Severity
    title: str = Field(max_length=120)
    detail: str = Field(max_length=900, description="Explication en langage naturel")
    evidence: str | None = Field(default=None, max_length=400)
    weight: int = 0
    sources: list[Literal["heuristique", "llm"]] = ["llm"]


class RawFinding(BaseModel):
    """Format attendu en sortie du modele, avant normalisation."""

    id: str
    category: Category
    severity: Severity
    title: str
    detail: str
    evidence: str | None = None
