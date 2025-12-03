// middleware/auth/index.js
module.exports = {
  verifyToken: require("./verifyToken"),
  userAuth: require("./userAuth"),
  eoAuth: require("./eoAuth"),
  adminAuth: require("./adminAuth"),
  eoAdmin: require("./eoAdmin"),
};
