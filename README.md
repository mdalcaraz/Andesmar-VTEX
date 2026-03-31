# Andesmar — Integración VTEX

---

## Descripción funcional

Este sistema actúa como capa de integración entre la plataforma de e-commerce **VTEX** y los sistemas logísticos de **Andesmar Cargas**. Su función principal es automatizar el flujo de pedidos generados en la tienda online, desde la cotización del envío hasta la generación del remito en Andesmar.

El sistema corre como un servicio web independiente (API) y opera de forma continua en segundo plano.

---

## ¿Qué hace este sistema?

### 1. Cotización de envío en tiempo real
Cuando un comprador ingresa su código postal en el checkout de VTEX, el sistema consulta automáticamente a la API de Andesmar para calcular el costo y tiempo estimado de entrega. El resultado se muestra al comprador antes de que confirme la compra.

### 2. Recepción de pedidos confirmados
Cuando un pedido se confirma en VTEX, la plataforma notifica automáticamente a este sistema mediante un webhook. El pedido queda registrado en la base de datos interna para su procesamiento.

### 3. Sincronización periódica de pedidos
Cada 45 minutos, el sistema consulta la API de VTEX para recuperar pedidos dentro de una ventana de tiempo configurable. Si detecta pedidos nuevos o con cambios, los registra o actualiza en la base de datos.

### 4. Generación automática de remitos en Andesmar
Una vez registrado un pedido, el sistema arma automáticamente el payload requerido por Andesmar (datos del destinatario, dimensiones, peso, valor declarado, credenciales del cliente, etc.) y lo envía al endpoint correspondiente. Si el envío es exitoso, el pedido queda marcado como procesado. Si falla, reintenta en la próxima corrida del cron.

### 5. Actualización de estados (en desarrollo)
Se contempla un proceso adicional que consultará periódicamente el estado de los envíos en Andesmar para actualizar el tracking dentro de VTEX.

---

## Componentes principales

| Componente | Descripción |
|---|---|
| API REST | Expone los endpoints que VTEX consume (cotización y webhook) |
| Base de datos SQL Server | Almacena clientes configurados y pedidos recibidos |
| Cron de reconciliación | Sincroniza pedidos desde VTEX cada 45 minutos |
| Cron de estados | Actualización de tracking (pendiente de implementación) |

---

## Requisitos de infraestructura

- Node.js 22 o superior
- SQL Server (instancia accesible por red)
- Acceso a la API de VTEX (AppKey + AppToken)
- Acceso a la API de Andesmar (credenciales por cliente)
- Puerto expuesto públicamente para recibir webhooks de VTEX

---

## Q&A — Preguntas frecuentes (equipo técnico Andesmar)

**¿A qué endpoint de Andesmar se envían los pedidos?**
Al endpoint `POST /api/InsertPedidoMulti` de la API de Andesmar. Las credenciales (`Usuario` y `Clave`) se envían como headers HTTP y corresponden a las configuradas por cliente en la base de datos.

**¿Qué pasa si el endpoint de Andesmar no responde o devuelve error?**
El pedido queda marcado como no procesado (`Procesado = false`) en la base de datos. En la próxima ejecución del cron (45 minutos), el sistema detecta que no fue enviado y reintenta automáticamente.

**¿Puede enviarse el mismo pedido dos veces?**
No. Una vez que Andesmar responde con éxito, el pedido queda marcado como procesado y el sistema no vuelve a enviarlo, incluso si el cron lo detecta nuevamente.

**¿Cómo se asocia un pedido de VTEX a un cliente de Andesmar?**
Cada pedido trae el identificador de la cuenta VTEX (`OriginAccount`). En la base de datos existe una tabla `clienteVtex` que relaciona esa cuenta con las credenciales y configuración de Andesmar correspondiente (código postal remitente, modalidad de entrega, usuario, clave, etc.).

**¿Qué datos del pedido se envían a Andesmar?**
Dirección y datos del destinatario (nombre, CP, calle, teléfono, mail, provincia, localidad), dimensiones y peso de los productos, valor declarado, cantidad de bultos, y los datos de configuración del remitente según el cliente configurado.

**¿Dónde se guardan los pedidos recibidos?**
En la tabla `PedidosDesdeVtex` de la base de datos SQL Server. Se almacena el JSON completo del pedido tal como lo entrega VTEX, junto con el estado de procesamiento.

**¿Cómo se configura un nuevo cliente/tienda?**
Se debe insertar un registro en la tabla `clienteVtex` con las credenciales de Andesmar, el código postal remitente, la modalidad de entrega, y el identificador de cuenta VTEX (`OriginAccount`). No requiere cambios en el código.

**¿El sistema soporta múltiples tiendas o sellers?**
Sí. La tabla `clienteVtex` puede tener múltiples registros, uno por cada tienda o seller configurado. El sistema selecciona automáticamente la configuración correcta según el pedido recibido.

**¿Qué tecnologías usa el sistema?**
Node.js con Express, Sequelize ORM sobre SQL Server, y comunicación HTTP con las APIs de VTEX y Andesmar mediante axios.

