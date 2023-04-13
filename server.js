const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const multer = require("multer");
const logger = require('../webapp/logger/logger');
const statsdClient = require('../webapp/statsd/statsd');

const routers = require("./routes/userRouter.js");
app.use("/v1/user", routers);

const routersProduct = require("./routes/productRouter");
app.use("/v1/product", routersProduct);

const routersImage = require("./routes/imageRouter");
app.use("/v1/product", routersImage);

var portfinder = require("portfinder");

portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () => logger.info(`Server Started on port ${port}...`));
});

app.get("/healthz", async (req, res) => {
  const start = process.hrtime();
  logger.info("Healthz Check");
  statsdClient.increment('healthz.get');
  const durationInMs = process.hrtime(start)[1] / 1000000;
  statsdClient.timing('healthz_response_time', durationInMs);
  res.status(200).send("OK");
});

app.get("/health", async (req, res) => {
  const start = process.hrtime();
  logger.info("Health Check");
  statsdClient.increment('health.get');
  const durationInMs = process.hrtime(start)[1] / 1000000;
  statsdClient.timing('health_response_time', durationInMs);
  res.status(200).send("OK");
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: 'Invalid field name for file upload' });
  } else {
    next(err);
  }
});

app.use((err, req, res, next) => {
  if (err) {
    res.status(err.status || 500);
    res.json({ error: err.message });
  }
});

module.exports = app;
