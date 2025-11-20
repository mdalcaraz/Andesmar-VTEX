// src/models/pedidosDesdeVtex.model.js
import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

const PedidosDesdeVtex = sequelize.define(
  "PedidosDesdeVtex",
  {
    PedidoDesdeVtexID: {
      type: DataTypes.INTEGER, // DataType=3
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    OrderId: {
      type: DataTypes.STRING(50), // DataType=27, LengthSet=50
      allowNull: false,
    },
    State: {
      type: DataTypes.STRING(50), // DataType=27, LengthSet=50
      allowNull: false,
    },
    LastChange: {
      type: DataTypes.STRING(24),
      allowNull: true,
    },
    OriginAccount: {
      type: DataTypes.STRING(100), // DataType=27, LengthSet=100
      allowNull: true,
    },
    OriginKey: {
      type: DataTypes.STRING(150), // DataType=27, LengthSet=150
      allowNull: true,
    },
    JsonCompleto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    FechaRecepcion: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    Procesado: {
      type: DataTypes.BOOLEAN, // DataType=50 (bit) default (0)
      allowNull: false,
      defaultValue: false,
    },
    FechaProcesado: {
      type: DataTypes.DATE, // DataType=19, AllowNull=1
      allowNull: true,
    },
  },
  {
    tableName: "PedidosDesdeVtex", // nombre exacto de la tabla en SQL
    freezeTableName: true,    // no pluraliza
    timestamps: false, // ya manejás fechas manualmente
  }
);

export default PedidosDesdeVtex;
