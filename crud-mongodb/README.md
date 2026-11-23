# CRUD web con MongoDB (Express + Docker)

## Levantar todo (Mongo + web) con Docker
```
docker compose up -d --build
```
- Web: http://localhost:3000
- MongoDB desde tu PC / Compass: `mongodb://localhost:27018`
- Ver logs: `docker compose logs -f app`
- Apagar: `docker compose down`  (agrega `-v` para borrar también los datos)

## Cuando te entreguen la base de datos
1. Edita **`src/config.js`**: nombre de la base, colecciones y campos.
2. Carga los datos reales:
   - Opción A: reemplaza `seed/01-init.js` y ejecuta `docker compose down -v && docker compose up -d --build`.
   - Opción B: impórtalos con Compass (conexión `mongodb://localhost:27018` > Add Data > Import).
3. Si el nombre de la base cambió, ajústalo también en `.env` (`DB_NAME`).
4. `docker compose up -d --build` y listo.

## Ejecutar sin Docker para la app (solo Mongo en Docker)
```
docker compose up -d mongo
npm install
node src/server.js
```
Para Mongo local usa `MONGO_URI=mongodb://localhost:27017`.

## API
| Método | Ruta | Acción |
|---|---|---|
| GET | /api/:coleccion?q=texto | Read (con búsqueda) |
| POST | /api/:coleccion | Create |
| PUT | /api/:coleccion/:id | Update |
| DELETE | /api/:coleccion/:id | Delete |
