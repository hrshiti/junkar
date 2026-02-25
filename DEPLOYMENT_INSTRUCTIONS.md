# Deployment Instructions

To resolve the CORS issues and ensure your frontend and backend communicate correctly, please follow these steps to update your environment variables on Vercel and Render.

## 1. Backend (Render)

Go to your Render dashboard for the `junkar` backend service, navigate to **Environment**, and add/update the following variable:

- **Key:** `FRONTEND_URL`
- **Value:** `https://junkar.vercel.app,http://localhost:5173`

*Note: This ensures that requests from your Vercel deployment are allowed by the backend's CORS policy.*

## 2. Frontend (Vercel)

Go to your Vercel dashboard for the `junkar` frontend project, navigate to **Settings > Environment Variables**, and add/update the following variable:

- **Key:** `VITE_API_BASE_URL`
- **Value:** `https://junkar.onrender.com/api`

*Note: This ensures your frontend code points to the correct backend URL instead of localhost.*

## 3. Redeploy

After updating the environment variables:
1. **Redeploy the Backend** on Render to apply the `FRONTEND_URL` change.
2. **Redeploy the Frontend** on Vercel to apply the `VITE_API_BASE_URL` change (a new build is required to bake in the env var).

## Summary of Code Changes Made

I have also updated the local configuration files to match these settings for consistency:

1.  **`frontend/.env`**: Updated `VITE_API_BASE_URL` to `https://junkar.onrender.com/api`.
2.  **`backend/.env`**: Updated `FRONTEND_URL` to include `https://junkar.vercel.app`.
3.  **`frontend/vite.config.js`**: Updated Content Security Policy (CSP) to allow connections to `junkar.onrender.com`.

You can now test the deployment links.
