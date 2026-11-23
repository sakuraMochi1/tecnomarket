/**
 * ÚNICO ARCHIVO A EDITAR cuando te entreguen la base de datos.
 *
 * - database:   nombre de la base de datos (también se puede fijar con DB_NAME en .env)
 * - collections: una entrada por colección. La web crea una pestaña por cada una.
 *
 * Tipos de campo soportados:
 *   string | number | boolean | date | select (requiere options: [...]) | textarea
 *
 * Opciones por campo: name, label, type, required, min (number), options (select)
 */
module.exports = {
  database: process.env.DB_NAME || 'tecnomarket',
  title: 'Panel CRUD MongoDB',
  collections: [
    {
      name: 'productos',
      label: 'Productos',
      fields: [
        { name: 'nombre',    label: 'Nombre',    type: 'string', required: true },
        { name: 'categoria', label: 'Categoría', type: 'select', required: true,
          options: ['computadores', 'periferico', 'monitor', 'audio'] },
        { name: 'precio',    label: 'Precio',    type: 'number', required: true, min: 0 },
        { name: 'stock',     label: 'Stock',     type: 'number', required: true, min: 0 }
      ]
    }
    // { name: 'clientes', label: 'Clientes', fields: [ ... ] },
    // { name: 'pedidos',  label: 'Pedidos',  fields: [ ... ] },
  ]
};
