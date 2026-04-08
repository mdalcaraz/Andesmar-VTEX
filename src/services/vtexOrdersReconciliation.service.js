//vtexOrdersReconciliation.service.js
import axios from "axios";
import config from "../config/index.js";
import db from "../models/index.js";
import { insertarPedido } from "./andesmar.service.js";
import { resolveVtexCredentials } from "./vtex.service.js";

// Devuelve la fecha/hora local del servidor como string ISO sin Z
function nowLocal() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 23);
}

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

/**
 * Lista órdenes de VTEX en una ventana de tiempo.
 * Usa las credenciales y URL específicas de la cuenta.
 */
async function listOrdersInWindow({ from, to, page = 1, perPage = 50, getOrdersUrl, vtexHeaders }) {
  if (!getOrdersUrl) {
    throw new Error("VtexGetOrdersUrl no está configurada para esta cuenta.");
  }

  const url = `${getOrdersUrl}?page=${page}&per_page=${perPage}&f_creationDate=${buildCreationDateFilter(from, to)}`;

  const response = await axios.get(url, { headers: vtexHeaders });

  const data = response.data || {};
  const list = Array.isArray(data.list) ? data.list : [];

  return {
    orders: list,
    paging: data.paging || null,
  };
}

/**
 * Obtiene el detalle completo de una orden de VTEX.
 */
