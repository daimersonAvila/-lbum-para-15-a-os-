import { randomBytes, createHash } from 'node:crypto';
import { configurado, cmd, LISTA } from './_redis.js';

const CATEGORIAS = ['Caballo', 'Pastel', 'Quinceañera', 'Especiales', 'Otros'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { image, category } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key no configurada' });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('image', image);

    const timestamp = Date.now();
    const safeCategory = category ? String(category).replace(/[^a-zA-Z0-9]/g, '') : 'Foto';
    formData.append('name', `${safeCategory}_${timestamp}`);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!data.success) {
      return res.status(502).json(data);
    }

    // Registro público (sin delete_url, que permite borrar la foto en ImgBB)
    const d = data.data;
    const foto = {
      id: d.id,
      url: d.display_url || d.url,
      medio: (d.medium && d.medium.url) || d.display_url || d.url,
      mini: (d.thumb && d.thumb.url) || d.display_url || d.url,
      cat: CATEGORIAS.find((c) => c.normalize('NFC').toLowerCase() === String(category || '').normalize('NFC').trim().toLowerCase()) || 'Otros',
      ts: timestamp,
    };

    // Clave secreta para que quien subió la foto pueda borrarla: solo se guarda su huella
    const token = randomBytes(16).toString('hex');
    const registro = { ...foto, h: createHash('sha256').update(token).digest('hex') };

    // Guardamos en la base para la galería compartida
    let guardada = false;
    if (configurado()) {
      try {
        await cmd('LPUSH', LISTA, JSON.stringify(registro));
        await cmd('LTRIM', LISTA, 0, 1999);
        guardada = true;
      } catch (e) {
        console.error('No se pudo guardar en la base:', e);
      }
    }

    return res.status(200).json({ success: true, foto: { ...foto, token }, guardada });
  } catch (error) {
    console.error('Error de ImgBB:', error);
    return res.status(500).json({ error: 'Error interno al subir la imagen' });
  }
}
