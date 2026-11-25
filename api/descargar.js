// Descarga una foto del álbum como archivo (Content-Disposition: attachment).
// Solo acepta imágenes alojadas en ImgBB, para que no se pueda usar como proxy abierto.
const HOSTS = ['i.ibb.co', 'ibb.co', 'i.ibb.co.com', 'ibb.co.com'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  let u;
  try { u = new URL(String(req.query.url || '')); } catch { return res.status(400).json({ error: 'Enlace no válido' }); }
  if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname)) return res.status(400).json({ error: 'Origen no permitido' });
  try {
    const r = await fetch(u.toString());
    if (!r.ok) return res.status(502).json({ error: 'No se pudo obtener la foto' });
    const tipo = r.headers.get('content-type') || 'image/jpeg';
    if (!tipo.startsWith('image/')) return res.status(400).json({ error: 'No es una imagen' });
    const nombre = String(req.query.name || 'foto').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'foto';
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: 'Error al descargar' });
  }
}
