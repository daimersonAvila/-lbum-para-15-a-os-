// Cliente mínimo de Upstash Redis (REST). Vercel crea estas variables solas
// al conectar "Upstash Redis" desde Storage / Marketplace.
const conf = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export const configurado = () => { const c = conf(); return !!(c.url && c.token); };

export async function cmd(...args) {
  const { url, token } = conf();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

export const LISTA = 'album:fotos';
