import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })
const resend = new Resend(process.env.RESEND_API_KEY as string)

async function kvSet(key: string, value: any) {
  await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  })
}
async function kvLpush(key: string, value: any) {
  await fetch(`${process.env.KV_REST_API_URL}/lpush/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  })
}

export default async function webhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method Not Allowed' }) }
  const sig = req.headers['stripe-signature']; if (!sig) return res.status(400).send('Missing signature')

  let event: Stripe.Event
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    event = stripe.webhooks.constructEvent(rawBody, sig as string, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch (err: any) { console.error('Webhook signature verification failed.', err.message); return res.status(400).send(`Webhook Error: ${err.message}`) }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const md = session.metadata || {} as any
      const id = session.id
      const record = {
        id,
        title: md.title,
        description: md.description,
        country: md.country,
        city: md.city,
        createdAt: Date.now(),
        tier: md.tier,
        currency: md.currency,
        clientEmail: md.clientEmail,
        payment_status: session.payment_status,
        amount_total: session.amount_total
      }
      await kvSet(`post:${id}`, record)
      await kvLpush('posts', id)

      const from = process.env.RESEND_FROM as string
      const admin = process.env.ADMIN_EMAIL as string
      const prettyAmount = session.amount_total ? (session.amount_total / 100).toFixed(2) : ''
      const html = (who: 'client' | 'admin') => `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
          <h2>i2U Payment Receipt</h2>
          <p>Thank you, your payment was successful.</p>
          <p><b>Post:</b> ${md.title || '(no title)'}</p>
          <p><b>Location:</b> ${md.country || ''} · ${md.city || ''}</p>
          <p><b>Tier:</b> ${md.tier} · <b>Currency:</b> ${md.currency}</p>
          <p><b>Amount:</b> ${prettyAmount} ${session.currency?.toUpperCase()}</p>
          <p><b>Session ID:</b> ${session.id}</p>
          ${who === 'admin' ? `<p><b>Client Email:</b> ${md.clientEmail}</p>` : ''}
          <hr/>
          <small>i2U · With Pleasure</small>
        </div>`

      if (md.clientEmail) await resend.emails.send({ from, to: md.clientEmail, subject: 'Your i2U receipt', html: html('client') })
      if (admin) await resend.emails.send({ from, to: admin, subject: 'New paid post (receipt)', html: html('admin') })
    }
    return res.json({ received: true })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Webhook handler failure' }) }
}

export const config = { api: { bodyParser: false } }
