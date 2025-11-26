# Andesmar -- Integración VTEX

API Node.js / Express para cotización y recepción de pedidos desde VTEX.

Este servicio implementa los endpoints necesarios para:\
- **Simular cotizaciones de envío (Shipping Simulation)**\
- **Recibir pedidos confirmados desde VTEX mediante Hooks**

------------------------------------------------------------------------

## 🚀 Requisitos previos

-   Node.js 22.21.0
-   Base de datos SQL Server configurada
-   Variables de entorno del proyecto (`.env`)
-   Token Bearer válido generado manualmente en endpoint

------------------------------------------------------------------------

## ▶️ Inicio rápido

Instalar dependencias:

``` bash
npm install
```

Iniciar el servidor:

``` bash
npm run dev
```

Por defecto, el servidor corre en:

    http://localhost:3000

------------------------------------------------------------------------

# 📦 **1. Cotización de Envío (Order Simulation)**

### **POST** `/api/vtex/pvt/orderForms/simulation`

### Headers obligatorios

    Accept: application/json
    Content-Type: application/json

### Body de ejemplo

``` json
{
  "items": [
    { "id": "1", "quantity": 2, "seller": "1" }
  ],
  "postalCode": "5521",
  "country": "ARG"
}
```

------------------------------------------------------------------------

# 🧾 **2. Recepción de Pedido (Hook de VTEX)**

### **POST** `/api/logistics/vtex/orders/hook`

Debe incluir un **Bearer Token**.

### Headers obligatorios

    Authorization: Bearer <TU_TOKEN>
    Content-Type: application/json

### Body de ejemplo

``` json
{
  "Domain": "Marketplace",
  "OrderId": "v40484048naf-012",
  "State": "payment-approved",
  "LastChange": "2019-07-29T23:17:30.0617185Z",
  "Origin": {
    "Account": "accountABC",
    "Key": "vtexappkey-keyEDF"
  }
}
```

------------------------------------------------------------------------

# 🔑 **3. Autenticación**

Configurar un token manualmente cuando se configura la tienda, utilizarlo luego para las peticiones

------------------------------------------------------------------------

# 🧪 Testing rápido con cURL

### Simulación de cotización

``` bash
curl -X POST http://localhost:3000/api/vtex/pvt/orderForms/simulation   -H "Content-Type: application/json"   -H "Accept: application/json"   -d '{"items":[{"id":"1","quantity":2,"seller":"1"}],"postalCode":"5521","country":"ARG"}'
```

### Hook --- creación de pedido

``` bash
curl -X POST http://localhost:3000/api/logistics/vtex/orders/hook   -H "Authorization: Bearer <TU_TOKEN>"   -H "Content-Type: application/json"   -d '{"Domain":"Marketplace","OrderId":"v40484048naf-012","State":"payment-approved","LastChange":"2019-07-29T23:17:30.0617185Z","Origin":{"Account":"accountABC","Key":"vtexappkey-keyEDF"}}'
```

------------------------------------------------------------------------

# 📚 **4. Flujo completo**

1.  **Checkout en VTEX** llama a `/pvt/orderForms/simulation`\
2.  **Confirmación del pedido** genera un hook hacia `/orders/hook`\
3.  El servicio registra el pedido y procesa la información.

------------------------------------------------------------------------

# 🧩 **5. Estructura del proyecto**

    /src
      /controllers
      /routes
      /services
      /models
    /config
    /database

