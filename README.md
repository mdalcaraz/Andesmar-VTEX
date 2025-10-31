# Node + Express + Sequelize (MSSQL) Starter

Estructura lista para APIs robustas: Express, Sequelize (dialecto MSSQL vía `tedious`), capas limpias (routes/controllers/services), middlewares de seguridad, validación, logging, rate limit y utilidades.

## Requisitos
- Node.js >= 18.18
- SQL Server (local o en contenedor)

## Instalación
```bash
pnpm i # o npm i / yarn
cp .env.example .env
# Edita .env con tus credenciales de SQL Server
pnpm dev # o npm run dev
```

Visita: `http://localhost:${PORT:-3000}/health`

## Estructura
```text
src/
  config/        # lectura de env, seguridad
  db/            # init sequelize y conexión
  models/        # modelos sequelize
  middlewares/   # errores, seguridad, logs, auth, validate
  services/      # lógica de negocio / integraciones
  controllers/   # orquestación request->service
  routes/        # define endpoints y validaciones
  utils/         # helpers
  app.js         # instancia express y middlewares base
  server.js      # arranque del servidor
```

## Comandos
- `pnpm dev` — desarrollo con `nodemon`
- `pnpm start` — producción
- `pnpm lint` / `pnpm format` — estilo

## Notas
- Incluye ejemplo de consumo de API externa en `services/externalApi.service.js`.
- Incluye ejemplo de modelo `User` y sincronización automática (desactívala en prod).
- Ajusta CORS, rate limit, y headers de Helmet según tus necesidades.
