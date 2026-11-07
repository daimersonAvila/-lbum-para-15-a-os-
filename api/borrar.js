import { timingSafeEqual, createHash } from 'node:crypto';
import { configurado, cmd, LISTA } from './_redis.js';

const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

// Quita una foto de la galería.
// - Moderador: { id, clave } con ADMIN_KEY.
// - Dueño de la foto: { id, token } (la clave que su celular recibió al subirla).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!configurado()) return res.status(500).json({ error: 'No configurado' });
  const { id, clave, token } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta la foto' });
  try {
    const filas = await cmd('LRANGE', LISTA, 0, 1999);
    const fila = (filas || []).find((f) => { try { return JSON.parse(f).id === id; } catch { return false; } });
    if (!fila) return res.status(200).json({ ok: true }); // ya no estaba
    const admin = process.env.ADMIN_KEY;
    const esAdmin = !!(admin && clave && igual(clave, admin));
    const esDueno = !!(token && igual(createHash('sha256').update(String(token)).digest('hex'), JSON.parse(fila).h || ''));
    if (!esAdmin && !esDueno) return res.status(401).json({ error: 'No tienes permiso para borrar esta foto' });
    await cmd('LREM', LISTA, 0, fila);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Error al borrar' });
  }
}
