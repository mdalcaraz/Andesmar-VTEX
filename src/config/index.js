import "dotenv/config";

const env = (name, fallback) => process.env[name] ?? fallback;

export default {
  nodeEnv: env("NODE_ENV", "development"),
  port: Number(env("PORT", 3000)),
  corsOrigins: env("CORS_ORIGINS", "").split(",").filter(Boolean),
  externalApi: {
    baseURL: env("EXTERNAL_API_BASE_URL", ""),
    apiKey: env("EXTERNAL_API_KEY", ""),
  },
  db: {
    host: env("DB_HOST", "localhost"),
    port: Number(env("DB_PORT", 1433)),
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
    hookAuthToken: env("ANDESMAR_GENERATED_TOKEN", "")
  },
  vtexCronOrder:{
    enabled: env("VTEX_ORDERS_CRON_ENABLED", true),
    time: env("VTEX_ORDERS_CRON_EXPRESSION", 45),
    window: env("VTEX_ORDERS_CRON_WINDOW_HOURS", 3),
    url: env("VTEX_ORDERS_URL", ""),
    testWindow: env("VTEX_USE_TEST_WINDOW", false),
    testFrom: env("VTEX_TEST_FROM", ""),
    testTo: env("VTEX_TEST_TO", "")
  }
};
