//vtexOrdersReconciliation.service.js
import axios from "axios";
import config from "../config/index.js";
import db from "../models/index.js";
import { insertarPedido } from "./andesmar.service.js";

function buildCreationDateFilter(fromDate, toDate) {
  let fromIso;
  let toIso;

  if (config.vtexCronGetOrder.testWindow == "true") {
    fromIso = config.vtexCronGetOrder.testFrom;
    toIso = config.vtexCronGetOrder.testTo;
  } else {
    fromIso = fromDate.toISOString();
    toIso = toDate.toISOString();
  }

  const raw = `creationDate:[${fromIso} TO ${toIso}]`;

  return encodeURIComponent(raw);
}

async function listOrdersInWindow({ from, to, page = 1, perPage = 50 }) {
  if (!config.vtexCronGetOrder.url) {
    throw new Error("VTEX baseUrl no está configurada.");
  }

  const url = `${config.vtexCronGetOrder.url}?page=${page}&per_page=${perPage}&f_creationDate=${buildCreationDateFilter(from, to)}`;

  const headers = {
    "X-VTEX-API-AppKey": config.vtex.appKey,
    "X-VTEX-API-AppToken": config.vtex.appToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const response = await axios.get(url, { headers });

  const data = response.data || {};
  const list = Array.isArray(data.list) ? data.list : [];

  return {
    orders: list,
    paging: data.paging || null,
  };
}

async function getOrderDetail(orderId) {
  if (!config.vtexCronGetOrder.url) {
    throw new Error("VTEX baseUrl no está configurada.");
  }

  const url = `${config.vtexCronGetOrder.url}/${orderId}`;

  const headers = {
    "X-VTEX-API-AppKey": config.vtex.appKey,
    "X-VTEX-API-AppToken": config.vtex.appToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const response = await axios.get(url, { headers });

  return response.data;
}

function buildAndesmarPayload(fullOrder, clienteVtex) {
  const address = fullOrder.shippingData?.address ?? {};
  const profile = fullOrder.clientProfileData ?? {};

  let totalPeso = 0;
  let totalM3 = 0;
  let totalBultos = 0;
  const altos = [];
  const anchos = [];
  const largos = [];

  for (const item of fullOrder.items ?? []) {
    const qty = item.quantity ?? 1;
    const dim = item.additionalInfo?.dimension ?? {};
    const height = dim.height ?? 10;
    const width = dim.width ?? 10;
    const length = dim.length ?? 10;
    const weight = dim.weight ?? 1;

    totalPeso += weight * qty;
    totalM3 += (height / 100) * (width / 100) * (length / 100) * qty;
    totalBultos += qty;

    for (let i = 0; i < qty; i++) {
      altos.push(height);
      anchos.push(width);
      largos.push(length);
    }
  }

  // VTEX almacena valores en centavos
  const valorDeclarado = (fullOrder.value ?? 0) / 100;

  return {
    CodigoPostalRemitente: clienteVtex.CodigoPostalRemitente,
    CalleRemitente: clienteVtex.CalleRemitente ?? "",
    CalleNroRemitente: clienteVtex.CalleNroRemitente ?? "",
    NombreApellidoDestinatario: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
    CodigoPostalDestinatario: address.postalCode ?? "",
    CalleDestinatario: address.street ?? "",
    CalleNroDestinatario: address.number ?? "",
    TelefonoDestinatario: profile.phone ?? "",
    TelefonoRemitente: profile.phone ?? "",
    MailDestinatario: profile.email ?? "",
    NroRemito: fullOrder.orderId,
    ProvinciaDestino: address.state ?? "",
    LocalidadDestino: address.city ?? "",
    ProductoAEntregar: "",
    Bultos: totalBultos,
    Peso: totalPeso || 1,
    ValorDeclarado: valorDeclarado || 10000,
    M3: totalM3 || 0,
    Alto: altos,
    Ancho: anchos,
    Largo: largos,
    Observaciones: "0",
    ModalidadEntregaID: clienteVtex.ModalidadEntregaID,
    servicio: {
      EsFletePagoDestino: clienteVtex.EsFletePagoDestino,
      EsRemitoconformado: clienteVtex.EsRemitoconformado,
    },
    logueo: {
      Usuario: clienteVtex.Usuario,
      Clave: clienteVtex.Clave,
      CodigoCliente: clienteVtex.CodigoCliente,
    },
    CodigoAgrupacion: clienteVtex.CodigoAgrupacion,
  };
}

/**
 * Recorre la ventana de tiempo y:
 * - Inserta pedidos que no estén en la DB.
 * - Actualiza estado / timestamps de pedidos existentes si cambiaron.
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
  const windowHours = config.vtexCronGetOrder.window || 3;
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
          where: { OrderId: orderId },
        });

        if (existing) {
          const summaryLastChange = new Date(summary.lastChange).toISOString();
          const sinCambios = existing.LastChange === summaryLastChange;

          // Saltear solo si no hubo cambios Y ya fue enviado a Andesmar
          if (sinCambios && existing.Procesado) {
            continue;
          }

          // Si hubo cambios, actualizar datos del pedido
          if (!sinCambios) {
            const fullOrder = await getOrderDetail(orderId);
            await existing.update({
              State: fullOrder.status || "unknown",
              LastChange: new Date(fullOrder.lastChange).toISOString(),
              JsonCompleto: JSON.stringify(fullOrder),
            });
            updated += 1;
          }

          // Si aún no fue enviado a Andesmar, intentar envío
          if (!existing.Procesado) {
            const fullOrder = await getOrderDetail(orderId);
            const originAccount = fullOrder.marketplace?.name || fullOrder.hostname || null;
            const clienteVtex = await db.ClienteVtex.findOne({
              where: { OriginAccount: originAccount, Activo: true },
            });

            if (!clienteVtex) {
              console.warn(
                `[VTEX CRON GET ORDERS] No se encontró ClienteVtex para OriginAccount="${originAccount}" (orderId=${orderId})`
              );
              continue;
            }

            try {
              const andesmarPayload = buildAndesmarPayload(fullOrder, clienteVtex);
              const respuesta = await insertarPedido(andesmarPayload, clienteVtex.Usuario, clienteVtex.Clave);
              console.log(`[ANDESMAR] Pedido enviado OK orderId=${orderId}:`, JSON.stringify(respuesta));
              await existing.update({ Procesado: true, FechaProcesado: new Date().toISOString() });
            } catch (errEnvio) {
              console.error(`[ANDESMAR] Error enviando pedido orderId=${orderId}:`, errEnvio.message);
            }
          }

          continue;
        }

        const fullOrder = await getOrderDetail(orderId);
        const lastChangeDate = new Date(fullOrder.lastChange);
        const recepcion = new Date(fullOrder.creationDate);

        const record = await db.PedidosDesdeVtex.create({
          OrderId: fullOrder.orderId,
          State: fullOrder.status || "unknown",
          LastChange: lastChangeDate.toISOString(),
          OriginAccount: fullOrder.marketplace?.name || fullOrder.hostname || null,
          OriginKey: fullOrder.orderGroup || fullOrder.sequence || null,
          JsonCompleto: JSON.stringify(fullOrder),
          FechaRecepcion: recepcion.toISOString(),
        });

        inserted += 1;

        const originAccount = fullOrder.marketplace?.name || fullOrder.hostname || null;
        const clienteVtex = await db.ClienteVtex.findOne({
          where: { OriginAccount: originAccount, Activo: true },
        });

        if (!clienteVtex) {
          console.warn(
            `[VTEX CRON GET ORDERS] No se encontró ClienteVtex para OriginAccount="${originAccount}" (orderId=${orderId})`
          );
          continue;
        }

        try {
          const andesmarPayload = buildAndesmarPayload(fullOrder, clienteVtex);
          const respuesta = await insertarPedido(andesmarPayload, clienteVtex.Usuario, clienteVtex.Clave);
          console.log(`[ANDESMAR] Pedido enviado OK orderId=${orderId}:`, JSON.stringify(respuesta));
          await record.update({ Procesado: true, FechaProcesado: new Date().toISOString() });
        } catch (errEnvio) {
          console.error(`[ANDESMAR] Error enviando pedido orderId=${orderId}:`, errEnvio.message);
        }

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
