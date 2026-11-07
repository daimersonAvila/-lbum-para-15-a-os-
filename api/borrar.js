import { timingSafeEqual } from 'node:crypto';
import { configurado, cmd, LISTA } from './_redis.js';

// Moderación: quita una foto de la galería (solo con ADMIN_KEY). Uso: galeria.html?admin=TU_CLAVE
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { id, clave } = req.body || {};
  const admin = process.env.ADMIN_KEY;
  if (!admin || !configurado()) return res.status(500).json({ error: 'No configurado' });
  const a = Buffer.from(String(clave || '')), b = Buffer.from(admin);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: 'Clave incorrecta' });
  try {
    const filas = await cmd('LRANGE', LISTA, 0, 1999);
    const fila = (filas || []).find((f) => { try { return JSON.parse(f).id === id; } catch { return false; } });
    if (fila) await cmd('LREM', LISTA, 0, fila);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Error al borrar' });
  }
}
