const express = require("express");
const bcrypt = require("bcrypt");
var cors = require("cors");
const app = express();
const mysql = require("mysql");
var portfinder = require("portfinder");
var bodyParser = require("body-parser");
app.use(cors());
app.use(bodyParser.json());
require("dotenv").config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
// const DB_PORT = process.env.DB_PORT;

const db = mysql.createPool({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log(" connected successful: " + connection.threadId);
});

portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () => console.log(`Server Started on port ${port}...`));
});

let encryptedPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

//CREATE USER
app.post("/v1/user", async (req, res) => {
  const email = req.body.username;
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const hashedPassword = encryptedPassword(req.body.password);

  console.log(email);

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM userDB.users WHERE email = ?";
    const search_query = mysql.format(sqlSearch, [email]);

    const sqlInsert =
      "INSERT INTO userDB.users(first_name,last_name,email,password) VALUES (?,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [
      firstName,
      lastName,
      email,
      hashedPassword,
    ]);

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("-> Search Results");
      console.log(result.length);
      if (result.length != 0) {
        // db.end();
        console.log("-> User Already Exists");
        res.sendStatus(409);
      } else {
        await connection.query(insert_query, (err, result) => {
          //   db.end();
          if (err) throw err;
          console.log("-> Created New User");
          console.log(result.insertId);
          res.sendStatus(201);
        });
      }
    });
  });
});

//GET USER
app.get("/v1/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  let authheader = req.headers.authorization;
  var auth = new Buffer.from(authheader.split(" ")[1], "base64")
    .toString()
    .split(":");
  var username = auth[0];
  var password = auth[1];

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM userDB.users WHERE user_id = ?";
    const search_query = mysql.format(sqlSearch, [userId]);

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("------> Search Results");
      console.log(result.length);
      if (result.length == 0) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(404);
      } else {
        bcrypt.compare(password, result[0].password, (err, resu) => {
          if (err) throw err;
          if (resu && username == result[0].email) {
            console.log("Authentication Successful");
            console.log(resu);
            res.status(200).send({
              user_id: result[0].user_id,
              first_name: result[0].first_name,
              last_name: result[0].last_name,
              username: result[0].email,
            });
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    });
  });
});

//UPDATE USER
app.put("/v1/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log("userid:" + userId);
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const hashedPassword = encryptedPassword(req.body.password);

  let authheader = req.headers.authorization;
  var auth = new Buffer.from(authheader.split(" ")[1], "base64")
    .toString()
    .split(":");
  var username = auth[0];
  var password = auth[1];

  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM userDB.users WHERE user_id = ?";
    const search_query = mysql.format(sqlSearch, [userId]);

    const sqlUpdate =
      "UPDATE userDB.users SET first_name = ?,last_name =?,password=? WHERE user_id=?";
    const update_query = mysql.format(sqlUpdate, [
      firstName,
      lastName,
      hashedPassword,
      userId,
    ]);

    await db.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("->Search Results");
      console.log(result.length);
      if (result.length == 0) {
        console.log("->User not found");
        res.status(404).send("User Not Found");
      } else {
        bcrypt.compare(password, result[0].password, (err, resu) => {
          if (err) throw err;
          if (resu && username == result[0].email) {
            console.log("Authentication Successful");
            connection.query(update_query, (err, res1) => {
              if (err) throw err;
              console.log("->Updated User");
              res.status(200).send('User Updated Successfully!');
            });
          }
          else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    });
  });
});

//Healthz
app.get("/healthz", async (req,res) =>{
    res.status(200).send("OK");
});

//Error handling in json
app.use((Error, req, res, next) => {
    if (Error instanceof SyntaxError && Error.status === 400 && "body" in Error) {
      let formatError = {
        status: Error.statusCode,
        message: Error.message,
      };
      return res.status(Error.statusCode).json(formatError); // Bad request
    }
    next();
  });