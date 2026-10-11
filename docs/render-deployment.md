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
6. (Optional for Cloud AI) Add your free **Groq** or **Gemini** API key in the Environment Variables tab (see Section 3 below).

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

## 🤖 Activating Cloud AI (Since Ollama is Local-Only)

Render free instances run in a cloud container with 512MB RAM without GPU, meaning you cannot run a local Ollama daemon on Render directly.

FIELDCRAFT has built-in native support for **Cloud Gemma** and **Google Gemini**!

### Recommended: Free Cloud Gemma via Groq (Takes 30 seconds)
1. Go to [https://console.groq.com](https://console.groq.com) and create a free account (no credit card needed).
2. Click **API Keys** &rarr; **Create API Key**. Copy your key (`gsk_...`).
3. In your Render Dashboard &rarr; Go to your `fieldcraft` service &rarr; Click **Environment**.
4. Add environment variable:
   - **Key:** `GROQ_API_KEY`
   - **Value:** `gsk_your_groq_api_key`
5. Click **Save Changes**.
6. Render will automatically redeploy. FIELDCRAFT will now run Google's **`gemma2-9b-it`** model in the cloud at 500+ tokens/second!

### Alternative: Google Gemini API
1. Get a free API key at [https://aistudio.google.com](https://aistudio.google.com).
2. Add environment variable in Render:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `AIza_your_gemini_key`
3. Click **Save Changes**.

---

## 📍 Environment Variables Summary

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production error handling |
| `PORT` | `10000` | Render assigns this automatically |
| `GROQ_API_KEY` | `gsk_...` | *(Recommended)* Powers cloud Gemma 2 AI |
| `GEMINI_API_KEY` | `AIza...` | *(Alternative)* Powers Google Gemini Flash AI |

> **Note:** If no cloud AI key is set and Ollama is not available, FIELDCRAFT automatically uses its built-in deterministic story engine. The platform **never crashes** and will always provide a complete, working mystery walk!

---

## 📱 Testing Live on Your Phone

1. Open your Render URL (e.g. `https://fieldcraft.onrender.com`) on your mobile browser.
2. Choose a walk duration (10, 20, 30 min) and an investigative tone.
3. Choose **Current GPS** (tap Allow when prompted for location) OR use **Search City / Landmark** (e.g. Central Park, Lodhi Garden, Hyde Park).
4. Tap **Create My Mystery** &rarr; put your headphones on &rarr; **Touch Grass!** 🌿
