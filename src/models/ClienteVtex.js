// models/ClienteVtex.js
import { DataTypes } from 'sequelize'
import sequelize from '../db/sequelize.js' 

const ClienteVtex = sequelize.define(
  'ClienteVtex',
  {
    ClienteVtexID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Seller: {
      type: DataTypes.STRING(10), // en tu ejemplo: '1'
      allowNull: false,
    },
    ClienteID: {
      type: DataTypes.INTEGER, // 3958
      allowNull: false,
    },
    CodigoCliente: {
      type: DataTypes.STRING(10), // 4320
      allowNull: false,
    },
    CodigoPostalRemitente: {
      type: DataTypes.STRING(10), // 1870
      allowNull: false,
    },
    Usuario: {
      type: DataTypes.STRING(50), // GSE4320
      allowNull: false,
    },
    Clave: {
      type: DataTypes.STRING(50), // GSE4320
      allowNull: false,
    },
    CodigoAgrupacion: {
      type: DataTypes.INTEGER, // 13
      allowNull: false,
    },
    ModalidadEntregaID: {
      type: DataTypes.INTEGER, // 2
      allowNull: false,
    },
    EsFletePagoDestino: {
      type: DataTypes.BOOLEAN, // 0/1 en DB
      allowNull: false,
    },
    EsRemitoconformado: {
      type: DataTypes.BOOLEAN, // 0/1
      allowNull: false,
    },
    FechaAlta: {
      type: DataTypes.DATE, // 2025-11-06 12:07:01.967
      allowNull: false,
    },
    Activo: {
      type: DataTypes.BOOLEAN, // 0/1
      allowNull: false,
    },
    CalleRemitente: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    CalleNroRemitente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    OriginAccount: {
      type: DataTypes.STRING(100), // DataType=27, LengthSet=100
      allowNull: true,
    },
    // Credenciales VTEX por cuenta (multi-tenant)
    VtexBaseUrl: {
      type: DataTypes.STRING(200), // e.g. https://mitienda.myvtex.com
      allowNull: true,
    },
    VtexAppKey: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    VtexAppToken: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    VtexGetOrdersUrl: {
      type: DataTypes.STRING(200), // e.g. https://mitienda.vtexcommercestable.com.br/api/oms/pvt/orders
      allowNull: true,
    },
  },
  {
    tableName: 'clienteVtex', // 👈 poné exactamente el nombre físico de la tabla
    freezeTableName: true,    // no pluraliza
    timestamps: false,        // la tabla ya tiene su propia FechaAlta
  }
)

export default ClienteVtex
