import axios from 'axios'
import config from '../config/index.js'

const client = axios.create({
  baseURL: config.externalApi.baseURL,
  timeout: 10000
})

client.interceptors.request.use((req) => {
  if (config.externalApi.apiKey) {
    req.headers['x-api-key'] = config.externalApi.apiKey
  }
  return req
})

export async function getSampleResource() {
  const { data } = await client.get('/sample')
  return data
}
