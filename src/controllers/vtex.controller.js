import { calcularMonto } from '../services/andesmar.service.js'
import { getSkuById } from '../services/vtex.service.js'

export const vtexController = {
  getPrice: async (req, res, next) => {
    try {
      const { items, postalCode, country } = req.body
      console.log('[VTEX] 🚚 Nueva simulación recibida:', { postalCode, items: items.length })

      // 1) Traemos info de cada item desde VTEX en paralelo
      const skuDetails = await Promise.all(
        items.map((it) => getSkuById(it.id))
      )

      // 2) De los SKUs obtenemos medidas/peso. Si no hay, ponemos defaults.
      // Ojo: los nombres reales pueden variar según el endpoint y tu configuración.
      // Acá asumimos campos típicos.
      const totalPeso = skuDetails.reduce((acc, sku, idx) => {
        const qty = items[idx].quantity
        const peso = Number(sku?.WeightKg ?? 1) // default 1kg
        return acc + peso * qty
      }, 0)

      // Para volumen/M3: muchas veces VTEX da alto/ancho/largo en cm.
      // Andesmar recibe M3, así que hacemos una aproximación:
      const totalM3 = skuDetails.reduce((acc, sku, idx) => {
        const qty = items[idx].quantity
        const altoCm = Number(sku?.RealDimension?.Height ?? 10)
        const anchoCm = Number(sku?.RealDimension?.Width ?? 10)
        const largoCm = Number(sku?.RealDimension?.Length ?? 10)
        const m3Uno = (altoCm / 100) * (anchoCm / 100) * (largoCm / 100)
        return acc + m3Uno * qty
      }, 0)

      // 3) Config fija (esto debería venir de tu BD de clientes)
      const CONFIG = {
        CodigoPostalRemitente: '1870',
        ModalidadEntregaID: 2,
        CodigoAgrupacion: 13,
        logueo: {
          Usuario: 'ECS4083',
          Clave: 'ECS4083',
          CodigoCliente: '4083',
        },
      }

      // Andesmar espera arrays de alto/ancho/largo.
      // Podemos tomar el primero o mapear todos; por ahora tomamos el primero:
      const firstSku = skuDetails[0]
      const alto = Number(firstSku?.RealDimension?.Height ?? 10)
      const ancho = Number(firstSku?.RealDimension?.Width ?? 10)
      const largo = Number(firstSku?.RealDimension?.Length ?? 10)

      const payloadAndesmar = {
        CodigoPostalRemitente: CONFIG.CodigoPostalRemitente,
        CodigoPostalDestinatario: postalCode,
        Peso: totalPeso || 1,
        ValorDeclarado: 10000, // TODO: sacar de VTEX si lo tenés
        M3: totalM3 || 1,
        Alto: [alto],
        Ancho: [ancho],
        Largo: [largo],
        ModalidadEntregaID: CONFIG.ModalidadEntregaID,
        servicio: {
          EsFletePagoDestino: false,
          EsRemitoconformado: false,
        },
        logueo: CONFIG.logueo,
        CodigoAgrupacion: CONFIG.CodigoAgrupacion,
      }

      console.log('[ANDESMAR] 📤 Consultando importe de envio:')
      console.log(JSON.stringify(payloadAndesmar, null, 2))
      console.time('[ANDESMAR] Tiempo')

      // 4) Consultamos a Andesmar con datos ya enriquecidos desde VTEX
      const monto = await calcularMonto(payloadAndesmar)

      console.timeEnd('[ANDESMAR] Tiempo')
      console.log(`[ANDESMAR] ✅ ImporteTotal=${monto}`)

      const montoCentavos = Math.round(monto * 100)
      console.log(`[SIMULATION] 💰 Monto final (centavos): ${montoCentavos}`)

      // 5) Armamos respuesta VTEX
      const logisticsInfo = items.map((it, idx) => ({
        itemIndex: idx,
        quantity: it.quantity,
        shipsTo: [country],
        slas: [
          {
            id: 'andesmar-standard',
            name: 'Andesmar Estándar',
            deliveryChannel: 'delivery',
            shippingEstimate: '3bd',
            price: montoCentavos,
          },
        ],
        stockBalance: 10,
        deliveryChannels: [{ id: 'delivery', stockBalance: 10 }],
      }))

      const responseItems = items.map((it, i) => ({
        id: String(it.id),
        listPrice: montoCentavos,
        price: montoCentavos,
        measurementUnit: it.measurementUnit || 'un',
        quantity: it.quantity,
        requestIndex: i,
        seller: it.seller,
        unitMultiplier: it.unitMultiplier || 1,
      }))

      return res.json({
        country,
        items: responseItems,
        logisticsInfo,
        postalCode,
        allowMultipleDeliveries: false,
      })
    } catch (err) {
      next(err)
    }
  },
}
