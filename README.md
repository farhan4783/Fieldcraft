# FIELDCRAFT 🧭

> **An open-source AI game master that turns your neighborhood into a real-world mystery.**  
> *The story advances when you do.*

Built for **Hacktoberfest 2026 — Week 1: “Touch Grass”**.

---

## 🌲 What is FIELDCRAFT?

Most outdoor applications ask you to stare at your phone screen—photographing items, reading dashboards, or following turn-by-turn routes. 

**FIELDCRAFT inverts this premise:**
- **Audio-First & Screen-Off:** Clues are narrated directly into your headphones. You keep your head up and eyes on the real world.
- **Local-First AI:** An open-weight **Gemma 3** model running locally via Ollama creates a custom fictional mystery from public points of interest (parks, squares, fountains) discovered in OpenStreetMap.
- **Physical Progress Gate:** The story is gated by deterministic GPS geofencing. You cannot tap “Next” to skip ahead—your feet must physically carry you to the location.
- **Privacy by Design:** Your location coordinates are never logged, stored, or transmitted to any commercial cloud AI API.

---

## 🏛️ Architecture & Principle

> **Key Rule: Gemma writes narrative; deterministic code makes decisions.**

```text
Browser Client
  ├─ Parchment Case File UI
  ├─ Web Speech Synthesis narration & Web Audio Chimes
  ├─ Dual-Reading GPS Geofence Evaluator
  └─ LocalStorage Field Journal
          │
          │ POST /api/adventures
          ▼
Express Server (Node.js)
  ├─ Coordinate & Parameter Validation
  ├─ Bounded Overpass Client (OSM Public POIs)
  ├─ POI Sanitizer & Checkpoint Selector
  └─ Ollama Gemma 3 Engine + Fallback Narrative Generator
```

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- **Node.js** (v18+ or v24+ recommended)
- **AI Engine (Pick ANY option below):**
  - **Option A (Cloud Gemma via Groq - Easiest & Free):** Get a free API key at [console.groq.com](https://console.groq.com) and set `GROQ_API_KEY=gsk_...`. Runs `gemma2-9b-it` at 500+ tokens/sec!
  - **Option B (Google Gemini):** Get a free API key at [aistudio.google.com](https://aistudio.google.com) and set `GEMINI_API_KEY=AIza...`.
  - **Option C (Local Ollama):** Run `ollama run gemma3:4b` or `gemma3:1b`.
  - **Option D (Zero-config Offline):** If no keys are provided and Ollama is offline, FIELDCRAFT automatically uses its built-in deterministic story engine.

### 1. Clone & Install
```bash
git clone https://github.com/farhan4783/Fieldcraft.git
cd Fieldcraft
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
```
Add your free `GROQ_API_KEY` or `GEMINI_API_KEY` to `.env` if you want instant cloud AI without local Ollama.

### 3. Start Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploy Live on Render (1-Click)

FIELDCRAFT is 100% ready to deploy to **Render**:
1. Connect this repo to [Render](https://dashboard.render.com) using Blueprint ([`render.yaml`](render.yaml)).
2. Add `GROQ_API_KEY` in Render Environment Variables for cloud Gemma AI.
3. Your live HTTPS URL gives full mobile browser GPS permissions for outdoor play!

See the complete guide in [**`docs/render-deployment.md`**](docs/render-deployment.md).

---

## 🧪 Testing

FIELDCRAFT includes a comprehensive automated test suite testing geo math, POI filtering, duration budgeting, schema validation, state machines, and API endpoints:

```bash
npm test
```

---

## 🎮 Modes of Play

| Feature | Live Mode | Demo Mode |
|---|---|---|
| **Location Source** | Browser Geolocation API | Seeded Fixture Landmarks |
| **POI Source** | Real-time OpenStreetMap Overpass | `fixtures/demo-pois.json` |
| **Progress Mechanic** | Physical outdoor walk (dual-reading verification) | "⚡ Simulate Arrival" button |
| **UI Indicator** | Live proximity radar | Visibly badged `SIMULATED DEMO` |

---

## 📜 Safety & Attribution

- **Safety First:** FIELDCRAFT only selects verified public green spaces, squares, and monuments. Never cross streets while checking your screen.
- **Attribution:** Map data &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Narrative generated with [Gemma 3](https://ollama.com/library/gemma3) by Google DeepMind.
- **License:** MIT License.
