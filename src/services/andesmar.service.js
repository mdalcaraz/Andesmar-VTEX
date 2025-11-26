import axios from 'axios'

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
