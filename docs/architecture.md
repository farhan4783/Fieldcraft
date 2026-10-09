# FIELDCRAFT — Architecture Documentation

## Core Architectural Principle

> **Gemma writes the narrative; deterministic code makes all decisions.**

The AI model (Gemma 3) does not determine whether the player has arrived at a checkpoint, calculate route safety, decide coordinate numbers, or evaluate geofencing. It receives a sanitized list of real-world public points of interest (POIs) and creates the mystery fiction only.

```text
+--------------------------------------------------------------------------+
|                              CLIENT (Browser)                            |
|                                                                          |
|   +------------------+    +-------------------+    +-----------------+   |
|   |   Setup & HUD    |    |  SpeechSynthesis  |    |  Local Storage  |   |
|   |  (Parchment UI)  |    |  & Audio Effects  |    |  Field Journal  |   |
|   +--------+---------+    +---------+---------+    +--------+--------+   |
|            |                        |                       |            |
|            +-------------------+----+-----------------------+            |
|                                |                                         |
|                     +----------v----------+                              |
|                     |   Geofence Engine   |                              |
|                     | (Dual-reading gate) |                              |
|                     +----------+----------+                              |
+--------------------------------|-----------------------------------------+
                                 | POST /api/adventures
                                 v
+--------------------------------------------------------------------------+
|                        BACKEND (Node.js & Express)                       |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |                  Validation & Safety Layer                       |   |
|   |    - Coordinate ranges (-90..90, -180..180)                      |   |
|   |    - Duration & tone whitelist                                   |   |
|   +------------------+------------------------------+----------------+   |
|                      |                              |                    |
|                      v                              v                    |
|          +-----------------------+      +-----------------------+        |
|          |    Overpass Client    |      |  Ollama Gemma Engine  |        |
|          |  (Bounded OSM Query)  |      |  (Structured JSON)    |        |
|          +-----------+-----------+      +-----------+-----------+        |
|                      |                              |                    |
|                      v                              v                    |
|          +-----------------------+      +-----------------------+        |
|          |   POI Sanitization    |      |    Schema Validator   |        |
|          |   & Category Whitelist|      |  & Template Fallback  |        |
|          +-----------+-----------+      +-----------+-----------+        |
|                      |                              |                    |
|                      +--------------+---------------+                    |
|                                     |                                    |
|                                     v                                    |
|                        Combined Mystery Adventure                        |
+--------------------------------------------------------------------------+
```

## Security & Privacy Model

1. **Local-First AI:** Inference runs on the user's machine through Ollama (`gemma3:4b` or `gemma3:1b`). No narrative prompts or player history are transmitted to commercial cloud AI vendors.
2. **Minimal Coordinate Exposure:** Coordinates are only sent to the local Express server and forwarded in a bounded bounding-box query to the public OpenStreetMap Overpass service. Coordinates are never logged to disk or stored in any persistent remote database.
3. **No Executable HTML:** Model output text is rendered strictly using `textContent` in the DOM to avoid prompt-injection-driven XSS.
4. **Deterministic Gatekeeping:** Even in the presence of hallucinated text, checkpoint arrival is verified exclusively by mathematical Haversine calculations against OSM coordinate pairs.
