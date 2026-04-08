import axios from 'axios'
import config from '../config/index.js'

/**
 * Crea un cliente Axios autenticado con credenciales VTEX específicas.
 * Usar una instancia por cuenta para soportar múltiples tiendas.
 *
 * @param {{ baseUrl: string, appKey: string, appToken: string }} credentials
 * @returns {import('axios').AxiosInstance}
 */
export function createVtexClient({ baseUrl, appKey, appToken }) {
  const client = axios.create({ baseURL: baseUrl, timeout: 15000 })
  client.interceptors.request.use((req) => {
    req.headers['X-VTEX-API-AppKey'] = appKey
    req.headers['X-VTEX-API-AppToken'] = appToken
    return req
  })
  return client
}

/**
 * Resuelve las credenciales VTEX para un registro ClienteVtex,
 * cayendo en fallback a las variables de entorno globales si no están en DB.
 *
 * @param {object} clienteVtex - instancia del modelo ClienteVtex
 * @returns {{ baseUrl: string, appKey: string, appToken: string, getOrdersUrl: string }}
 */
export function resolveVtexCredentials(clienteVtex) {
  return {
    baseUrl: clienteVtex.VtexBaseUrl || config.vtex.baseUrl,
    appKey: clienteVtex.VtexAppKey || config.vtex.appKey,
    appToken: clienteVtex.VtexAppToken || config.vtex.appToken,
    getOrdersUrl: clienteVtex.VtexGetOrdersUrl || config.vtexCronGetOrder.url,
  }
}

/**
 * Trae el SKU completo desde VTEX por ID.
 *
 * @param {string|number} skuId
 * @param {import('axios').AxiosInstance} vtexClient - cliente con credenciales de la cuenta
 */
export async function getSkuById(skuId, vtexClient) {
  const { data } = await vtexClient.get(`/api/catalog/pvt/stockkeepingunit/${skuId}`)
  return data
}
