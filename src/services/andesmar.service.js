import axios from 'axios'
import config from '../config/index.js'

const API_URL = 'https://apitest.andesmarcargas.com/api/CalcularMonto'

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

  const { data } = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Usuario': usuario,
      'Clave': clave,
    },
    timeout: config.andesmar.timeoutMs,
  })

  return data
}