**¿Dónde se ven los logs de ejecución?**
En la salida estándar del proceso (consola/stdout). Para ambientes productivos se recomienda configurar un gestor de logs o redirigir la salida a un archivo. Esto no está incluido en el alcance actual del desarrollo.

---

## Checklist de pasaje a producción

Antes de pasar a un ambiente de test o producción, verificar y actualizar las siguientes variables en el archivo `.env`:

| Variable | Valor en desarrollo | Acción para producción |
|---|---|---|
| `VTEX_GET_ORDERS_USE_TEST_WINDOW` | `true` | Cambiar a `false` |
| `ANDESMAR_CALCULAR_MONTO_URL` | URL de apitest | Reemplazar por la URL productiva de Andesmar |
| `ANDESMAR_GENERATED_TOKEN` | `tokendePrueba` | Reemplazar por un token seguro generado ad-hoc |
| `NODE_ENV` | `development` | Cambiar a `production` |
| `DB_HOST` / `DB_INSTANCE` | Instancia local | Apuntar a la instancia SQL Server de producción |

---

## Estructura de tablas requeridas

El sistema requiere dos tablas en la base de datos. La estructura esperada es:

### `clienteVtex`

| Campo | Tipo | Descripción |
|---|---|---|
| `ClienteVtexID` | INT (PK, autoincrement) | Identificador interno |
| `Seller` | VARCHAR(10) | ID del seller en VTEX |
| `ClienteID` | INT | ID del cliente en Andesmar |
| `CodigoCliente` | VARCHAR(10) | Código de cliente Andesmar |
| `CodigoPostalRemitente` | VARCHAR(10) | CP de origen del envío |
| `Usuario` | VARCHAR(50) | Usuario API Andesmar |
| `Clave` | VARCHAR(50) | Clave API Andesmar |
| `CodigoAgrupacion` | INT | Código de agrupación Andesmar |
| `ModalidadEntregaID` | INT | ID de modalidad de entrega |
| `EsFletePagoDestino` | BIT | Flete pago en destino |
| `EsRemitoconformado` | BIT | Remito conformado |
| `CalleRemitente` | VARCHAR(150) | Calle del remitente |
| `CalleNroRemitente` | INT | Número de calle del remitente |
| `OriginAccount` | VARCHAR(100) | Cuenta VTEX asociada |
| `FechaAlta` | DATETIME | Fecha de alta del registro |
| `Activo` | BIT | Habilita/deshabilita el cliente |

### `PedidosDesdeVtex`

| Campo | Tipo | Descripción |
|---|---|---|
| `PedidoDesdeVtexID` | INT (PK, autoincrement) | Identificador interno |
| `OrderId` | VARCHAR(50) | ID del pedido en VTEX |
| `State` | VARCHAR(50) | Estado del pedido |
| `LastChange` | VARCHAR(24) | Última modificación (ISO 8601) |
| `OriginAccount` | VARCHAR(100) | Cuenta VTEX de origen |
| `OriginKey` | VARCHAR(150) | Clave de origen |
| `JsonCompleto` | TEXT | JSON completo del pedido (VTEX) |
| `FechaRecepcion` | VARCHAR(24) | Fecha en que fue recibido |
| `Procesado` | BIT (default 0) | Indica si fue enviado a Andesmar |
| `FechaProcesado` | VARCHAR(24) | Fecha en que fue procesado |

---

## Alcance de este desarrollo

Este documento cubre la funcionalidad entregada. Cualquier modificación, extensión, integración adicional o soporte técnico fuera de lo descripto requiere cotización de horas de desarrollo.

---

## Inicio rápido

Instalar dependencias:

```bash
npm install
```

Iniciar en modo desarrollo:

```bash
npm run dev
```

El servidor corre por defecto en `http://localhost:3000`.

---

## Endpoints expuestos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/vtex/pvt/orderForms/simulation` | Cotización de envío (llamado por VTEX checkout) |
| POST | `/api/logistics/vtex/orders/hook` | Recepción de pedidos confirmados (webhook VTEX) |

---

## Variables de entorno requeridas

Ver archivo `env.example` incluido en el proyecto.

---

## Modo de prueba — ventana de tiempo fija

Por defecto, el cron de reconciliación consulta pedidos de las últimas N horas. Para pruebas, se puede forzar un rango de fechas fijo sin importar cuándo corre el proceso:

```env
# Activar ventana fija (true = ignora la ventana dinámica)
VTEX_GET_ORDERS_USE_TEST_WINDOW=true

# Rango de fechas fijo a consultar
VTEX_GET_ORDERS_TEST_FROM=2024-12-03T13:59:39.000Z
VTEX_GET_ORDERS_TEST_TO=2026-12-03T15:59:39.000Z
```

Con `VTEX_GET_ORDERS_USE_TEST_WINDOW=true` el sistema siempre busca pedidos dentro de ese rango, independientemente de la fecha y hora actual. Para volver al comportamiento normal, setear la variable en `false`.
