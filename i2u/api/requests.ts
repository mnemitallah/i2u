import type { VercelRequest, VercelResponse } from '@vercel/node'

async function kvGet<T>(key: string): Promise<T | null> {
  const r = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } })
  if (!r.ok) return null
  const j = await r.json()
  return j?.result ?? null
}
async function kvLrange<T>(key: string, start = 0, stop = 49): Promise<T[]> {
  const r = await fetch(`${process.env.KV_REST_API_URL}/lrange/${encodeURIComponent(key)}/${start}/${stop}`, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } })
  if (!r.ok) return []
  const j = await r.json()
  return (j?.result || []) as T[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method Not Allowed' }) }
  const qCountry = ((req.query.country || '') as string).toLowerCase()
  const qCity = ((req.query.city || '') as string).toLowerCase()

  try {
    const ids = await kvLrange<string>('posts', 0, 199)
    const items = await Promise.all(ids.map(async (id) => (await kvGet<any>(`post:${id}`))))
    const verified = items.filter(Boolean).filter((p: any) => p.payment_status === 'paid')
    const filtered = verified.filter((p: any) =>
      (!qCountry || (p.country || '').toLowerCase().includes(qCountry)) &&
      (!qCity || (p.city || '').toLowerCase().includes(qCity))
    )
    return res.status(200).json({ results: filtered })
  } catch (e: any) { console.error(e); return res.status(500).json({ error: e.message || 'Failed to load' }) }
}
