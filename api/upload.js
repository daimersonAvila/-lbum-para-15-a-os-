export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Recibimos la imagen y la categoría
  const { image, category } = req.body;

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

    // Creamos un nombre único usando la categoría y la fecha
    const timestamp = new Date().getTime();
    const safeCategory = category ? category.replace(/[^a-zA-Z0-9]/g, '') : 'Foto';
    const fileName = `${safeCategory}_${timestamp}`;

    // ImgBB permite enviar un nombre al archivo
    formData.append('name', fileName);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error de ImgBB:', error);
    return res.status(500).json({ error: 'Error interno al subir la imagen' });
  }
}
