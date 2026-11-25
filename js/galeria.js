const $ = (id) => document.getElementById(id);
const admin = new URLSearchParams(location.search).get('admin');
let todas = [], configurado = true, vista = 'todas', cat = '';

const mias = () => { try { return JSON.parse(localStorage.getItem('misFotos') || '[]'); } catch { return []; } };

async function cargar() {
  try {
    const r = await fetch('/api/galeria');
    const j = await r.json();
    configurado = j.configurado !== false;
    todas = j.fotos || [];
  } catch (e) { /* sin conexión: se muestran las propias */ }
  pintar();
}

function pintar() {
  let lista = vista === 'mias' ? mias() : todas;
  if (cat) lista = lista.filter((f) => f.cat === cat);
  $('aviso').innerHTML = !configurado && vista === 'todas'
    ? '<p class="gal-aviso">El álbum compartido aún no está activado. Mientras tanto puedes ver tus fotos en “Mis fotos”.</p>' : '';
  $('cuenta').textContent = lista.length ? `${lista.length} foto${lista.length === 1 ? '' : 's'}` : '';
  $('vacio').style.display = lista.length ? 'none' : 'block';
  $('vacio').textContent = vista === 'mias' ? 'Aún no has subido fotos desde este celular.' : 'Todavía no hay fotos aquí. ¡Sé el primero en subir una!';
  const g = $('grid'); g.innerHTML = '';
  lista.forEach((f) => {
    const fig = document.createElement('figure');
    const img = new Image(); img.loading = 'lazy'; img.alt = 'Foto de la fiesta'; img.src = f.medio || f.url;
    fig.append(img);
    const cap = document.createElement('figcaption'); cap.textContent = f.cat; fig.append(cap);
    fig.addEventListener('click', () => abrir(f));
    const dl = document.createElement('button'); dl.className = 'dl'; dl.textContent = '⬇'; dl.title = 'Descargar foto'; dl.setAttribute('aria-label', 'Descargar foto');
    dl.addEventListener('click', (e) => { e.stopPropagation(); descargar(f, dl); });
    fig.append(dl);
    const puede = (admin && vista === 'todas') || vista === 'mias';
    if (puede) {
      const b = document.createElement('button'); b.className = 'del'; b.textContent = '🗑'; b.title = 'Eliminar foto';
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar esta foto del álbum?')) return;
        let enAlbum = true;
        try {
          const cuerpo = vista === 'mias' ? { id: f.id, token: f.token } : { id: f.id, clave: admin };
          const r = await fetch('/api/borrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
          enAlbum = r.ok;
        } catch (err) { enAlbum = false; }
        if (vista === 'todas' && !enAlbum) { alert('No se pudo eliminar. Revisa tu clave y que la base de datos no esté pausada.'); return; }
        // En "Mis fotos" siempre se quita de este celular, aunque el álbum compartido no responda
        todas = todas.filter((x) => x.id !== f.id || !enAlbum);
        try { localStorage.setItem('misFotos', JSON.stringify(mias().filter((x) => x.id !== f.id))); } catch (err) {}
        pintar();
        if (vista === 'mias' && !enAlbum) alert('La quité de tu lista. En el álbum compartido puede seguir si la base de datos estaba pausada.');
      });
      fig.append(b);
    }
    g.append(fig);
  });
}

// Descarga la foto directo a la carpeta de Descargas (sin abrir otra pestaña)
function nombreArchivo(f) {
  const ext = ((f.url || '').match(/\.(jpe?g|png|webp|gif)(\?|$)/i) || [, 'jpg'])[1].toLowerCase();
  const cat = String(f.cat || 'foto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
  return `keidy-${cat}-${String(f.id || Date.now()).replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
}
async function traerBlob(f) {
  try {
    const r = await fetch(f.url, { mode: 'cors' });   // directo desde ImgBB
    if (r.ok) return await r.blob();
  } catch (e) { /* ImgBB no permite leerla desde el navegador: se usa el servidor */ }
  const r2 = await fetch('/api/descargar?url=' + encodeURIComponent(f.url) + '&name=' + encodeURIComponent(nombreArchivo(f)));
  if (!r2.ok) throw new Error('descarga');
  return await r2.blob();
}
async function descargar(f, btn) {
  const antes = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const blob = await traerBlob(f);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo(f);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (btn) btn.textContent = '✓';
  } catch (e) {
    alert('No se pudo descargar la foto. Revisa tu internet e intenta de nuevo.');
    if (btn) btn.textContent = antes;
  }
  if (btn) setTimeout(() => { btn.disabled = false; btn.textContent = antes; }, 1500);
}

let actual = null;
function abrir(f) { actual = f; $('lbImg').src = f.url; $('lb').classList.add('on'); }
$('lbDown').addEventListener('click', (e) => { e.preventDefault(); if (actual) descargar(actual, $('lbDown')); });
$('lbCerrar').onclick = () => $('lb').classList.remove('on');
$('lb').addEventListener('click', (e) => { if (e.target === $('lb')) $('lb').classList.remove('on'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') $('lb').classList.remove('on'); });

const marcar = (cont, btn) => { cont.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn)); };
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; vista = b.dataset.v; marcar($('tabs'), b); pintar(); });
$('cats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; marcar($('cats'), b); pintar(); });

cargar();
setInterval(() => { if (!document.hidden && vista === 'todas') cargar(); }, 30000);
