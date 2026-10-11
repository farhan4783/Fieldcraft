# FIELDCRAFT 🧭

> **An open-source AI game master that turns your neighborhood into a real-world mystery.**  
> *The story advances when you do.*

Built for the **Hacktoberfest 2026 DEV Challenge — Week 1: “Touch Grass”**.

---

## 🌿 Why Open-Source AI?

A core requirement of the Hacktoberfest Challenge is demonstrating why **open-source AI and open-weight models** are superior to closed proprietary APIs for the project. For FIELDCRAFT, open-source AI is not an afterthought—it is foundational:

1. **Absolute Location Privacy:**  
   Outdoor mystery games rely on precise GPS coordinates—revealing where you live, walk, and spend free time. Sending live walking telemetry to commercial cloud AI vendors creates a serious surveillance footprint. With **local open-weight Gemma** running via Ollama, **zero location coordinates ever leave your device**.
2. **Offline & Backcountry Autonomy:**  
   "Touching grass" frequently takes people to nature reserves, dense urban parks, and hiking trails where cellular data drops. A local open-weight model runs entirely offline without network latency, cellular signal, or cloud downtime.
3. **Zero Marginal Cost & Community Freedom:**  
   Anyone around the world can explore endless neighborhood mysteries without entering credit cards, paying per-token subscription rates, or facing proprietary API rate limits.
4. **The Complete Open Stack:**  
   - **Open Map Data:** [OpenStreetMap](https://www.openstreetmap.org) (Overpass API)
   - **Open-Weight AI:** [Google Gemma](https://ollama.com/library/gemma3) (Gemma 3 / Gemma 2)
   - **Open Web Standards:** HTML5 Geolocation, Web Speech Synthesis, and Web Audio API

---

## 🌲 What is FIELDCRAFT?

Most outdoor applications keep you glued to your phone screen—photographing items, reviewing dashboards, or following turn-by-turn routes. 

**FIELDCRAFT inverts this premise:**
- **Audio-First & Screen-Off:** Clues are narrated directly into your headphones. You keep your head up and eyes on the real world.
- **Local Open-Weight AI:** A locally running **Gemma 3** model creates a custom fictional mystery from public points of interest (parks, squares, fountains) discovered in OpenStreetMap.
- **Physical Progress Gate:** The story is gated by deterministic GPS geofencing. You cannot tap “Next” to skip ahead—your feet must physically carry you to the location.
- **Deterministic Rules Engine:** The AI writes the fictional lore, but strict deterministic code enforces boundary checks, GPS accuracy verification, and safety filtering.

---

## 🏛️ Architecture & Principle

> **Key Rule: Gemma writes narrative; deterministic code makes decisions.**

```text
Browser Client (Mobile / Desktop)
  ├─ Parchment Case File UI
  ├─ Web Speech Synthesis narration & Web Audio Chimes
  ├─ Dual-Reading GPS Geofence Evaluator
  ├─ Nominatim Geocoding & City Landmark Search
  └─ LocalStorage Field Journal
          │
          │ POST /api/adventures
          ▼
Express Server (Node.js)
  ├─ Coordinate & Parameter Validation
  ├─ Bounded Overpass Client (OSM Public POIs)
  ├─ POI Sanitizer & Checkpoint Distance Sorter
  └─ Open-Source AI Engine:
      ├─ Local Gemma (via Ollama - Primary)
      ├─ Remote Open-Weight Gemma (Gemma 2 Open Weights)
      └─ Deterministic Narrative Engine (Built-in Failsafe)
```

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- **Node.js** (v18+ or v24+ recommended)
- **AI Engine (Pick what suits your machine):**
  - **Local Open-Source (Gold Standard):** Install [Ollama](https://ollama.com) and run:
    ```bash
    ollama run gemma3:4b
    # Or lightweight for lower-spec machines:
    ollama run gemma3:1b
    ```
  - **Remote Open-Weights Runner (Zero RAM Overhead):** For low-resource devices or hosted containers, you can set `GROQ_API_KEY=gsk_...` to run open-weight `gemma2-9b-it` at 500+ tokens/sec.
  - **Built-in Offline Engine (Zero Setup):** If Ollama is not installed and no keys are provided, FIELDCRAFT automatically engages its built-in procedural narrative engine so you can play immediately.

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
*(Defaults work out of the box with local Ollama on port 11434 or the built-in offline engine).*

### 3. Start Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploy Live on Render (1-Click)

FIELDCRAFT includes a turnkey [`render.yaml`](render.yaml) blueprint:
1. Connect this repo to [Render](https://dashboard.render.com).
2. Render provisions a free HTTPS instance with automatic SSL.
3. Because mobile browsers require HTTPS for the HTML5 Geolocation API, deploying to Render gives you an instant live URL to take on real outdoor walks!
4. See full instructions in [**`docs/render-deployment.md`**](docs/render-deployment.md).

---

## 🧪 Testing

FIELDCRAFT includes an automated test suite verifying geo math, POI categorization, distance budgeting, schema validation, state machines, and API endpoints:

```bash
npm test
```

---

## 🎮 Modes of Play

| Feature | Live Mode | Demo Mode |
|---|---|---|
| **Location Source** | Browser Geolocation API / Landmark Search | Seeded Fixture Landmarks |
| **POI Source** | Real-time OpenStreetMap Overpass | `fixtures/demo-pois.json` |
| **Progress Mechanic** | Physical outdoor walk (dual-reading verification) | "⚡ Simulate Arrival" button |
| **UI Indicator** | Live proximity radar | Visibly badged `SIMULATED DEMO` |

---

## 📜 Safety & Attribution

- **Safety First:** FIELDCRAFT only selects verified public green spaces, squares, and monuments. It explicitly filters out private property, construction zones, and hazardous tags.
- **Attribution:** Map data &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Narrative generated with open-weight [Gemma](https://ollama.com/library/gemma3) by Google DeepMind.
- **License:** MIT License.
