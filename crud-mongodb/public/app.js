let cfg, current, editingId = null;
const $ = s => document.querySelector(s);

const esc = v => String(v ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, {
    headers: { 'Content-Type': 'application/json' }, ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

function msg(text, type = 'ok') { const m = $('#msg'); m.textContent = text; m.className = type; }

// ---------- inicio ----------
async function init() {
  try {
    const h = await api('health');
    $('#status').textContent = 'MongoDB: ' + h.database; $('#status').className = 'badge ok';
  } catch { $('#status').textContent = 'Sin conexión a MongoDB'; $('#status').className = 'badge err'; }

  cfg = await api('config');
  $('#title').textContent = cfg.title; document.title = cfg.title;
  $('#tabs').innerHTML = cfg.collections.map((c, i) =>
    `<button data-i="${i}">${esc(c.label || c.name)}</button>`).join('');
  $('#tabs').onclick = e => { if (e.target.dataset.i) selectCollection(cfg.collections[e.target.dataset.i]); };
  selectCollection(cfg.collections[0]);
}

function selectCollection(c) {
  current = c; editingId = null;
  document.querySelectorAll('#tabs button').forEach((b, i) =>
    b.classList.toggle('active', cfg.collections[i] === c));
  $('#search').value = '';
  $('#listTitle').textContent = c.label || c.name;
  renderForm(); load();
}

// ---------- formulario dinámico ----------
function renderForm(values = {}) {
  $('#formTitle').textContent = editingId ? 'Editar registro' : 'Nuevo registro';
  $('#btnCancel').hidden = !editingId;
  $('#btnSave').textContent = editingId ? 'Actualizar' : 'Guardar';
  $('#form').innerHTML = current.fields.map(f => {
    const v = values[f.name];
    const req = f.required ? ' required' : '';
    const lbl = esc(f.label || f.name) + (f.required ? ' *' : '');
    if (f.type === 'boolean')
      return `<label class="check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${lbl}</label>`;
    if (f.type === 'select')
      return `<label>${lbl}<select name="${f.name}"${req}><option value="">— seleccionar —</option>` +
        f.options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('') + `</select></label>`;
    if (f.type === 'textarea')
      return `<label>${lbl}<textarea name="${f.name}" rows="2"${req}>${esc(v)}</textarea></label>`;
    const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
    const val = f.type === 'date' && v ? String(v).slice(0, 10) : (v ?? '');
    const min = f.min !== undefined ? ` min="${f.min}"` : '';
    return `<label>${lbl}<input type="${type}" name="${f.name}" value="${esc(val)}"${min}${req}${type === 'number' ? ' step="any"' : ''}></label>`;
  }).join('');
}

function readForm() {
  const body = {};
  for (const f of current.fields) {
    const el = $(`#form [name="${f.name}"]`);
    body[f.name] = f.type === 'boolean' ? el.checked : el.value;
  }
  return body;
}

// ---------- tabla ----------
function fmt(f, v) {
  if (v === null || v === undefined || v === '') return '<span style="color:var(--muted)">—</span>';
  if (f.type === 'boolean') return v ? '✓' : '✗';
  if (f.type === 'date') return new Date(v).toLocaleDateString('es-CL');
  if (f.type === 'number') return Number(v).toLocaleString('es-CL');
  return esc(v);
}

let rows = [];
async function load() {
  const q = $('#search').value.trim();
  try { rows = await api(current.name + (q ? '?q=' + encodeURIComponent(q) : '')); }
  catch (e) { return msg(e.message, 'err'); }
  const head = '<tr>' + current.fields.map(f => `<th>${esc(f.label || f.name)}</th>`).join('') + '<th></th></tr>';
  const body = rows.length
    ? rows.map(r => '<tr>' + current.fields.map(f => `<td>${fmt(f, r[f.name])}</td>`).join('') +
        `<td class="row-actions"><button data-edit="${r._id}">Editar</button>` +
        `<button class="danger" data-del="${r._id}">Eliminar</button></td></tr>`).join('')
    : `<tr><td class="empty" colspan="${current.fields.length + 1}">Sin registros</td></tr>`;
  $('#table').innerHTML = head + body;
}

// ---------- eventos ----------
$('#table').onclick = async e => {
  const { edit, del } = e.target.dataset;
  if (edit) {
    editingId = edit; renderForm(rows.find(r => r._id === edit));
    window.scrollTo({ top: 0, behavior: 'smooth' }); msg('');
  }
  if (del && confirm('¿Eliminar este registro?')) {
    try { await api(`${current.name}/${del}`, { method: 'DELETE' }); msg('Registro eliminado'); load(); }
    catch (err) { msg(err.message, 'err'); }
  }
};

$('#btnSave').onclick = async () => {
  const form = $('#form');
  const invalid = [...form.querySelectorAll('input,select,textarea')].find(el => !el.checkValidity());
  if (invalid) { invalid.reportValidity(); return; }
  try {
    if (editingId) await api(`${current.name}/${editingId}`, { method: 'PUT', body: readForm() });
    else await api(current.name, { method: 'POST', body: readForm() });
    msg(editingId ? 'Registro actualizado' : 'Registro creado');
    editingId = null; renderForm(); load();
  } catch (e) { msg(e.message, 'err'); }
};

$('#btnCancel').onclick = () => { editingId = null; renderForm(); msg(''); };

let t; $('#search').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); };

init();
