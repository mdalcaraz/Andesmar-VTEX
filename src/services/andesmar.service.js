import axios from 'axios'
import { QueryTypes } from 'sequelize'
import config from '../config/index.js'
import sequelize from '../db/sequelize.js'

const API_URL = config.andesmar.calcularMontoUrl

/**
 * Consulta Andesmar y devuelve el monto total del envío.
 * @param {object} params - Datos requeridos por la API Andesmar
 */
export async function calcularMonto(params) {
  try {
    const { data } = await axios.post(API_URL, params, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    })
    if (data?.Codigo !== '200') {
      throw new Error(`Error Andesmar: ${data?.Error || 'Respuesta inválida'}`)
    }
    return Number(data.ImporteTotal) || 0
  } catch (err) {
    console.error('Error consultando Andesmar:', err.message)
    throw new Error('Fallo al obtener monto desde Andesmar')
  }
}

/**
 * Consulta Andesmar y devuelve el monto total del envío.
 * @param {object} params - Datos requeridos por la API Andesmar
 */
export async function calcularMontoyDemora(params) {
  try {
    const { data } = await axios.post(API_URL, params, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    })
    if (data?.Codigo !== '200') {
      throw new Error(`Error Andesmar: ${data?.Error || 'Respuesta inválida'}`)
    }
    console.log(JSON.stringify(data))
    console.log("calcularMonto: " + data.ImporteTotal);

    const importe =  Number(data.ImporteTotal);
    const demora = data?.TiempoEntrega || "";
    
    return {importe, demora}
  } catch (err) {
    console.error('Error consultando Andesmar:', err.message)
    throw new Error('Fallo al obtener monto desde Andesmar')
  }
}

/**
 * Envía un pedido a Andesmar para generar el remito.
 * @param {object} payload - JSON armado con buildAndesmarPayload
 * @param {string} usuario - Credencial Usuario de clienteVtex
 * @param {string} clave   - Credencial Clave de clienteVtex
 * @returns {object} Respuesta de Andesmar
 */
export async function insertarPedido(payload, usuario, clave) {
  const url = `${config.andesmar.baseUrl}${config.andesmar.insertarPedidoPath}`

  console.log(`[ANDESMAR] POST ${url}`)
  console.log('[ANDESMAR] Headers:', { Usuario: usuario, Clave: clave })
  console.log('[ANDESMAR] Payload:', JSON.stringify(payload, null, 2))

  const { data } = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Usuario': usuario,
      'Clave': clave,
    },
    timeout: config.andesmar.timeoutMs,
  })

  console.log('[ANDESMAR] Respuesta:', JSON.stringify(data, null, 2))

  return data
}

/**
 * Ejecuta el SP GetEstadosVtexPendientes y devuelve todos los estados
 * de envíos de Andesmar que aún no fueron enviados a VTEX.
 *
 * @returns {Array<{ description, trackingNumber, date, GuiaID, OrderId, city, state, trackingUrl, isDelivered, enviado }>}
 */
export async function getEstadosPendientes() {
  const results = await sequelize.query(
    'EXEC GetEstadosVtexPendientes',
    { type: QueryTypes.SELECT }
  )
  return results
}

/**
 * Registra un estado como enviado en la tabla EnvioEstadosVtex de Andesmar.
 * El SP GetEstadosVtexPendientes excluirá este registro en futuras corridas.
 *
 * @param {number} guiaId
 * @param {string} estado  - e.g. 'ENTREGADO', 'ENVIAJE', etc.
 */
export async function marcarEstadoEnviado(guiaId, estado) {
  await sequelize.query(
    'INSERT INTO EnvioEstadosVtex (GuiaID, Estado, FechaEnvio) VALUES (:guiaId, :estado, GETDATE())',
    { replacements: { guiaId, estado }, type: QueryTypes.INSERT }
  )
}
