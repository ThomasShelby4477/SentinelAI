# SentinelAI — Enterprise AI Data Loss Prevention Gateway

> Real-time interception and scanning of prompts sent to AI/LLM services. Detects PII, API keys, tokens, database credentials, source code, and more before they leave your organization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Employee Touchpoints                      │
│  Browser (ChatGPT/Claude/Gemini) │ API Calls │ SaaS Tools   │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
   ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
   │   Browser    │ │   API    │ │  Reverse    │
   │  Extension   │ │ Gateway  │ │   Proxy     │
   └───────┬──────┘ └────┬─────┘ └──────┬──────┘
           │              │              │
           └──────────────┼──────────────┘
                          │
              ┌───────────▼───────────┐
              │   Detection Pipeline  │
              │                       │
              │  1. Encoding Decoder  │
              │  2. Regex Engine      │
              │  3. Code Classifier   │
              │  4. Score Aggregator  │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   Action Engine       │
              │  BLOCK / WARN / ALLOW │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   Audit Log Service   │
              │   Admin Dashboard     │
              └───────────────────────┘
```

## Project Structure

```
Sem_8_Project/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # Application entry point
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # Async SQLAlchemy setup
│   │   ├── models.py           # ORM models (10 tables)
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── detection/          # Detection pipeline
│   │   │   ├── encoding_decoder.py  # Base64/hex/URL/Unicode decoder
│   │   │   ├── regex_engine.py      # 25+ regex patterns with validators
│   │   │   ├── code_classifier.py   # Source code detection heuristics
│   │   │   └── pipeline.py          # Pipeline orchestrator
│   │   └── routes/             # API endpoints
│   │       ├── scan.py              # POST /api/v1/scan (core)
│   │       ├── policies.py          # Policy CRUD
│   │       └── audit.py             # Audit log + analytics
│   └── requirements.txt
├── dashboard/                  # Admin dashboard (HTML/CSS/JS)
│   ├── index.html              # 5-page SPA
│   ├── style.css               # Premium dark theme
│   └── app.js                  # Chart.js + live scanner
└── extension/                  # Chrome extension (Manifest V3)
    ├── manifest.json           # Extension manifest
    ├── background.js           # Service worker
    ├── content.js              # DOM interception
    ├── content.css             # Notification overlays
    └── popup.html              # Extension popup UI
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

### Dashboard

Open `dashboard/index.html` in a browser, or serve it:

```bash
cd dashboard
python -m http.server 3000
```

### Browser Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder

## What It Detects

| Category | Examples |
|----------|----------|
| PII | Aadhaar, PAN, SSN, email, phone |
| API Keys | OpenAI, AWS, GitHub, Google, Stripe, Slack |
| Tokens | JWT, Bearer tokens |
| DB Credentials | PostgreSQL, MySQL, MongoDB, Redis URIs |
| Source Code | Python, JavaScript, Java, SQL, Shell |
| Internal URLs | RFC1918 IPs, *.internal.corp.com |
| Financial | Credit cards (Luhn-validated), IBAN |
| Credentials | Passwords in plaintext, private keys |

## API Usage

```bash
# Scan a prompt
curl -X POST http://localhost:8000/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "source": "api_gateway",
    "prompt": "My SSN is 123-45-6789 and API key is sk-abc1234567890abcdefghij",
    "destination": "api.openai.com"
  }'
```

## License

Proprietary — Internal use only.
