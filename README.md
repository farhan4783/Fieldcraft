# FIELDCRAFT 🧭

> **An open-source AI game master that turns your neighborhood into a real-world mystery.**  
> *The story advances when you do.*

Built for the **Hacktoberfest 2026 DEV Challenge — Week 1: “Touch Grass”**.

---

## 🌿 Why Open-Source AI?

A core requirement of the Hacktoberfest Challenge is demonstrating why **open-source AI and open-weight models** are superior to closed proprietary APIs for the project. For FIELDCRAFT, open-source AI is not an afterthought—it is foundational:

1. **Privacy & Closed-AI Isolation:**  
   Outdoor mystery games generate custom stories around where players walk and spend free time. Running **local open-weight Gemma** via Ollama ensures that story-generation prompts, landmark lists, and fictional lore are processed entirely on-device and never transmitted to a closed commercial AI provider or used for corporate model training. *(Note: Live adventure creation uses stateless network queries to OpenStreetMap's public Overpass service to discover nearby landmark coordinates, but these coordinates are never logged to disk or stored in any persistent database).*
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
      ├─ Local Gemma 3 (via Ollama - Primary)
      ├─ Remote Open-Weight Gemma 3 (google/gemma-3-4b-it:free via OpenRouter)
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
  - **Remote Open-Weights Gemma 3 (Zero RAM Overhead):** Set `OPENROUTER_API_KEY=sk-or-...` to run open-weight `google/gemma-3-4b-it:free` via OpenRouter.
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

## 📜 Safety, Accessibility & Attribution

- **Real-World Access & Physical Limitations:** FIELDCRAFT automatically filters for public amenities (parks, squares, fountains, historic monuments) and excludes private or hazardous tags. However, **OpenStreetMap tags cannot guarantee current real-world public access, opening hours, temporary closures, ongoing maintenance, or physical accessibility (such as wheelchair or step-free access)**. Players must always heed local posted signs, respect private boundaries, and exercise personal discretion and safety.
- **Pedestrian Safety First:** Never cross roadways, bicycle paths, or rough terrain while looking at your screen. Narration is designed to be heard in headphones so your phone stays put away while walking.
- **Attribution:** Map data &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Narrative generated with open-weight [Gemma](https://ollama.com/library/gemma3) by Google DeepMind.
- **License:** MIT License.
