const db = require("../model");
const bcrypt = require("bcrypt");
const { products } = require("../model");
const isEmail = require("./userController");
const imageController = require("./imageController");
const AWS = require("aws-sdk");
const awsConfig = require("../config/awsConfig");
const Product = db.products;
const User = db.users;
const Image = db.images;
const logger = require('../logger/logger');
const statsdClient = require('../statsd/statsd');

const awsBucketName = awsConfig.awsBucketName;
const s3 = new AWS.S3({
  region: awsConfig.region,
});

const addproduct = async (req, res) => {
  statsdClient.increment('products.post');
  logger.info('--Add Product Start--');
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.error("Unauthorized");
    res.status(401).send("Unauthorized");
  } else {
    logger.info("--User Auth Check Start--");
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.error("Authentication Failed, Please enter a valid email");
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.warn("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.info("Authorization Successful!");
            const allowedParams = [
              "name",
              "description",
              "sku",
              "manufacturer",
              "quantity",
            ];
            const receivedParams = Object.keys(req.body);
            const unwantedParams = receivedParams.filter(
              (param) => !allowedParams.includes(param)
            );
            const notReceivedParams = allowedParams.filter(
              (param) => !receivedParams.includes(param)
            );

            if (unwantedParams.length) {
              logger.error(`The following parameters are not allowed: ${unwantedParams.join(
                ", "
              )}`);
              res.status(400).send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                  ", "
                )}`,
              });
            } else if (notReceivedParams.length) {
              logger.error(`The following required parameters are not received: ${notReceivedParams.join(
                ", "
              )}`);
              res.status(400).send({
                error: `The following required parameters are not received: ${notReceivedParams.join(
                  ", "
                )}`,
              });
            } else {
              logger.info("--Validations--");
              const name = req.body.name;
              const description = req.body.description;
              const sku = req.body.sku;
              const manufacturer = req.body.manufacturer;
              const quantity = req.body.quantity;
              if (name == undefined || name == null || name == "") {
                logger.error("Product Name is required!");
                res.status(400).send("Product Name is required!");
              } else if (
                description == undefined ||
                description == null ||
                description == ""
              ) {
                logger.error("Product description is required!");
                res.status(400).send("Product description is required!");
              } else if (sku == undefined || sku == null) {
                logger.error("Product sku is required!");
                res.status(400).send("Product sku is required!");
              } else if (
                manufacturer == undefined ||
                manufacturer == null ||
                manufacturer == ""
              ) {
                logger.error("Product manufacturer is required!");
                res.status(400).send("Product manufacturer is required!");
              } else if (
                quantity == undefined ||
                quantity == null ||
                quantity == ""
              ) {
                logger.error("Product quantity is required!");
                res.status(400).send("Product quantity is required!");
              } else if (
                !(typeof quantity === "number" && Number.isInteger(quantity))
              ) {
                logger.error("Product quantity needs to be Integer!");
                res.status(400).send("Product quantity needs to be Integer!");
              } else if (quantity < 0 || quantity > 100) {
                logger.error("Product quantity needs to be between 0 to 100!");
                res
                  .status(400)
                  .send("Product quantity needs to be between 0 to 100!");
              } else {
                searchProduct(sku).then((productDetails) => {
                  if (productDetails) {
                    logger.error("Product SKU already exists");
                    res.status(400).send("Product SKU already exists");
                  } else {
                    let newProduct = {
                      name: req.body.name,
                      description: req.body.description,
                      sku: req.body.sku,
                      manufacturer: req.body.manufacturer,
                      quantity: req.body.quantity,
                      owner_user_id: userDetails.id,
                    };
                    createProduct(newProduct).then((product) => {
                      let createdProductDetails = product.dataValues;
                      logger.info("Product Created!");
                      logger.info(createdProductDetails);
                      res.status(201).send({
                        id: createdProductDetails.id,
                        name: createdProductDetails.name,
                        description: createdProductDetails.description,
                        sku: createdProductDetails.sku,
                        manufacturer: createdProductDetails.manufacturer,
                        quantity: createdProductDetails.quantity,
                        date_added: createdProductDetails.date_added,
                        date_last_updated:
                          createdProductDetails.date_last_updated,
                        owner_user_id: createdProductDetails.owner_user_id,
                      });
                    });
                  }
                });
              }
            }
          } else {
            logger.error("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
    //User Auth Check End
  }
};

const getproduct = async (req, res) => {
  statsdClient.increment('products.get');
  logger.info("--Get Product Start--");
  const productId = req.params.productId;
  logger.info("productId:"+productId);
  const prod = await Product.findOne({ where: { id: productId } }).then(
    (prod) => {
      if (prod == null) {
        logger.error("Product Not Found");
        res.status(404).send("Product Not Found");
      } else {
        logger.info(prod);
        res.status(200).send({
          id: prod.id,
          name: prod.name,
          description: prod.description,
          sku: prod.sku,
          manufacturer: prod.manufacturer,
          quantity: prod.quantity,
          date_added: prod.date_added,
          date_last_updated: prod.date_last_updated,
          owner_user_id: prod.owner_user_id,
        });
      }
    }
  );
};

const patchproduct = async (req, res) => {
  statsdClient.increment('products.patch');
  logger.info("--Patch Product Start--");
  const productId = req.params.productId;
  logger.info("productId:"+productId);
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.error("Unauthorized");
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.error("Authentication Failed, Please enter a valid email");
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.error("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.info("Authorization Successful!");
            searchProductWithId(productId).then((product) => {
                if(product == null){
                    logger.error("Product Not Found");
                    res.status(400).send("Product Not Found");
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  logger.error(`The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                  )}`);
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                }
                else {
                  let name = req.body.name;
                  let description = req.body.description;
                  let sku = req.body.sku;
                  let manufacturer = req.body.manufacturer;
                  let quantity = req.body.quantity;
                  if (
                    receivedParams.includes("name") &&
                    (name == null || name == "")
                  ) {
                    logger.error("Product Name cannot be null!");
                    res.status(400).send("Product Name cannot be null!");
                  } else if (
                    receivedParams.includes("description") &&
                    (description == null || description == "")
                  ) {
                    logger.error("Product description is required!");
                    res.status(400).send("Product description is required!");
                  } else if (
                    receivedParams.includes("sku") &&
                    (sku == "" || sku == null)
                  ) {
                    logger.error("Product sku is required!");
                    res.status(400).send("Product sku is required!");
                  } else if (
                    receivedParams.includes("manufacturer") &&
                    (manufacturer == null || manufacturer == "")
                  ) {
                    logger.error("Product manufacturer is required!");
                    res.status(400).send("Product manufacturer is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    (quantity == null || quantity == "")
                  ) {
                    logger.error("Product quantity is required!");
                    res.status(400).send("Product quantity is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    logger.error("Product quantity needs to be Integer!");
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                  } else if (quantity < 0 || quantity > 100) {
                    logger.error("Product quantity needs to be between 0 to 100!");
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        logger.error("Product not found");
                        res.status(403).send("Product not found");
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        logger.error("Forbidden");
                        res.status(403).send("Forbidden");
                      } else {
                        if (name == undefined) name = productDetails.name;
                        if (description == undefined)
                          description = productDetails.description;
                        if (manufacturer == undefined)
                          manufacturer = productDetails.manufacturer;
                        if (sku == undefined) sku = productDetails.sku;
                        if (quantity == undefined)
                          quantity = productDetails.quantity;
                        let newProduct = {
                          id: productId,
                          name: name,
                          description: description,
                          sku: sku,
                          manufacturer: manufacturer,
                          quantity: quantity,
                        };
                        searchProduct(sku).then((prod) => {
                          if (prod && receivedParams.includes("sku") && prod.id!=productId) {
                            logger.error("Product SKU already exists");
                            res.status(400).send("Product SKU already exists");
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              logger.info("Product Updated");
                              logger.info(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                logger.error("Forbidden");
                res.status("Forbidden").sendStatus(403);
              }
            });
          } else {
            logger.error("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

const updateproduct = async (req, res) => {
  statsdClient.increment('products.put');
  logger.info("--Update Product Start--")
  const productId = req.params.productId;
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.error("Unauthorized");
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.error("Authentication Failed, Please enter a valid email");
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.error("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.info("Authorization Successful!");
            searchProductWithId(productId).then((product) => {
                if(product == null){
                  logger.info("Product Not Found");
                    res.status(400).send("Product Not Found");
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  logger.error(`The following parameters are not allowed: ${unwantedParams.join(
                    ", "
                  )}`);
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                } else if (notReceivedParams.length) {
                  logger.error(`The following required parameters are not received: ${notReceivedParams.join(
                    ", "
                  )}`);
                  res.status(400).send({
                    error: `The following required parameters are not received: ${notReceivedParams.join(
                      ", "
                    )}`,
                  });
                } else {
                  const name = req.body.name;
                  const description = req.body.description;
                  const sku = req.body.sku;
                  const manufacturer = req.body.manufacturer;
                  const quantity = req.body.quantity;
                  if (name == undefined || name == null || name == "") {
                    logger.error("Product Name is required!");
                    res.status(400).send("Product Name is required!");
                  } else if (
                    description == undefined ||
                    description == null ||
                    description == ""
                  ) {
                    logger.error("Product description is required!");
                    res.status(400).send("Product description is required!");
                  } else if (sku == undefined || sku == null || sku == "") {
                    logger.error("Product sku is required!");
                    res.status(400).send("Product sku is required!");
                  } else if (
                    manufacturer == undefined ||
                    manufacturer == null ||
                    manufacturer == ""
                  ) {
                    logger.error("Product manufacturer is required!");
                    res.status(400).send("Product manufacturer is required!");
                  } else if (
                    quantity == undefined ||
                    quantity == null ||
                    quantity == ""
                  ) {
                    logger.error("Product quantity is required!");
                    res.status(400).send("Product quantity is required!");
                  } else if (
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    logger.error("Product quantity needs to be Integer!");
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                  } else if (quantity < 0 || quantity > 100) {
                    logger.error("Product quantity needs to be between 0 to 100!");
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        logger.error("Product not found");
                        res.status(403).send("Product not found");
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        logger.error("Forbidden");
                        res.status(403).send("Forbidden");
                      } else {
                        let newProduct = {
                          id: productId,
                          name: req.body.name,
                          description: req.body.description,
                          sku: req.body.sku,
                          manufacturer: req.body.manufacturer,
                          quantity: req.body.quantity,
                        };
                        logger.info("--Search Product With SKU:"+sku);
                        searchProduct(sku).then((prod) => {
                          if (prod!=null && prod.id!=productId) {
                            logger.error("Product SKU already exists");
                            res.status(400).send("Product SKU already exists");
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              logger.info("Product Updated");
                              logger.info(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                logger.error("Forbidden");
                res.status("Forbidden").sendStatus(403);
              }
            });
          } else {
            logger.error("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

const deleteproduct = async (req, res) => {
  statsdClient.increment('products.delete');
  logger.info("--Delete Product Start--");
  let pId = req.params.productId;
  logger.info("Product Id:"+pId);
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.error("Unauthorized");
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.error("Authentication Failed, Please enter a valid email");
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.error("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authsuc = result;
          if (authsuc) {
            logger.info("Authentication Successful");
            searchProductWithId(pId).then((productDetails) => {
              if (productDetails == null) {
                logger.info("Product Not Found");
                res.status(404).send("not found");
              } else if (productDetails.owner_user_id == userDetails.id) {

                logger.info("deleteImagesInS3WithProductId Start");
                deleteImagesInS3WithProductId(pId).then(()=>{
                  deleteProduct(pId).then((rt) => res.sendStatus(204));
                });
                
              } else {
                logger.error("Forbidden");
                res.status(403).send("forbidden");
              }
            });
          } else {
            logger.error("unauthorized");
            res.status(401).send("unauthorized");
          }
        });
      }
    }
  }
};

const searchProduct = async (sku) => {
  logger.info("--Search product with SKU:"+sku);
  const productDetails = await Product.findOne({
    where: {
      sku: sku,
    },
  });
  logger.info(productDetails);
  return productDetails;
};

const searchProductWithId = async (id) => {
  logger.info("--Search product with id:"+id);
  const productDetails = await Product.findOne({
    where: {
      id: id,
    },
  });
  logger.info(productDetails);
  return productDetails;
};

const createProduct = async (prod) => {
  const product = await Product.create(prod);
  return product;
};

const updateProduct = async (prod) => {
  const updatedProd = Product.update(prod, {
    where: {
      id: prod.id,
    },
  });
  return updatedProd;
};

const deleteProduct = async (id) => {
    await Product.destroy({
        where: { id: id },
    })
    return true;
};

// const deleteImagesInS3WithProductId = async (productId) => {
//   getAllImagesByProduct(productId).then((imagesList) => {
//     imagesList.forEach((image) => {
//       s3.deleteObject({
//         Bucket: awsBucketName,
//         Key: image.file_name,
//       }).promise();
//     });
//   });
// };

const deleteImagesInS3WithProductId = async (productId) => {
  try {
    const imagesList = await getAllImagesByProduct(productId);
    const promises = imagesList.map((image) => {
      return s3.deleteObject({
        Bucket: awsBucketName,
        Key: image.file_name,
      }).promise();
    });
    await Promise.all(promises);
    logger.info(`Successfully deleted all images for product ID: ${productId}`);
  } catch (err) {
    logger.error(`Error deleting images for product ID ${productId}: ${err}`);
  }
};

const getAllImagesByProduct = async (productId) => {
  logger.info("--getAllImagesByProduct by id:"+productId);
  const imagesList = await Image.findAll({
    where: {
      product_id: productId,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  });
  logger.info(imagesList);
  return imagesList;
};

module.exports = {
  addproduct,
  updateproduct,
  patchproduct,
  getproduct,
  deleteproduct,
  searchProductWithId
};
