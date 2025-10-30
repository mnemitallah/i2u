
# i2U — With Pleasure

A 100% client-only web app prototype for i2U:
- Role dashboards (Client, Service Provider, Advertiser)
- Announcements + Ads (ads rotate every 13 hours; expire after 5 days)
- Analytics charts (Recharts) + PDF/CSV export
- Email reports via EmailJS
- Contact/Complaints form with spam protection (honeypot + 10s cooldown)
- Notification banner for UX feedback (success/warn/error)

## Stack
- Vite + React + TypeScript
- Tailwind (utility classes included)
- Minimal shadcn-like UI components (no extra setup)
- Recharts, jsPDF, EmailJS

## EmailJS Setup
The app is pre-configured with your credentials in the code.
If you need to change them, search for these in `src/App.tsx`:
- `i2u_5x50s9o` (Service ID)
- `i2u_5ws8our` (Template ID)
- `ZOixa_otkIeM7vgIB` (Public Key)

Your EmailJS template should accept:
- `to_email`, `subject`, `message`
- `csv_content` (string)
- `pdf_data_url` (data URI; optional)

## Develop
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy
- **Vercel:** `vercel` → Framework: Vite → Build: `npm run build` → Output: `dist`
- **Netlify:** `netlify deploy --prod` → Build: `npm run build` → Publish: `dist`

## Legal Pages
This build includes a **Terms & Privacy** modal (client-only). You can open it from the footer link.
To customize its content, edit the `legalContent` string in `src/App.tsx`.
