const dbConfig = require("../config/dbConfig.js");
const { Sequelize, DataTypes } = require("sequelize");
const logger = require('../logger/logger');

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: dbConfig.dialect,
    // operatorsAliases: false,
    pool: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      acquire: dbConfig.pool.acquire,
      idle: dbConfig.pool.idle,
    },
    define: {
      timestamps: false,
    },
  }
);

sequelize
  .authenticate()
  .then(() => {
    logger.info("connected");
  })
  .catch((err) => {
    logger.error(err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("./userModel.js")(sequelize, DataTypes);
db.products = require("./productModel")(sequelize, DataTypes);
db.images = require("./imageModel")(sequelize, DataTypes);

// Define the relationship between Product and Image
// db.users.hasMany(db.products, { onDelete: 'CASCADE' });
// db.products.belongsTo(db.users);

// Define the relationship between Product and Image
db.products.hasMany(db.images, { onDelete: 'CASCADE' });
db.images.belongsTo(db.products);


db.sequelize
  .sync({ force: false })
  .then(() => {
    logger.info("sync done");
  })
  .catch((error) => {
    logger.error("Validation error: ", error);
  });

module.exports = db;
