# FIELDCRAFT — Privacy and Safety Policy

## 1. Safety Principles

FIELDCRAFT is designed to encourage outdoor physical exploration while strictly prioritizing the physical safety of players.

### Outdoor Safety Rules Enforced in Design
1. **Screen-Off / Low-Distraction Priority:** Clues are delivered via audio and simple text cards so the player can keep their head up and eyes on the environment.
2. **Public Landmarks Only:** The POI filter rigorously excludes private residences, industrial complexes, train tracks, schools/kindergartens, highways, and unmapped construction sites.
3. **No Trespassing or Stranger Contact:** Model prompt guardrails strictly prohibit stories from instructing players to enter private property, climb fences, cross roadways unsafely, or interact with strangers.
4. **Non-Competitive Pacing:** There are no speed-based points or penalties. Players can pause or end the walk at any time.

## 2. Privacy Policy

### What Data We Collect
- **None.** FIELDCRAFT requires no account, email, username, or login.

### Geographic Data Handling
- **Local GPS:** Handled in browser memory via HTML5 Geolocation API.
- **Overpass Query:** When creating a live adventure, your coarse coordinates are sent to an OpenStreetMap Overpass server to retrieve nearby public landmarks.
- **Zero Coordinate Persistence:** Server logs do not contain raw coordinate values. No location traces are stored in any database.
- **Local Journal:** Completed field notes and reflections are saved entirely in your browser's `localStorage` and never sent to a remote server.
