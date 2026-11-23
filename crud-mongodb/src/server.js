const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const config = require('./config');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const client = new MongoClient(MONGO_URI);
let db;

// ---------- utilidades ----------
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getDef(req, res, next) {
  const def = config.collections.find(c => c.name === req.params.col);
  if (!def) return res.status(404).json({ error: 'Colección no configurada' });
  req.def = def;
  req.col = db.collection(def.name);
  next();
}

function parseId(id) {
  if (!ObjectId.isValid(id)) {
    const e = new Error('ID inválido'); e.status = 400; throw e;
  }
  return new ObjectId(id);
}

function coerce(f, v) {
  switch (f.type) {
    case 'number': {
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`"${f.label || f.name}" debe ser un número`);
      if (f.min !== undefined && n < f.min) throw new Error(`"${f.label || f.name}" debe ser >= ${f.min}`);
      return n;
    }
    case 'boolean': return v === true || v === 'true' || v === 'on';
    case 'date': {
      const d = new Date(v);
      if (isNaN(d)) throw new Error(`"${f.label || f.name}" no es una fecha válida`);
      return d;
    }
    default: return String(v).trim();
  }
}

function buildDoc(def, body) {
  const doc = {};
  for (const f of def.fields) {
    const v = body[f.name];
    const empty = v === undefined || v === null || v === '';
    if (f.type === 'boolean') { doc[f.name] = coerce(f, v); continue; }
    if (empty) {
      if (f.required) throw new Error(`"${f.label || f.name}" es obligatorio`);
      doc[f.name] = null;
      continue;
    }
    if (f.type === 'select' && f.options && !f.options.includes(v))
      throw new Error(`Valor no permitido en "${f.label || f.name}"`);
    doc[f.name] = coerce(f, v);
  }
  return doc;
}

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- rutas ----------
app.get('/api/config', (req, res) => res.json({ title: config.title, collections: config.collections }));

app.get('/api/health', wrap(async (req, res) => {
  await db.command({ ping: 1 });
  res.json({ ok: true, database: db.databaseName });
}));

// READ (con búsqueda opcional ?q=texto)
app.get('/api/:col', getDef, wrap(async (req, res) => {
  const q = (req.query.q || '').trim();
  let filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const textFields = req.def.fields.filter(f => ['string', 'select', 'textarea'].includes(f.type));
    if (textFields.length) filter = { $or: textFields.map(f => ({ [f.name]: rx })) };
  }
  res.json(await req.col.find(filter).toArray());
}));

// CREATE
app.post('/api/:col', getDef, wrap(async (req, res) => {
  const doc = buildDoc(req.def, req.body);
  const r = await req.col.insertOne(doc);
  res.status(201).json({ _id: r.insertedId, ...doc });
}));

// UPDATE
app.put('/api/:col/:id', getDef, wrap(async (req, res) => {
  const doc = buildDoc(req.def, req.body);
  const r = await req.col.updateOne({ _id: parseId(req.params.id) }, { $set: doc });
  if (!r.matchedCount) return res.status(404).json({ error: 'Documento no encontrado' });
  res.json({ ok: true, modified: r.modifiedCount });
}));

// DELETE
app.delete('/api/:col/:id', getDef, wrap(async (req, res) => {
  const r = await req.col.deleteOne({ _id: parseId(req.params.id) });
  if (!r.deletedCount) return res.status(404).json({ error: 'Documento no encontrado' });
  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message });
});

// ---------- arranque con reintentos ----------
async function start() {
  for (let i = 1; i <= 10; i++) {
    try {
      await client.connect();
      db = client.db(config.database);
      await db.command({ ping: 1 });
      console.log(`Conectado a MongoDB (${MONGO_URI}) -> base "${config.database}"`);
      return app.listen(PORT, () => console.log(`Web en http://localhost:${PORT}`));
    } catch (e) {
      console.log(`Mongo no disponible (intento ${i}/10): ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('No se pudo conectar a MongoDB. Revisa MONGO_URI.');
  process.exit(1);
}
start();
