// src/jobs/vtexOrdersReconciliation.job.js
import cron from 'node-cron';
import config from '../config/index.js';
import { reconcileVtexOrders } from '../services/vtexOrdersReconciliation.service.js';

async function runOnceAtStartup() {
  console.log('[VTEX CRON GET ORDERS] Ejecutando reconciliación inicial al iniciar el servidor...');
  try {
    await reconcileVtexOrders();
    console.log('[VTEX CRON GET ORDERS] Reconciliación inicial completada OK.');
  } catch (err) {
    console.error('[VTEX CRON GET ORDERS] Error en reconciliación inicial:', err);
  }
}

function registerVtexOrdersCron() {
  if (!config.vtexCronOrder.enabled) {
    console.log('[VTEX CRON GET ORDERS] Deshabilitado por configuración.');
    return;
  }

  const expression = config.vtexCronOrder.time;

  if (!cron.validate(expression)) {
    console.error(
      `[VTEX CRON GET ORDERS] Expresión cron inválida: "${expression}". ` +
        'El job de reconciliación NO se va a registrar.'
    );
    return;
  }

  console.log(
    `[VTEX CRON GET ORDERS] Registrando reconciliación de órdenes VTEX con expresión "${expression}" (ventana=${config.vtexCronOrder.window}h).`
  );

  // ───────────────────────────────────────────────
  //  EJECUTAR UNA VEZ AL INICIAR EL SERVIDOR
  // ───────────────────────────────────────────────
  runOnceAtStartup();

  // ───────────────────────────────────────────────
  //  REGISTRO NORMAL DEL CRON PROGRAMADO
  // ───────────────────────────────────────────────
  cron.schedule(expression, async () => {
    console.log('[VTEX CRON GET ORDERS] Disparando job de reconciliación...');
    try {
      await reconcileVtexOrders();
      console.log('[VTEX CRON GET ORDERS] Job completado OK.');
    } catch (err) {
      console.error('[VTEX CRON GET ORDERS] Error en job de reconciliación:', err);
    }
  });
}

registerVtexOrdersCron();
