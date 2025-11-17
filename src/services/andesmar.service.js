import axios from 'axios'

const API_URL = 'https://api.andesmarcargas.com/api/CalcularMonto'

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
    console.log("calcularMonto: " + data.ImporteTotal);
    return Number(data.ImporteTotal) || 0
  } catch (err) {
    console.error('Error consultando Andesmar:', err.message)
    throw new Error('Fallo al obtener monto desde Andesmar')
  }
}
