# Deploying FIELDCRAFT to Render 🚀

This guide walks you through deploying **FIELDCRAFT** to [Render](https://render.com) for free in under 3 minutes.

---

## 🌟 Why Render?
- **Free Web Service Tier:** Hosts Node.js Express full-stack apps with zero cost.
- **Automatic SSL (HTTPS):** Modern mobile browsers (iOS Safari, Android Chrome) strictly require HTTPS for the HTML5 Geolocation API. Render provides free automatic HTTPS, making your outdoor GPS walks work seamlessly on phones!
- **Auto-Deploy on Push:** Every `git push` to your GitHub repository automatically triggers a deployment.

---

## ⚡ Option 1: One-Click Deploy via Render Blueprint (Fastest)

1. Sign up or log into [Render](https://dashboard.render.com).
2. Go to **Blueprints** &rarr; click **New Blueprint Instance**.
3. Select your GitHub repository: `farhan4783/Fieldcraft`.
4. Render will detect [`render.yaml`](../render.yaml) automatically:
   - **Service Name:** `fieldcraft`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Apply**.
6. (Recommended for Hosted Open-Weight AI) Add your free **OpenRouter** API key (`sk-or-...`) in the Environment Variables tab to run open-weight **Gemma 3** (`google/gemma-3-4b-it:free`) in the cloud.

---

## 🛠️ Option 2: Manual Web Service Setup

If you prefer configuring manually in the Render dashboard:

1. Click **New +** &rarr; select **Web Service**.
2. Connect your GitHub repository: `farhan4783/Fieldcraft`.
3. Fill in the service details:
   - **Name:** `fieldcraft` (or your choice)
   - **Region:** Any (e.g. *Oregon* or *Frankfurt*)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
4. Click **Create Web Service**.

---

## 🤖 Open-Source AI in Cloud Hosting (Render)

Render free instances run in a container with 512MB RAM without GPU, meaning you cannot run a local 4GB Ollama weights file directly on Render.

For the **Hacktoberfest Open-Source AI Challenge**, FIELDCRAFT provides two compliant deployment paths:

### 1. Free Remote Open-Weight Gemma 3 via OpenRouter (Recommended)
You can run Google's newest open-weight **Gemma 3 4B** (`google/gemma-3-4b-it:free`) via OpenRouter:
1. Go to [https://openrouter.ai](https://openrouter.ai) and sign up.
2. Go to **Keys** &rarr; click **Create Key** &rarr; copy your key (`sk-or-...`).
3. In your Render Dashboard &rarr; Go to your `fieldcraft` service &rarr; Click **Environment**.
4. Add environment variables:
   - **Key:** `OPENROUTER_API_KEY`
   - **Value:** `sk-or-your_openrouter_api_key`
   - **Key:** `OPENROUTER_MODEL` *(optional, defaults to this)*
   - **Value:** `google/gemma-3-4b-it:free`
5. Click **Save Changes**.
6. Render will redeploy automatically. FIELDCRAFT will now generate stories using open-weight **Gemma 3 4B**!

*(Note: Groq deprecated and retired its older `gemma2-9b-it` model. FIELDCRAFT automatically protects against stale `GROQ_API_KEY` values by prioritizing OpenRouter Gemma 3 and catching retired-model errors gracefully).*

### 2. Built-in Deterministic Narrative Engine (Zero-Config Failsafe)
If you deploy without any API keys, FIELDCRAFT automatically runs its procedural **Deterministic Narrative Engine**. It builds custom mysteries from OpenStreetMap landmarks with 0 API calls, 0 RAM overhead, and 100% uptime—allowing judges and reviewers to test the entire game loop seamlessly!

---

## 📍 Environment Variables Summary

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production error handling |
| `PORT` | `10000` | Render assigns this automatically |
| `OPENROUTER_API_KEY` | `sk-or-...` | *(Recommended)* Runs open-weight Gemma 3 4B (`google/gemma-3-4b-it:free`) |
| `OPENROUTER_MODEL` | `google/gemma-3-4b-it:free` | Model identifier on OpenRouter |
| `GROQ_API_KEY` | `gsk_...` | *(Legacy / Secondary)* Groq runner |

> **Note:** FIELDCRAFT adheres strictly to open-weight models (Google Gemma). Proprietary closed APIs are excluded.

---

## 📱 Testing Live on Your Phone

1. Open your Render URL (e.g. `https://fieldcraft.onrender.com`) on your mobile browser.
2. Choose a walk duration (10, 20, 30 min) and an investigative tone.
3. Choose **Current GPS** (tap Allow when prompted for location) OR use **Search City / Landmark** (e.g. Central Park, Lodhi Garden, Hyde Park).
4. Tap **Create My Mystery** &rarr; put your headphones on &rarr; **Touch Grass!** 🌿
