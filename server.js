const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const multer = require("multer");

const routers = require("./routes/userRouter.js");
app.use("/v1/user", routers);

const routersProduct = require("./routes/productRouter");
app.use("/v1/product", routersProduct);

const routersImage = require("./routes/imageRouter");
app.use("/v1/product", routersImage);

var portfinder = require("portfinder");

portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () => console.log(`Server Started on port ${port}...`));
});

app.get("/healthz", async (req, res) => {
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
