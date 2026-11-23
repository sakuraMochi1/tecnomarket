// Se ejecuta automáticamente SOLO la primera vez que se crea el volumen de Mongo.
// Cuando tengas tu base real: reemplaza este contenido con tus colecciones y datos.
// Para volver a ejecutarlo: docker compose down -v && docker compose up -d
const database = process.env.MONGO_INITDB_DATABASE || 'tecnomarket';
const target = db.getSiblingDB(database);

if (target.productos.countDocuments() === 0) {
  target.productos.insertMany([
    { nombre: "Notebook", categoria: "computadores", precio: 700000, stock: 8 },
    { nombre: "Mouse gamer", categoria: "periferico", precio: 25000, stock: 25 },
    { nombre: "Monitor 27", categoria: "monitor", precio: 180000, stock: 5 },
    { nombre: "Audífonos Bluetooth", categoria: "audio", precio: 45000, stock: 12 },
    { nombre: "Webcam HD", categoria: "periferico", precio: 35000, stock: 6 }
  ]);
  print('Datos de ejemplo insertados en ' + database);
}
