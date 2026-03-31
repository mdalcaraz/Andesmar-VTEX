import "dotenv/config";

const env = (name, fallback) => process.env[name] ?? fallback;

export default {
  nodeEnv: env("NODE_ENV", "development"),
  port: Number(env("PORT", 3000)),
  corsOrigins: env("CORS_ORIGINS", "").split(",").filter(Boolean),
  andesmar: {
    baseUrl: env("ANDESMAR_BASE_URL", "https://api.andesmarcargas.com"),
    insertarPedidoPath: env("ANDESMAR_INSERTAR_PEDIDO_PATH", "/api/InsertPedidoMulti"),
    timeoutMs: Number(env("ANDESMAR_TIMEOUT_MS", 60000)),
  },
  db: {
    host: env("DB_HOST", "localhost"),
    instance: env("DB_INSTANCE", ""),
    database: env("DB_NAME", "my_app_db"),
    username: env("DB_USER", "sa"),
    password: env("DB_PASSWORD", ""),
    dialect: env("DB_DIALECT", "mssql"),
    logging: env("DB_LOGGING", "false") === "true",
  },
  vtex: {
    baseUrl: env("VTEX_BASE_URL", "https://andesmarpartnerar.myvtex.com"),
    appKey: env("VTEX_APP_KEY", ""),
    appToken: env("VTEX_APP_TOKEN", ""),
    hookAuthToken: env("ANDESMAR_GENERATED_TOKEN", ""),
  },
  vtexCronGetOrder: {
    enabled: env("VTEX_GET_ORDERS_CRON_ENABLED", "false")  === "true",
    time: env("VTEX_GET_ORDERS_CRON_EXPRESSION", 45),
    window: env("VTEX_GET_ORDERS_CRON_WINDOW_HOURS", 3),
    url: env("VTEX_GET_ORDERS_URL", ""),
    testWindow: env("VTEX_GET_ORDERS_USE_TEST_WINDOW", false),
    testFrom: env("VTEX_GET_ORDERS_TEST_FROM", ""),
    testTo: env("VTEX_GET_ORDERS_TEST_TO", ""),
  },
  vtexCronUpdateStatus: {
    enabled: env("VTEX_UPDATE_STATUS_CRON_ENABLED", "false") === "true",
    time: env("VTEX_UPDATE_STATUS_CRON_EXPRESSION", "*/30 * * * *"),
  },
};
