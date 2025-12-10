import axios from "axios";
import config from "../config/index.js";
import db from "../models/index.js";

function buildCreationDateFilter(fromDate, toDate) {
  let fromIso;
  let toIso;

  if (config.vtexCronOrder.testWindow == "true") {
    fromIso = config.vtexCronOrder.testFrom;
    toIso = config.vtexCronOrder.testTo;
  } else {
    fromIso = fromDate.toISOString();
    toIso = toDate.toISOString();
  }

  const raw = `creationDate:[${fromIso} TO ${toIso}]`;

  return encodeURIComponent(raw);
}

async function listOrdersInWindow({ from, to, page = 1, perPage = 50 }) {
  if (!config.vtexCronOrder.url) {
    throw new Error("VTEX baseUrl no está configurada.");
  }

  const url = `${config.vtexCronOrder.url}?page=${page}&per_page=${perPage}&f_creationDate=${buildCreationDateFilter(from, to)}`;

  const headers = {
    "X-VTEX-API-AppKey": config.vtex.appKey,
    "X-VTEX-API-AppToken": config.vtex.appToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const response = await axios.get(url, {
    headers,
  });

  const data = response.data || {};
  const list = Array.isArray(data.list) ? data.list : [];

  return {
    orders: list,
    paging: data.paging || null,
  };
}

async function getOrderDetail(orderId) {
  if (!config.vtexCronOrder.url) {
    throw new Error("VTEX baseUrl no está configurada.");
  }

  const url = `${config.vtexCronOrder.url}/${orderId}`;
  // const url = `${config.vtexCronOrder.url}/1580790500001-01`;

  const headers = {
    "X-VTEX-API-AppKey": config.vtex.appKey,
    "X-VTEX-API-AppToken": config.vtex.appToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const response = await axios.get(url, {
    headers,
  });

  return response.data;
}

/**
 * Recorre la ventana de tiempo y:
 * - Inserta pedidos que no estén en la DB.
 * - Opcionalmente actualiza estado / timestamps de pedidos existentes.
 *
 * Devuelve un resumen con contadores.
 */
export async function reconcileVtexOrders() {
  if (!config.vtex.appKey || !config.vtex.appToken) {
    console.warn(
      "[VTEX CRON GET ORDERS] AppKey/AppToken no configurados, se omite reconciliación."
    );
    return { processed: 0, inserted: 0, updated: 0 };
  }

  const now = new Date();
  const windowHours = config.vtexCronOrder.window || 3;
  const from = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  console.log(
    `[VTEX CRON GET ORDERS] Iniciando reconciliación. Ventana: ${from.toISOString()} -> ${now.toISOString()}`
  );

  let page = 1;
  const perPage = 50;

  let processed = 0;
  let inserted = 0;
  let updated = 0;

  while (true) {
    let ordersPage;

    try {
      ordersPage = await listOrdersInWindow({ from, to: now, page, perPage });
    } catch (err) {
      console.error(
        `[VTEX CRON GET ORDERS] Error listando órdenes en página ${page}:`,
        err?.response?.status,
        err?.response?.data || err.message
      );
      break;
    }

    const orders = ordersPage.orders;

    if (!orders.length) {
      if (page === 1) {
        console.log("[VTEX CRON GET ORDERS] No se encontraron órdenes en la ventana.");
      }
      break;
    }

    console.log(
      `[VTEX CRON GET ORDERS] Página ${page}: ${orders.length} órdenes devueltas.`
    );

    for (const summary of orders) {
      processed += 1;
      const orderId = summary.orderId;

      try {
        const existing = await db.PedidosDesdeVtex.findOne({
          where: { orderId }, 
        });

        if (existing) {
          // Si querés actualizar estado/fechas, podrías hacer algo tipo:
          continue;
        }

        const fullOrder = await getOrderDetail(orderId);

        const lastChangeDate = new Date(fullOrder.lastChange);
        const recepcion = new Date(fullOrder.creationDate);

        await db.PedidosDesdeVtex.create({
          OrderId: fullOrder.orderId,
          State: fullOrder.status || "unknown",
          LastChange: lastChangeDate.toISOString(),
          OriginAccount:
            fullOrder.marketplace?.name || fullOrder.hostname || null,
          OriginKey: fullOrder.orderGroup || fullOrder.sequence || null,
          JsonCompleto: JSON.stringify(fullOrder),
          FechaRecepcion: recepcion.toISOString(),
        });

        inserted += 1;
      } catch (err) {
        console.error(
          `[VTEX CRON GET ORDERS] Error procesando orderId=${orderId}:`,
          err?.response?.status,
          err?.response?.data || err.message
        );
      }
    }

    if (orders.length < perPage) {
      break;
    }

    page += 1;
  }

  console.log(
    `[VTEX CRON GET ORDERS] Finalizado. Procesadas=${processed}, Insertadas=${inserted}, Actualizadas=${updated}`
  );

  return { processed, inserted, updated };
}
