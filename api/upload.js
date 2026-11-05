// api/upload.js
export default async function handler(req, res) {
  // 1. Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 2. Recibir la imagen Base64 del frontend
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  // 3. Obtener la API Key desde las variables de entorno de Vercel (¡Seguro!)
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key no configurada en el servidor' });
  }

  try {
    // 4. Preparar los datos para ImgBB
    const formData = new URLSearchParams();
    formData.append('image', image);

    // 5. Hacer la petición a ImgBB desde el servidor
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    // 6. Devolver la respuesta al frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error de ImgBB:', error);
    return res.status(500).json({ error: 'Error interno al subir la imagen' });
  }
}
