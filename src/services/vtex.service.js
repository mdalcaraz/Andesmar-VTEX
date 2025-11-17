import axios from 'axios'
import config from '../config/index.js'

const vtexClient = axios.create({
  baseURL: config.vtex.baseUrl,
  timeout: 15000,
})

// inyectamos credenciales en cada request
vtexClient.interceptors.request.use((req) => {
  req.headers['X-VTEX-API-AppKey'] = config.vtex.appKey
  req.headers['X-VTEX-API-AppToken'] = config.vtex.appToken
  return req
})

/**
 * Trae el SKU completo desde VTEX por ID.
 * @param {string|number} skuId
 */
export async function getSkuById(skuId) {
  const { data } = await vtexClient.get(`/api/catalog/pvt/stockkeepingunit/${skuId}`)
  return data
}
