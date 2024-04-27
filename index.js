require("dotenv").config();
const app_config = require('./app/config');
//const cookieParser = require('cookie-parser');

var express = require("express");
var app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var cors = require("cors");
var path = require("path");

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//app.use(cookieParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DEE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"

  );

  // create cookie -----------start ---------
  /* var cookie = req.cookies.cookieName;
  if (cookie === undefined) {
    var randomNumber=Math.random().toString();
    randomNumber=randomNumber.substring(2,randomNumber.length);
    var hour = 3600000;
    var expires = 14 * 24 * hour; //2 weeks
    res.cookie("cookieName", randomNumber, { maxAge: expires, httpOnly: true });
    res.header({
      "cookieName":'test'
    })
  } */
  // create cookie -----------end ---------

  next();
});

app.use(express.static(path.join(__dirname, "public")));

console.log('environment variables passed', process.env.deployment);
switch (process.env.deployment) {
  case 'local':
  default:
    console.log('loading local environment');
}

var managecategory = require("./app/modules/category/routes");
var home = require("./app/modules/home/routes");
var elk = require("./app/modules/elk/routes");
var search = require("./app/modules/search/routes");
var products = require("./app/modules/products/routes");
var subcategory = require("./app/modules/subcategory/routes");
var brands = require("./app/modules/brands/routes");
var section = require("./app/modules/section/routes");
var cart = require("./app/modules/cart/routes");
var orders = require("./app/modules/orders/routes");
var Auth = require("./app/modules/auth/routes");
var master = require("./app/modules/master/routes");
var profile = require("./app/modules/profile/routes");

app.use("/api", managecategory);
app.use("/api", home);
app.use("/elk", elk);
app.use("/api", search);
app.use("/api", products);
app.use("/api", subcategory);
app.use("/api", brands);
app.use("/api", section);
app.use("/api", Auth);
app.use("/api", cart);
app.use("/api", orders);
app.use("/api", master);
app.use("/api", profile);

app.listen(app_config.port, function (req, res) {
  console.log(`APP LISTENING ON ${app_config.base_url}${app_config.port}`);
});

process.on('uncaughtException', err => {
  console.error('There was an uncaught error', err);
});


module.exports = {
  app: app,
};