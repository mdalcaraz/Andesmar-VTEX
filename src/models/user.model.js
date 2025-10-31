import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(120),
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'user'
    }
  }, {
    tableName: 'Users',
    timestamps: true,
    underscored: true
  })
  return User
}
