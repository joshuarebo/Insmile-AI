# Insmile AI — Dental Treatment Planning for Kenya

Insmile AI is an AI-assisted dental workflow tool tailored for Kenyan clinics. It lets a
dentist upload a scan (X-ray, panoramic, or intraoral photo), see AI-highlighted findings
drawn directly on the image, generate a **Kenya-priced treatment plan** (KES, SHA-aware),
and chat with a locally-grounded assistant.

## What's in the box

- **React 19 + MUI + Tailwind** frontend with a scan viewer, tabbed AI workspace, patient
  and scan pages, and a clean Kenyan branding.
- **Node.js / Express** backend with filesystem-backed storage — no DB to provision.
- **OpenRouter** for AI: vision findings via Gemma 3 27B, chat + treatment plans via
  Llama 3.3 70B. Both are free-tier models.
- **Kenya-specific clinical context** baked into every prompt: SHA coverage, KES pricing
  bands (public / private mid / private premium), referral pathways (Level 2 → Level 6),
  epidemiology (fluorosis, ANUG, early-childhood caries), Kiswahili-friendly patient
  education.

## Quick start

### Prerequisites

- Node.js 18+
- An OpenRouter API key (free): https://openrouter.ai/keys

### Install

```bash
# from repo root
npm install --prefix server
npm install --prefix client
```

### Configure

Create `server/.env` (or copy from `server/.env.example`) and set your API key:

```env
PORT=3001
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_TEXT_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_VISION_MODEL=google/gemma-3-27b-it:free
JWT_SECRET=anything
```

### Seed demo data (optional)

```bash
node server/scripts/seed.js
```

This registers two demo patients (Amina Wanjiru, Brian Otieno) and attaches the first
available scan from `server/uploads/` so the UI has something to show on first load.

### Run

```bash
# from repo root — starts server on :3001 and client on :3000
npm start
```

Or in two terminals:

```bash
npm run start:server    # :3001
npm run start:client    # :3000
```

Open http://localhost:3000 — log in with any email/password (demo auth).

## Project layout

```
client/                      React app (Create React App + MUI + Tailwind)
  src/
    components/              ScanViewer, AIAnalysis, TreatmentPlan, ChatAssistant, ...
    pages/                   Login, Dashboard, AIDashboard, Patients, Scans, ...
    services/ai.ts           Typed client for the AI API (analysis + chat + plan)
server/
  src/
    services/openrouter.js   OpenRouter integration (vision + chat + plan)
    services/ai.js           Thin facade re-exporting openrouter.js
    routes/ai.js             /api/ai/* endpoints
    routes/scans.js          /api/scans/* endpoints (upload, list, image serving)
    routes/patients.js       /api/patients/* endpoints
    store.js                 JSON file store (server/data/*.json) — no DB required
  scripts/seed.js            Demo seed
  uploads/                   User-uploaded scan files
```

## How the AI pipeline works

1. A dentist uploads a scan. The file is stored in `server/uploads/` and registered in
   `server/data/scans.json`.
2. The scan is passed to **Gemma 3 27B** via OpenRouter with a strict JSON schema. The
   model returns findings with normalized bounding boxes (`bbox_norm: [x, y, w, h]` in
   0..1 image coordinates), FDI tooth numbers where identifiable, severity, and
   recommendations.
3. `ScanViewer.tsx` overlays the bounding boxes directly on the scan and highlights the
   selected finding.
4. The treatment plan endpoint passes findings to **Llama 3.3 70B** with a Kenya-aware
   system prompt. The model returns a structured plan with KES prices across public /
   private-mid / private-premium bands and SHA coverage flags per step.
5. The chat assistant uses the same text model plus the patient's latest analysis and
   active treatment plan as context.

## Notes on the AI models

Both `google/gemma-3-27b-it:free` and `meta-llama/llama-3.3-70b-instruct:free` are free
tier and may occasionally return HTTP 429 when upstream providers are rate-limiting. The
server surfaces the error; just retry. For production load, register for a paid
OpenRouter tier or point to a self-hosted model.

## License

Private / proprietary. See `LICENSE`.
