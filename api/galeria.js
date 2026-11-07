import { configurado, cmd, LISTA } from './_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=20');
  if (!configurado()) return res.status(200).json({ configurado: false, fotos: [] });
  try {
    const filas = await cmd('LRANGE', LISTA, 0, 499);
    const fotos = (filas || []).map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter(Boolean);
    return res.status(200).json({ configurado: true, fotos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo leer la galería' });
  }
}
