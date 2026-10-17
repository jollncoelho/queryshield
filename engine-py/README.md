# QueryShield — passe semantique (phase 2)

Microservice FastAPI qui ajoute une analyse par modele de langage aux
heuristiques du moteur principal. Il ne remplace rien : il ajoute des constats
que l'analyse statique ne peut pas produire (intention, coherence du recit,
manipulation relationnelle).

**Le service est optionnel.** Sans lui, QueryShield fonctionne normalement.

## Pourquoi un service separe

Le moteur heuristique est du calcul pur : rapide, deterministe, sans dependance.
Un modele de langage a des besoins opposes : memoire, eventuellement GPU, temps
de reponse de plusieurs secondes, mise a jour du modele independante du produit.
Separer les deux permet de faire evoluer le modele sans redeployer l'application,
et de couper la passe LLM sans interrompre le service.

## Demarrage

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
.venv/bin/pip install -r requirements.txt          # Linux / macOS
python main.py
```

Verification :

```bash
curl http://127.0.0.1:8100/health
```

## Configuration

| Variable | Role | Defaut |
|---|---|---|
| `QUERYSHIELD_ENGINE_HOST` | Interface d'ecoute | `127.0.0.1` |
| `QUERYSHIELD_ENGINE_PORT` | Port d'ecoute | `8100` |
| `QUERYSHIELD_ENGINE_TOKEN` | Jeton partage exige en `Authorization: Bearer` | vide (acces libre) |
| `QUERYSHIELD_LLM_PROVIDER` | `ollama` ou `openai` | `ollama` |
| `QUERYSHIELD_LLM_BASE_URL` | URL du serveur de modeles | selon le fournisseur |
| `QUERYSHIELD_LLM_MODEL` | Nom du modele | `hermes3:8b` / `gpt-4o-mini` |
| `QUERYSHIELD_LLM_API_KEY` | Cle pour une API distante | vide |
| `QUERYSHIELD_LLM_TIMEOUT_S` | Delai maximal d'appel | `30` |
| `QUERYSHIELD_LLM_TEMPERATURE` | Temperature d'echantillonnage | `0.1` |

### Ollama en local (recommande)

Aucune donnee ne quitte le serveur, ce qui est le seul mode vraiment confortable
quand les messages analyses contiennent des donnees personnelles.

```bash
ollama pull hermes3:8b
ollama serve
```

Un modele de 7 a 8 milliards de parametres suffit pour cette tache : la
classification d'intention sur un texte court ne demande pas de raisonnement
profond. Comptez 8 Go de RAM pour une execution confortable sur CPU.

### API compatible OpenAI

```bash
QUERYSHIELD_LLM_PROVIDER=openai
QUERYSHIELD_LLM_BASE_URL=http://127.0.0.1:8000/v1
QUERYSHIELD_LLM_MODEL=votre-modele
QUERYSHIELD_LLM_API_KEY=...
```

Fonctionne avec vLLM, LM Studio, Together, OpenAI, ou tout service exposant
`POST /chat/completions`. **Verifiez les conditions contractuelles du
fournisseur** avant d'y envoyer des messages contenant des donnees de tiers.

## Garde-fous

Le service est concu pour qu'une defaillance du modele soit toujours benigne.

- **Reponse non conforme = aucun constat.** Si le modele ne renvoie pas du JSON
  exploitable, la liste est vide et l'analyse continue.
- **Perimetre borne par le prompt.** Le modele a interdiction de se prononcer
  sur les domaines, SPF, DKIM, DMARC, punycode ou typosquatting : ces elements
  sont deja traites par le moteur principal, et les redemander au LLM ne produit
  que des faux positifs.
- **Verification d'existence de l'extrait cite.** Un `evidence` qui n'apparait
  pas litteralement dans le message est supprime : cela neutralise les
  citations inventees.
- **Plafond de quatre constats.** Un modele bavard ne peut pas noyer le rapport.
- **Poids normalises** sur la meme echelle que les heuristiques, donc fusion
  sans traitement particulier cote TypeScript.
- **Aucun stockage**, aucune journalisation du contenu, aucun acces reseau vers
  les liens du message.

## Interface

```
POST /analyze
Authorization: Bearer <QUERYSHIELD_ENGINE_TOKEN>

{
  "text": "...",
  "channel": "email",
  "subject": "...",
  "sender": "...",
  "rawHeaders": "..."
}
```

```json
{
  "findings": [
    {
      "id": "llm-faux-conseiller-secret",
      "category": "ingenierie-sociale",
      "severity": "critical",
      "title": "Injonction au secret pour empecher la verification",
      "detail": "Le message demande explicitement de ne parler a personne...",
      "evidence": "Ne parlez a personne de cet appel",
      "weight": 35,
      "sources": ["llm"]
    }
  ],
  "model": "hermes3:8b",
  "durationMs": 2140
}
```

## Point a traiter avant production

Le jeton partage (`QUERYSHIELD_ENGINE_TOKEN`) est une protection minimale. Le
service doit etre bind sur `127.0.0.1` ou derriere un reverse proxy avec TLS,
et **jamais expose directement sur Internet**. Prevoir egalement une limitation
de debit : un appel LLM est couteux et constitue la surface d'abus principale.
