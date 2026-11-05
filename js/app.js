const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const uploadBtn = document.getElementById('uploadBtn');
const btnGroup = document.getElementById('btnGroup');
const statusMsg = document.getElementById('statusMsg');
const menuCard = document.getElementById('menuCard');
const uploadCard = document.getElementById('uploadCard');
const tituloCategoria = document.getElementById('tituloCategoria');
const iconoCategoria = document.getElementById('iconoCategoria');

let base64Image = null;
let categoriaActual = "";
let subiendo = false; // 🔒 CANDADO para evitar subidas dobles

// 1. Seleccionar categoría
window.seleccionarCategoria = function(categoria) {
  categoriaActual = categoria;
  tituloCategoria.textContent = `Foto: ${categoria}`;

  if(categoria === 'Caballo') iconoCategoria.textContent = '🐎';
  else if(categoria === 'Pastel') iconoCategoria.textContent = '🎂';
  else if(categoria === 'Quinceañera') iconoCategoria.textContent = '👑';
  else if(categoria === 'Especiales') iconoCategoria.textContent = '✨';
  else iconoCategoria.textContent = '📸';

  menuCard.style.display = 'none';
  uploadCard.style.display = 'flex';
}

// 2. Volver al menú principal
window.volverAlMenu = function() {
  resetFormulario();
  uploadCard.style.display = 'none';
  menuCard.style.display = 'flex';
}

// 3. Procesar imagen
function procesarImagen(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    mostrarEstado('Por favor, selecciona una imagen válida.', 'error');
    return;
  }

  // Deshabilitar temporalmente para evitar doble procesamiento
  fileInput.disabled = true;
  cameraInput.disabled = true;

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      base64Image = dataUrl.split(',')[1];

      imagePreview.src = dataUrl;
      previewContainer.style.display = 'block';

      // Ocultamos los botones de selección para que no pueda elegir otra
      btnGroup.style.display = 'none';
      uploadBtn.style.display = 'flex';

      // Volvemos a habilitar los inputs por si se arrepiente y da a "Volver"
      fileInput.disabled = false;
      cameraInput.disabled = false;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => {
  procesarImagen(e.target.files[0]);
  e.target.value = ''; // Limpiamos el input inmediatamente
});

cameraInput.addEventListener('change', (e) => {
  procesarImagen(e.target.files[0]);
  e.target.value = ''; // Limpiamos el input inmediatamente
});

// 4. Subir a la API (Con candado de seguridad)
uploadBtn.addEventListener('click', async function() {
  // 🔒 Si ya está subiendo, ignoramos el clic
  if (subiendo) return;

  if (!base64Image) {
    mostrarEstado('Por favor, selecciona una foto primero.', 'error');
    return;
  }

  // 🔒 Activamos el candado
  subiendo = true;
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>⏳</span> Subiendo...';
  ocultarEstado();

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        category: categoriaActual
      })
    });

    const data = await response.json();

    if (data.success) {
      mostrarEstado('¡Foto subida con éxito! Gracias.', 'success');
      // Esperamos 2.5 segundos para que lean el mensaje y volvemos
      setTimeout(() => {
        subiendo = false; // 🔓 Liberamos el candado
        volverAlMenu();
      }, 2500);
    } else {
      mostrarEstado('Error al subir: ' + (data.error?.message || 'Intenta de nuevo.'), 'error');
      resetBoton();
      subiendo = false; // 🔓 Liberamos el candado si falla
    }
  } catch (error) {
    mostrarEstado('Error de conexión. Revisa tu internet.', 'error');
    resetBoton();
    subiendo = false; // 🔓 Liberamos el candado si falla
  }
});

// Funciones auxiliares
function mostrarEstado(mensaje, tipo) {
  statusMsg.textContent = mensaje;
  statusMsg.className = `status-msg status-${tipo}`;
  statusMsg.style.display = 'block';
}

function ocultarEstado() { statusMsg.style.display = 'none'; }

function resetBoton() {
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '<span>☁️</span> Subir Foto';
}

function resetFormulario() {
  fileInput.value = '';
  cameraInput.value = '';
  base64Image = null;
  categoriaActual = "";
  subiendo = false; // 🔓 Nos aseguramos de liberar el candado
  previewContainer.style.display = 'none';
  uploadBtn.style.display = 'none';
  btnGroup.style.display = 'flex';
  resetBoton();
  ocultarEstado();
}
