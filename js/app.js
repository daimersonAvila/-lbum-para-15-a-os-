const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const uploadBtn = document.getElementById('uploadBtn');
const btnGroup = document.getElementById('btnGroup');
const statusMsg = document.getElementById('statusMsg');

let base64Image = null;

// Función para procesar la imagen (Reducir tamaño para web, mantener calidad)
function procesarImagen(file) {
  if (!file.type.startsWith('image/')) {
    mostrarEstado('Por favor, selecciona una imagen válida.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Creamos un canvas para redimensionar
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200; // Ancho máximo (buena calidad pero no pesa 10MB)
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      // Calcular nuevas dimensiones manteniendo la proporción
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a Base64 (calidad 0.8 = 80%, excelente balance)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Guardamos el base64 limpio para enviarlo a la API
      base64Image = dataUrl.split(',')[1];

      // Mostramos la vista previa
      imagePreview.src = dataUrl;
      previewContainer.style.display = 'block';

      // Ocultar botones de selección y mostrar el de subir
      btnGroup.style.display = 'none';
      uploadBtn.style.display = 'flex';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Escuchar ambos inputs (Galería y Cámara)
fileInput.addEventListener('change', (e) => procesarImagen(e.target.files[0]));
cameraInput.addEventListener('change', (e) => procesarImagen(e.target.files[0]));

// Subir a la API
uploadBtn.addEventListener('click', async function() {
  if (!base64Image) {
    mostrarEstado('Por favor, selecciona una foto primero.', 'error');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>⏳</span> Subiendo...';
  ocultarEstado();

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });

    const data = await response.json();

    if (data.success) {
      mostrarEstado('¡Foto subida con éxito! Gracias por compartir.', 'success');
      setTimeout(() => resetFormulario(), 3000);
    } else {
      mostrarEstado('Error al subir: ' + (data.error?.message || 'Intenta de nuevo.'), 'error');
      resetBoton();
    }
  } catch (error) {
    mostrarEstado('Error de conexión. Revisa tu internet.', 'error');
    resetBoton();
  }
});

// Funciones auxiliares
function mostrarEstado(mensaje, tipo) {
  statusMsg.textContent = mensaje;
  statusMsg.className = `status-msg status-${tipo}`;
  statusMsg.style.display = 'block';
}

function ocultarEstado() {
  statusMsg.style.display = 'none';
}

function resetBoton() {
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '<span>☁️</span> Subir al Álbum';
}

function resetFormulario() {
  fileInput.value = '';
  cameraInput.value = '';
  base64Image = null;
  previewContainer.style.display = 'none';
  uploadBtn.style.display = 'none';
  btnGroup.style.display = 'flex'; // Volver a mostrar los botones
  resetBoton();
}
