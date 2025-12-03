import { calcularMontoyDemora } from '../services/andesmar.service.js'
import { getSkuById } from '../services/vtex.service.js'
import db from '../models/index.js'
import config from '../config/index.js'

export const vtexController = {
  getPrice: async (req, res, next) => {
    try {
      const { items, postalCode, country } = req.body
      console.log('[VTEX] 🚚 Nueva simulación recibida:', { postalCode, items })

      // 1) Traemos info de cada item desde VTEX en paralelo
      const skuDetails = await Promise.all(
        items.map((it) => getSkuById(it.id))
      )

      // 2) Calculamos peso total, M3 total y armamos arrays de alto/ancho/largo
      //    teniendo en cuenta cantidades y posibles múltiples SKUs.
      let totalPeso = 0
      let totalM3 = 0
      // En el futuro: let totalValorDeclarado = 0

      const altos = []
      const anchos = []
      const largos = []

      skuDetails.forEach((sku, idx) => {
        const qty = Number(items[idx]?.quantity) || 0

        // Defaults razonables si VTEX no trae datos
        const pesoUnidadKg = Number(sku?.PackagedWeightKg ?? 1) // default 1kg

        const altoCm = Number(sku?.PackagedHeight ?? 10)
        const anchoCm = Number(sku?.PackagedWidth ?? 10)
        const largoCm = Number(sku?.PackagedLength ?? 10)

        // Volumen de UN bulto en m3 (asumiendo cm como unidad de VTEX)
        const m3Unidad =
          (altoCm / 100) *
          (anchoCm / 100) *
          (largoCm / 100)

        // Acumulamos peso y volumen por cantidad
        totalPeso += pesoUnidadKg * qty
        totalM3 += m3Unidad * qty

        // En el futuro:
        // const valorDeclaradoUnidad = Number(sku?.ValorDeclarado ?? 0)
        // totalValorDeclarado += valorDeclaradoUnidad * qty

        // Repetimos alto/ancho/largo tantas veces como cantidad de bultos de ese SKU
        for (let i = 0; i < qty; i++) {
          altos.push(altoCm)
          anchos.push(anchoCm)
          largos.push(largoCm)
        }
      })
      
      const clienteVtex = await db.ClienteVtex.findOne({
        where: { Seller: req.body.items?.[0]?.seller },
      })

      const CONFIG = {
        CodigoPostalRemitente: '1870',
        ModalidadEntregaID: 2,
        CodigoAgrupacion: 13,
            "logueo": {
        "Usuario": "ECS4083",
        "Clave": "ECS4083",
        "CodigoCliente": "4083"
    },
        // logueo: {      //cuando tenga saldo
        //   Usuario: clienteVtex.Usuario,
        //   Clave: clienteVtex.Clave,
        //   CodigoCliente: clienteVtex.CodigoCliente,
        // },
      }

      const payloadAndesmar = {
        CodigoPostalRemitente: CONFIG.CodigoPostalRemitente,
        CodigoPostalDestinatario: postalCode,
        Peso: totalPeso || 1,
        // En el futuro esto debería ser la suma real:
        // ValorDeclarado: totalValorDeclarado || 10000,
        ValorDeclarado: 10000, // TODO: sumar por item desde VTEX
        M3: totalM3 || 1,
        Alto: altos,
        Ancho: anchos,
        Largo: largos,
        ModalidadEntregaID: CONFIG.ModalidadEntregaID,
        servicio: {
          EsFletePagoDestino: false,
          EsRemitoconformado: false,
        },
        logueo: CONFIG.logueo,
        CodigoAgrupacion: CONFIG.CodigoAgrupacion,
      }

      console.log('[ANDESMAR] 📤 Consultando importe de envío:')
      console.log(JSON.stringify(payloadAndesmar, null, 2))
      console.time('[ANDESMAR] Tiempo')

      // 4) Consultamos a Andesmar con datos ya enriquecidos desde VTEX
      const montoYDemora = await calcularMontoyDemora(payloadAndesmar)

      const monto = montoYDemora.importe
      const demora = montoYDemora.demora

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
            shippingEstimate: demora,
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

  notify: async (req, res, next) => {
    const { Domain, OrderId, LastChange, Origin } = req.body;
    const { Account, Key } = Origin;
    const JsonString = JSON.stringify(req.body, 2)
    res.json({"asd": "SI"});
  },

  
  receive: async (req, res, next) => {
    console.log("TEST")
    console.log(req.body);

    // try {
    //   // Validar token del hook
    //   const auth = req.headers.authorization
    //   const [scheme, token] = auth.split(' ')
      
    //   if (!token || token !== config.vtex.hookAuthToken) {
    //     return res.status(401).json({ error: { message: 'Unauthorized' } })
    //   }

    //   // Extraer datos del JSON recibido
    //   const { Domain, OrderId, LastChange, Origin } = req.body
    //   const Account = Origin?.Account ?? null
    //   const Key = Origin?.Key ?? null

    //   const lastChangeDate = new Date(LastChange)

    //   await db.PedidosDesdeVtex.create({
    //     OrderId: OrderId,
    //     State: Domain,                     
    //     LastChange: lastChangeDate.toISOString(),
    //     OriginAccount: Account,
    //     OriginKey: Key,
    //     JsonCompleto: JSON.stringify(req.body),
    //     FechaRecepcion: new Date().toISOString(),        
    //     Procesado: false,
    //     FechaProcesado: null,
    //   })

    // } catch (err) {
    //   console.error('Error guardando hook de VTEX:', err.message)
    // }
      return res.sendStatus(200);

  }
}