async function getOrderDetail(orderId, getOrdersUrl, vtexHeaders) {
  if (!getOrdersUrl) {
    throw new Error("VtexGetOrdersUrl no está configurada para esta cuenta.");
  }

  const url = `${getOrdersUrl}/${orderId}`;
  const response = await axios.get(url, { headers: vtexHeaders });

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
 * Reconcilia órdenes de UNA cuenta VTEX específica.
 * Devuelve contadores de la ejecución.
 *
 * @param {{ appKey: string, appToken: string, getOrdersUrl: string, label: string }} vtexAccount
 * @param {{ from: Date, to: Date }} window
 */
async function reconcileAccount(vtexAccount, { from, to }) {
  const { appKey, appToken, getOrdersUrl, label } = vtexAccount;
  const LOG = `[VTEX CRON GET ORDERS][${label}]`;

  const vtexHeaders = {
    "X-VTEX-API-AppKey": appKey,
    "X-VTEX-API-AppToken": appToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let page = 1;
  const perPage = 50;
  let processed = 0;
  let inserted = 0;
  let updated = 0;

  while (true) {
    let ordersPage;

    try {
      ordersPage = await listOrdersInWindow({ from, to, page, perPage, getOrdersUrl, vtexHeaders });
    } catch (err) {
      console.error(
        `${LOG} Error listando órdenes en página ${page}:`,
        err?.response?.status,
        err?.response?.data || err.message
      );
      break;
    }

    const orders = ordersPage.orders;

    if (!orders.length) {
      if (page === 1) {
        console.log(`${LOG} No se encontraron órdenes en la ventana.`);
      }
      break;
    }

    console.log(`${LOG} Página ${page}: ${orders.length} órdenes devueltas.`);

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
            const fullOrder = await getOrderDetail(orderId, getOrdersUrl, vtexHeaders);
            await existing.update({
              State: fullOrder.status || "unknown",
              LastChange: new Date(fullOrder.lastChange).toISOString(),
              JsonCompleto: JSON.stringify(fullOrder),
            });
            updated += 1;
          }

          // Si aún no fue enviado a Andesmar, intentar envío
          if (!existing.Procesado) {
            const fullOrder = await getOrderDetail(orderId, getOrdersUrl, vtexHeaders);
            const originAccount = fullOrder.marketplace?.name || fullOrder.hostname || null;
            const clienteVtex = await db.ClienteVtex.findOne({
              where: { OriginAccount: originAccount, Activo: true },
            });

            if (!clienteVtex) {
              console.warn(
                `${LOG} No se encontró ClienteVtex para OriginAccount="${originAccount}" (orderId=${orderId})`
              );
              continue;
            }

            try {
              const andesmarPayload = buildAndesmarPayload(fullOrder, clienteVtex);
              const respuesta = await insertarPedido(andesmarPayload, clienteVtex.Usuario, clienteVtex.Clave);
              console.log(`[ANDESMAR] Pedido enviado OK orderId=${orderId}:`, JSON.stringify(respuesta));
              await existing.update({ Procesado: true, FechaProcesado: nowLocal() });
            } catch (errEnvio) {
              console.error(`[ANDESMAR] Error enviando pedido orderId=${orderId}:`, errEnvio.message);
            }
          }

          continue;
        }

        // Pedido nuevo: insertar y enviar a Andesmar
        const fullOrder = await getOrderDetail(orderId, getOrdersUrl, vtexHeaders);
        const lastChangeDate = new Date(fullOrder.lastChange);

        const [record, created] = await db.PedidosDesdeVtex.findOrCreate({
          where: { OrderId: fullOrder.orderId },
          defaults: {
            State: fullOrder.status || "unknown",
            LastChange: lastChangeDate.toISOString(),
            OriginAccount: fullOrder.marketplace?.name || fullOrder.hostname || null,
            OriginKey: fullOrder.orderGroup || fullOrder.sequence || null,
            JsonCompleto: JSON.stringify(fullOrder),
            FechaRecepcion: nowLocal(),
          },
        });

        if (!created) continue; // otra instancia del cron ya lo insertó

        inserted += 1;

        const originAccount = fullOrder.marketplace?.name || fullOrder.hostname || null;
        const clienteVtex = await db.ClienteVtex.findOne({
          where: { OriginAccount: originAccount, Activo: true },
        });

        if (!clienteVtex) {
          console.warn(
            `${LOG} No se encontró ClienteVtex para OriginAccount="${originAccount}" (orderId=${orderId})`
          );
          continue;
        }

        try {
          const andesmarPayload = buildAndesmarPayload(fullOrder, clienteVtex);
          const respuesta = await insertarPedido(andesmarPayload, clienteVtex.Usuario, clienteVtex.Clave);
          console.log(`[ANDESMAR] Pedido enviado OK orderId=${orderId}:`, JSON.stringify(respuesta));
          await record.update({ Procesado: true, FechaProcesado: nowLocal() });
        } catch (errEnvio) {
          console.error(`[ANDESMAR] Error enviando pedido orderId=${orderId}:`, errEnvio.message);
        }

      } catch (err) {
        console.error(
          `${LOG} Error procesando orderId=${orderId}:`,
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

  return { processed, inserted, updated };
}

/**
 * Obtiene las cuentas VTEX únicas configuradas en la DB.
 * Deduplica por AppKey+URL para evitar llamadas repetidas al mismo marketplace.
 * Cae en fallback a las variables de entorno si la cuenta no tiene credenciales en DB.
 */
async function resolveVtexAccounts() {
  const clientes = await db.ClienteVtex.findAll({ where: { Activo: true } });

  const seen = new Set();
  const accounts = [];

  for (const cliente of clientes) {
    const creds = resolveVtexCredentials(cliente);
    const { appKey, appToken, getOrdersUrl, baseUrl } = creds;

    if (!appKey || !appToken || !getOrdersUrl) {
      console.warn(
        `[VTEX CRON GET ORDERS] OriginAccount="${cliente.OriginAccount}" sin credenciales VTEX completas, se omite.`
      );
      continue;
    }

    const dedupeKey = `${appKey}::${getOrdersUrl}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    accounts.push({
      appKey,
      appToken,
      baseUrl,
      getOrdersUrl,
      label: cliente.OriginAccount || baseUrl || appKey.slice(0, 20),
    });
  }

  return accounts;
}

/**
 * Recorre todos los marketplaces/cuentas VTEX activos y para cada uno:
 * - Consulta órdenes en la ventana de tiempo.
 * - Inserta pedidos nuevos.
 * - Actualiza pedidos existentes si cambiaron.
 * - Envía a Andesmar los no procesados.
 *
 * Devuelve un resumen global con contadores.
 */
export async function reconcileVtexOrders() {
  const accounts = await resolveVtexAccounts();

  if (!accounts.length) {
    console.warn("[VTEX CRON GET ORDERS] No hay cuentas VTEX con credenciales completas configuradas.");
    return { processed: 0, inserted: 0, updated: 0 };
  }

  const now = new Date();
  const windowHours = config.vtexCronGetOrder.window || 3;
  const from = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  console.log(
    `[VTEX CRON GET ORDERS] Iniciando reconciliación para ${accounts.length} cuenta(s). Ventana: ${from.toISOString()} -> ${now.toISOString()}`
  );

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const account of accounts) {
    console.log(`[VTEX CRON GET ORDERS] Procesando cuenta: ${account.label}`);
    try {
      const { processed, inserted, updated } = await reconcileAccount(account, { from, to: now });
      totalProcessed += processed;
      totalInserted += inserted;
      totalUpdated += updated;
    } catch (err) {
      console.error(`[VTEX CRON GET ORDERS] Error en cuenta ${account.label}:`, err.message);
    }
  }

  console.log(
    `[VTEX CRON GET ORDERS] Finalizado. Cuentas=${accounts.length}, Procesadas=${totalProcessed}, Insertadas=${totalInserted}, Actualizadas=${totalUpdated}`
  );

  return { processed: totalProcessed, inserted: totalInserted, updated: totalUpdated };
}
