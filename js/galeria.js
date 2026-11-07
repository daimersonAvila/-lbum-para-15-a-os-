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
    if (admin && vista === 'todas') {
      const b = document.createElement('button'); b.className = 'del'; b.textContent = '🗑'; b.title = 'Quitar de la galería';
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Quitar esta foto de la galería?')) return;
        const r = await fetch('/api/borrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, clave: admin }) });
        if (r.ok) { todas = todas.filter((x) => x.id !== f.id); pintar(); } else alert('Clave incorrecta');
      });
      fig.append(b);
    }
    g.append(fig);
  });
}

function abrir(f) { $('lbImg').src = f.url; $('lbDown').href = f.url; $('lb').classList.add('on'); }
$('lbCerrar').onclick = () => $('lb').classList.remove('on');
$('lb').addEventListener('click', (e) => { if (e.target === $('lb')) $('lb').classList.remove('on'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') $('lb').classList.remove('on'); });

const marcar = (cont, btn) => { cont.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn)); };
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; vista = b.dataset.v; marcar($('tabs'), b); pintar(); });
$('cats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; marcar($('cats'), b); pintar(); });

cargar();
setInterval(() => { if (!document.hidden && vista === 'todas') cargar(); }, 30000);
