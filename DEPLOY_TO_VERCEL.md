
# 🚀 Deploying ForensicFlow to Vercel

Since your backend runs locally with a dynamic **Gradio Tunnel URL** (which changes every time you restart), follow these steps to deploy the frontend to Vercel while keeping it connected.

## 1. Push to GitHub
Ensure all your latest changes (including the new `App.jsx` with dynamic URL support) are pushed to GitHub.

## 2. Deploy on Vercel
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **Project**.
3.  Import your GitHub repository (`39. UnMask` or whatever it's named).
4.  **Framework Preset**: Select **Vite**.
5.  **Root Directory**: Click "Edit" and select `frontend`.
6.  **Build Command**: `npm run build` (default).
7.  **Environment Variables**:
    *   Add `VITE_API_URL` -> Set it to `http://localhost:8000` (or leave it blank). It acts as a fallback.
8.  Click **Deploy**.

## 3. Connect to Local Backend (Runtime)
Once the site is live (e.g., `https://unmask-frontend.vercel.app`), it won't connect initially because your backend is on your laptop.

1.  **Run Backend Locally**:
    ```bash
    cd backend
    python gradio_tunnel.py
    ```
    *Wait for the "Public Tunneled URL" to appear (e.g., `https://02fa4...gradio.live`).*

2.  **Update Live Website**:
    *   Open your Vercel website.
    *   Scroll to the **Footer**.
    *   Click on **"⚙️ Server: localhost"** (or whatever shows there).
    *   **Paste the new Gradio URL** into the input box and press Enter.
    *   The site will now use this tunnel to talk to your local backend!

## 🏁 Summary
- **No need to redeploy Vercel** when the tunnel functionality changes.
- Just paste the new link in the footer whenever you restart the backend.
