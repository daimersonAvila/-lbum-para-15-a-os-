// Evita que el script se ejecute dos veces (index.html + webpack lo cargan ambos)
(function () {
if (window.__albumIniciado) return;
window.__albumIniciado = true;

const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');
const cameraInput = $('cameraInput');
const previewContainer = $('previewContainer');
const uploadBtn = $('uploadBtn');
const btnGroup = $('btnGroup');
const statusMsg = $('statusMsg');
const menuCard = $('menuCard');
const uploadCard = $('uploadCard');
const tituloCategoria = $('tituloCategoria');
const iconoCategoria = $('iconoCategoria');

const MAX_FOTOS = 20;   // por tanda
const LADO = 1280;      // lado mayor en píxeles
const CALIDAD = 0.82;
const PARALELO = 2;     // subidas al mismo tiempo

const ICONOS = { Caballo: '🐎', Pastel: '🎂', 'Quinceañera': '👑', Especiales: '✨' };
let cola = [];          // [{ dataUrl, base64 }]
let categoriaActual = '';
let subiendo = false;   // 🔒 candado contra subidas dobles
let preparando = false;

// 1. Seleccionar categoría
window.seleccionarCategoria = function (categoria) {
  categoriaActual = categoria;
  tituloCategoria.textContent = `Foto: ${categoria}`;
  iconoCategoria.textContent = ICONOS[categoria] || '📸';
  menuCard.style.display = 'none';
  uploadCard.style.display = 'flex';
};

// 2. Volver al menú principal
window.volverAlMenu = function () {
  if (subiendo) return;
  resetFormulario();
  uploadCard.style.display = 'none';
  menuCard.style.display = 'flex';
};

// 3. Preparar imágenes (redimensionar en el celular)
async function comprimir(file) {
  let fuente, w, h;
  try {
    fuente = await createImageBitmap(file, { imageOrientation: 'from-image' });
    w = fuente.width; h = fuente.height;
  } catch (e) {
    fuente = await new Promise((ok, no) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = no;
      img.src = url;
    });
    w = fuente.naturalWidth; h = fuente.naturalHeight;
  }
  const k = Math.min(1, LADO / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  canvas.getContext('2d').drawImage(fuente, 0, 0, canvas.width, canvas.height);
  if (fuente.close) fuente.close();
  const dataUrl = canvas.toDataURL('image/jpeg', CALIDAD);
  return { dataUrl, base64: dataUrl.split(',')[1] };
}

async function procesarArchivos(files, auto) {
  if (preparando || subiendo) return;
  const lista = [...files].filter((f) => f.type.startsWith('image/'));
  if (!lista.length) { mostrarEstado('Por favor, selecciona una imagen válida.', 'error'); return; }
  preparando = true;
  fileInput.disabled = cameraInput.disabled = true;
  ocultarEstado();
  if (lista.length > MAX_FOTOS) mostrarEstado(`Máximo ${MAX_FOTOS} fotos por vez. Se tomaron las primeras ${MAX_FOTOS}.`, 'error');
  for (const f of lista.slice(0, MAX_FOTOS)) {
    try { cola.push(await comprimir(f)); } catch (e) { /* foto ilegible: se omite */ }
  }
  preparando = false;
  fileInput.disabled = cameraInput.disabled = false;
  if (!cola.length) { mostrarEstado('No se pudo leer la foto. Intenta con otra.', 'error'); return; }
  pintarCola();
  if (auto) subirTodo(true); // cámara: se guarda sola, sin tocar más botones
}

function pintarCola() {
  previewContainer.innerHTML = '';
  previewContainer.className = 'preview-container multi';
  previewContainer.style.display = 'grid';
  cola.forEach((it) => {
    const img = new Image(); img.src = it.dataUrl; img.alt = 'Vista previa';
    previewContainer.appendChild(img);
  });
  btnGroup.style.display = 'none';
  uploadBtn.style.display = 'flex';
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = `<span>☁️</span> Subir ${cola.length === 1 ? 'Foto' : cola.length + ' Fotos'}`;
}

fileInput.addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; procesarArchivos(f, false); });
cameraInput.addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; procesarArchivos(f, true); });

// 4. Subir (varias a la vez, con candado)
async function subirUna(it) {
  try {
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: it.base64, category: categoriaActual }),
    });
    const data = await r.json();
    if (data.success) { guardarMia(data.foto); return true; }
  } catch (e) { /* se reintenta con el botón */ }
  return false;
}

async function subirTodo(desdeCamara) {
  if (subiendo || !cola.length) return;
  subiendo = true;
  uploadBtn.disabled = true;
  ocultarEstado();
  const total = cola.length;
  let hechas = 0, i = 0;
  const fallidas = [];
  const progreso = () => { uploadBtn.innerHTML = `<span>⏳</span> Subiendo ${Math.min(hechas + 1, total)} de ${total}...`; };
  progreso();
  const obrero = async () => {
    while (i < total) {
      const it = cola[i++];
      if (await subirUna(it)) hechas++; else fallidas.push(it);
      progreso();
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALELO, total) }, obrero));
  subiendo = false;

  if (fallidas.length) {
    cola = fallidas;
    pintarCola();
    mostrarEstado(`${hechas ? hechas + ' subida(s). ' : ''}${fallidas.length} no se pudo subir. Revisa tu internet y toca Subir de nuevo.`, 'error');
    return;
  }
  const msg = total === 1 ? '¡Foto subida con éxito! Gracias.' : `¡${total} fotos subidas con éxito! Gracias.`;
  if (desdeCamara) {
    // Cámara: queda lista para tomar otra enseguida
    limpiarCola();
    mostrarEstado(msg, 'success');
    setTimeout(ocultarEstado, 2500);
  } else {
    mostrarEstado(msg, 'success');
    setTimeout(volverAlMenu, 2500);
  }
}

uploadBtn.addEventListener('click', () => subirTodo(false));

// Funciones auxiliares
function mostrarEstado(mensaje, tipo) {
  statusMsg.textContent = mensaje;
  statusMsg.className = `status-msg status-${tipo}`;
  statusMsg.style.display = 'block';
}
function ocultarEstado() { statusMsg.style.display = 'none'; }

function limpiarCola() {
  cola = [];
  previewContainer.innerHTML = '';
  previewContainer.style.display = 'none';
  uploadBtn.style.display = 'none';
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '<span>☁️</span> Subir Foto';
  btnGroup.style.display = 'flex';
}

function resetFormulario() {
  fileInput.value = '';
  cameraInput.value = '';
  categoriaActual = '';
  subiendo = false;
  preparando = false;
  limpiarCola();
  ocultarEstado();
}

// Guarda en este celular las fotos que subió la persona ("Mis fotos")
function guardarMia(foto) {
  if (!foto) return;
  try {
    const mias = JSON.parse(localStorage.getItem('misFotos') || '[]');
    mias.unshift(foto);
    localStorage.setItem('misFotos', JSON.stringify(mias.slice(0, 300)));
  } catch (e) { /* sin almacenamiento: no pasa nada */ }
}
})();
