import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method Not Allowed' }) }
  const id = (req.query.session_id || '').toString()
  if (!id) return res.status(400).json({ error: 'Missing session_id' })
  try {
    const session = await stripe.checkout.sessions.retrieve(id)
    const paid = session.payment_status === 'paid'
    return res.status(200).json({ paid, metadata: session.metadata || {} })
  } catch (e: any) {
    console.error(e); return res.status(500).json({ error: e.message || 'Unable to verify' })
  }
}
