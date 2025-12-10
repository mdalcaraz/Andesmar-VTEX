// src/jobs/vtexOrdersStatusUpdate.job.js
import cron from 'node-cron';
import config from '../config/index.js';
import { updateVtexOrdersStatus } from '../services/vtexOrdersStatusUpdate.service.js';

async function runOnceAtStartup() {
  console.log('[VTEX CRON UPDATE STATUS] Ejecutando actualización inicial de estados al iniciar el servidor...');
  try {
    await updateVtexOrdersStatus();
    console.log('[VTEX CRON UPDATE STATUS] Actualización inicial de estados completada OK.');
  } catch (err) {
    console.error('[VTEX CRON UPDATE STATUS] Error en actualización inicial de estados:', err);
  }
}

function registerVtexOrdersStatusCron() {
  if (!config.vtexCronUpdateStatus.enabled) {
    console.log('[VTEX CRON UPDATE STATUS] Deshabilitado por configuración.');
    return;
  }

  const expression = config.vtexCronUpdateStatus.time;

  if (!cron.validate(expression)) {
    console.error(
      `[VTEX CRON UPDATE STATUS] Expresión cron inválida: "${expression}". ` +
        'El job de actualización de estados NO se va a registrar.'
    );
    return;
  }

  console.log(
    `[VTEX CRON UPDATE STATUS] Registrando job de actualización de estados VTEX con expresión "${expression}".`
  );

  // ───────────────────────────────────────────────
  //  EJECUTAR UNA VEZ AL INICIAR EL SERVIDOR
  // ───────────────────────────────────────────────
  runOnceAtStartup();

  // ───────────────────────────────────────────────
  //  REGISTRO NORMAL DEL CRON PROGRAMADO
  // ───────────────────────────────────────────────
  cron.schedule(expression, async () => {
    console.log('[VTEX CRON UPDATE STATUS] Disparando job de actualización de estados...');
    try {
      await updateVtexOrdersStatus();
      console.log('[VTEX CRON UPDATE STATUS] Job de actualización de estados completado OK.');
    } catch (err) {
      console.error('[VTEX CRON UPDATE STATUS] Error en job de actualización de estados:', err);
    }
  });
}

registerVtexOrdersStatusCron();
