// src/services/vtexOrdersStatusUpdate.service.js
import db from '../models/index.js'
import { createVtexClient, resolveVtexCredentials } from './vtex.service.js'
import { getEstadosPendientes, marcarEstadoEnviado } from './andesmar.service.js'

const LOG = '[VTEX CRON UPDATE STATUS]'

/**
 * Agrupa un array de filas por el valor de una clave.
 */
function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const val = row[key]
    if (!acc[val]) acc[val] = []
    acc[val].push(row)
    return acc
  }, {})
}

/**
 * Arma el payload del invoice para VTEX.
 * El número de guía de Andesmar (trackingCode) actúa como invoiceNumber.
 *
 * @param {object} fullOrder  - Objeto parseado de PedidosDesdeVtex.JsonCompleto
 * @param {string} trackingCode - Número de guía Andesmar (ej: "R527913138")
 */
function buildInvoicePayload(fullOrder, trackingCode) {
  const items = (fullOrder.items ?? []).map((item) => ({
    id: String(item.id ?? item.refId ?? ''),
    quantity: item.quantity ?? 1,
    price: item.price ?? 0,
  }))

  return {
    type: 'Output',
    issuanceDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: trackingCode,
    invoiceValue: fullOrder.value ?? 0,
    courier: 'Andesmar',
    trackingNumber: trackingCode,
    trackingUrl: `https://tracking.andesmar.com/${trackingCode}`,
    items,
  }
}

/**
 * Arma el payload de tracking para VTEX.
 * Todos los events de un mismo orderId se envían juntos en un solo PUT.
 *
 * @param {Array} events - Filas del SP para un mismo OrderId
 * @param {string} trackingCode - Número de guía Andesmar
 */
function buildTrackingPayload(events, trackingCode) {
  return {
    trackingNumber: trackingCode,
    trackingUrl: `https://tracking.andesmar.com/${trackingCode}`,
    isDelivered: events.some((e) => e.isDelivered === 1 || e.isDelivered === true),
    events: events.map((e) => ({
      city: e.city ?? '',
      state: e.state ?? '',
      description: e.description,
      date: new Date(e.date).toISOString(),
    })),
  }
}

/**
 * Consulta Andesmar por estados pendientes y los envía a VTEX.
 * Por cada OrderId:
 *   1. Si InvoiceEnviado=false: POST invoice usando el nro de guía como invoiceNumber
 *   2. PUT tracking a .../invoice/{nroGuia}/tracking
 *   3. Si OK: registra cada estado en EnvioEstadosVtex y marca InvoiceEnviado=true
 */
export async function updateVtexOrdersStatus() {
  let pendientes

  try {
    pendientes = await getEstadosPendientes()
  } catch (err) {
    console.error(`${LOG} Error ejecutando SP GetEstadosVtexPendientes:`, err.message)
    return { processed: 0 }
  }

  if (!pendientes.length) {
    console.log(`${LOG} No hay estados pendientes de enviar a VTEX.`)
    return { processed: 0 }
  }

  console.log(`${LOG} ${pendientes.length} estado(s) pendiente(s) encontrados.`)

  const byOrder = groupBy(pendientes, 'OrderId')
  let processed = 0

  for (const [orderId, events] of Object.entries(byOrder)) {
    try {
      // 1. Buscar la orden en nuestra DB
      const pedido = await db.PedidosDesdeVtex.findOne({ where: { OrderId: orderId } })
      if (!pedido) {
        console.warn(`${LOG} OrderId=${orderId} no encontrado en PedidosDesdeVtex, se omite.`)
        continue
      }

      // 2. Buscar clienteVtex para credenciales VTEX
      const clienteVtex = await db.ClienteVtex.findOne({
        where: { OriginAccount: pedido.OriginAccount, Activo: true },
      })
      if (!clienteVtex) {
        console.warn(
          `${LOG} No se encontró ClienteVtex para OriginAccount="${pedido.OriginAccount}" (orderId=${orderId}), se omite.`
        )
        continue
      }

      const creds = resolveVtexCredentials(clienteVtex)
      const commerceBaseUrl = creds.getOrdersUrl.replace('/api/oms/pvt/orders', '')
      const vtexClient = createVtexClient({
        baseUrl: commerceBaseUrl,
        appKey: creds.appKey,
        appToken: creds.appToken,
      })

      // El nro de guía Andesmar es el invoiceNumber y trackingNumber
      const trackingCode = events[0].trackingUrl

      // 3. POST invoice si todavía no se envió para esta orden
      if (!pedido.InvoiceEnviado) {
        const fullOrder = JSON.parse(pedido.JsonCompleto)
        const invoicePayload = buildInvoicePayload(fullOrder, trackingCode)

        console.log(`${LOG} POST invoice orderId=${orderId} invoiceNumber=${trackingCode}:`, JSON.stringify(invoicePayload))

        try {
          const invResponse = await vtexClient.post(
            `/api/oms/pvt/orders/${orderId}/invoice`,
            invoicePayload
          )
          console.log(
            `${LOG} Invoice OK orderId=${orderId} status=${invResponse.status}:`,
            JSON.stringify(invResponse.data)
          )
          await pedido.update({ InvoiceEnviado: true })
        } catch (invErr) {
          console.error(
            `${LOG} Error creando invoice orderId=${orderId}:`,
            invErr?.response?.status,
            JSON.stringify(invErr?.response?.data ?? invErr.message)
          )
          continue // sin invoice no podemos actualizar el tracking
        }
      }

      // 4. PUT tracking con todos los estados pendientes
      const trackingPayload = buildTrackingPayload(events, trackingCode)

      console.log(`${LOG} PUT tracking orderId=${orderId} invoiceNumber=${trackingCode}:`, JSON.stringify(trackingPayload))

      const trackResponse = await vtexClient.put(
        `/api/oms/pvt/orders/${orderId}/invoice/${trackingCode}/tracking`,
        trackingPayload
      )

      console.log(
        `${LOG} Tracking OK orderId=${orderId} status=${trackResponse.status}:`,
        JSON.stringify(trackResponse.data)
      )

      // 5. Marcar cada estado como enviado en Andesmar
      for (const event of events) {
        await marcarEstadoEnviado(event.GuiaID, event.description)
        console.log(`${LOG} Marcado enviado: GuiaID=${event.GuiaID} Estado=${event.description}`)
      }

      processed++

    } catch (err) {
      console.error(
        `${LOG} Error en orderId=${orderId}:`,
        err?.response?.status,
        JSON.stringify(err?.response?.data ?? err.message)
      )
    }
  }

  console.log(`${LOG} Finalizado. Órdenes actualizadas: ${processed}`)
  return { processed }
}
