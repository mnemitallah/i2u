# i2u: Enabling advertiser media uploads and client posts (Vercel + GitHub)

This update adds:
- **Media uploads** (images, GIFs, MP4/WebM) via Cloudinary using a Vercel serverless function `/api/upload`.
- **Persistent Ads & Posts** stored in **Vercel KV** via `/api/ads` and `/api/posts` endpoints.
- Frontend wiring so the **Advertiser** can upload media and post ads, and **Clients** can add posts reliably (no more flashing button with no effect).

## 1) Prereqs

- A Vercel project connected to this GitHub repository.
- A free **Cloudinary** account.
- **Vercel KV** (Upstash Redis) enabled for the project.

## 2) Environment variables

Create the following Environment Variables on Vercel (Project → Settings → Environment Variables):

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

> Tip: commit `.env.example` but **never** commit a real `.env` with secrets.

## 3) Local dev

```bash
npm i
npm run dev
```

To test uploads locally, also set the same env vars in your local `.env` and run with `vercel dev` or use a proxy to the deployed functions.

## 4) Deployment (GitHub → Vercel)

1. Commit and push these changes to your GitHub repo (`mnemitallah/i2u`).
2. In Vercel, make sure the project is connected to that repo and **automatic deployments** are on.
3. After adding the env vars and enabling Vercel KV, trigger a redeploy.

## 5) How it works

- `api/upload.ts` receives `multipart/form-data`, streams to Cloudinary and returns the public URL.
- `api/ads.ts` and `api/posts.ts` store JSON documents in Vercel KV, ordered by creation time (5‑day expiry logic still enforced on reads for ads).
- The React app now calls these endpoints instead of `localStorage` only.

## 6) Notes

- If you already had data in `localStorage`, the app still attempts to read it as a fallback on first load.
- Max sizes validated client‑side: images ≤2MB, GIF/Video ≤10MB. Cloudinary also enforces server‑side limits.
- You can adjust limits or add moderation later.
