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
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const email = req.body.username;
  const password = req.body.password;
  let hashedPassword = "";
  if(password!=undefined && password!="" && password!=null) hashedPassword = encryptedPassword(req.body.password);

  if (email == undefined || email =="" || !isEmail(email)) res.status(400).send("Please enter valid email");
  else if (password == undefined || password =="" || !checkPassword(password))
    res.status(400).send("Please enter valid password");
  else if (firstName == undefined || firstName =="" || lastName == undefined || lastName =="" || !(checkName(firstName) && checkName(lastName)))
    res.status(400).send("Please enter valid First and Last Names");
  else {
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
          console.log("-> User Already Exists");
          res.status(400).send("User Already Exists");//HTTP Error Code : 409 For Conflict
        } else {
          await connection.query(insert_query, (err, result) => {
            if (err) throw err;
            console.log("-> Created New User");
            console.log(result.insertId);
            res.sendStatus(201);
          });
        }
      });
    });
  }
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
      } 
      else if(!isEmail(username)){
        res.status(400).send("Authentication Failed, Please enter valid email");
      }
      else {
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
              account_created: result[0].account_created,
              account_updated: result[0].account_updated,
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
app.put("/v1/user/:userId", async (req, res) => {www
  const userId = req.params.userId;
  console.log("userid:" + userId);
  let firstName = req.body.first_name;
  let lastName = req.body.last_name;
  let passwordBody = req.body.password;
  let hashedPassword = "";
  if(passwordBody!=undefined && passwordBody!="" && passwordBody!=null) hashedPassword = encryptedPassword(req.body.password);

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
      if (result.length == 0) {
        console.log("->User not found");
        res.status(404).send("User Not Found");
      } 
      else if(!isEmail(username)){
        res.status(400).send("Authentication Failed, Please enter valid email");
      }
      else {
        bcrypt.compare(password, result[0].password, (err, resu) => {
          if (err) throw err;
          if (firstName == undefined || firstName == "")
            firstName = result[0].first_name;
          if (lastName == undefined || lastName == "")
            lastName = result[0].last_name;
          if (passwordBody == undefined || passwordBody == "")
            hashedPassword = result[0].password;

          if (resu && username == result[0].email) {
            console.log("Authentication Successful");

            const sqlUpdate =
              "UPDATE userDB.users SET first_name = ?,last_name =?,password=? WHERE user_id=?";
            const update_query = mysql.format(sqlUpdate, [
              firstName,
              lastName,
              hashedPassword,
              userId,
            ]);
            if (
              passwordBody != null &&
              passwordBody != undefined &&
              passwordBody != "" &&
              !checkPassword(passwordBody)
            )
              res.status(400).send("Please enter valid password");
            else if (!(checkName(firstName) && checkName(lastName)))
              res.status(400).send("Please enter valid First and Last Names");
            else {
              connection.query(update_query, (err, res1) => {
                if (err) throw err;
                console.log("->Updated User");
                res.status(200).send("User Updated Successfully!");
              });
            }
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    });
  });
});

//Healthz
app.get("/healthz", async (req, res) => {
  res.status(200).send("OK");
});

//Validations & Error Handling

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

//Email Regex
let isEmail = (email) => {
  var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (email !== "" && email.match(emailFormat)) {
    return true;
  }
  return false;
};

//Password Regex : min 8 letter password, with at least a symbol, upper and lower case letters and a number
let checkPassword = (str) => {
  var passRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
//   /^(?=.[0-9])(?=.[!@#$%^&])[a-zA-Z0-9!@#$%^&]{6,16}$/
  return str.match(passRegex);
};

//Name Validation
let checkName = (str) => {
  var regName = /^[a-zA-Z]+$/;
  return str != "" && str.match(regName);
};

module.exports = app;
