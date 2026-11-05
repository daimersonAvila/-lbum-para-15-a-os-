// js/app.js
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const uploadBtn = document.getElementById('uploadBtn');
const selectBtn = document.getElementById('selectBtn');
const statusMsg = document.getElementById('statusMsg');

let base64Image = null; // Guardaremos la imagen aquí

fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    mostrarEstado('Por favor, selecciona una imagen válida.', 'error');
    return;
  }

  // Convertir a Base64 para enviarlo fácilmente a nuestra API
  const reader = new FileReader();
  reader.onload = function(event) {
    base64Image = event.target.result.split(',')[1]; // Quitamos el encabezado "data:image/jpeg;base64,"

    imagePreview.src = event.target.result;
    previewContainer.style.display = 'block';
    uploadBtn.style.display = 'flex';
    selectBtn.innerHTML = '<span>🔄</span> Cambiar Foto';
    ocultarEstado();
  };
  reader.readAsDataURL(file);
});

uploadBtn.addEventListener('click', async function() {
  if (!base64Image) {
    mostrarEstado('Por favor, selecciona una foto primero.', 'error');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>⏳</span> Subiendo...';
  ocultarEstado();

  try {
    // LLAMAMOS A NUESTRA PROPIA API EN VERCEL (No a ImgBB directo)
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: base64Image }) // Enviamos la imagen en JSON
    });

    const data = await response.json();

    if (data.success) {
      mostrarEstado('¡Foto subida con éxito! Gracias por compartir.', 'success');
      setTimeout(() => {
        resetFormulario();
      }, 3000);
    } else {
      mostrarEstado('Error al subir: ' + (data.error?.message || 'Intenta de nuevo.'), 'error');
      resetBoton();
    }

  } catch (error) {
    console.error('Error de red:', error);
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
  base64Image = null;
  previewContainer.style.display = 'none';
  uploadBtn.style.display = 'none';
  selectBtn.innerHTML = '<span>📁</span> Seleccionar Foto';
  resetBoton();
}
