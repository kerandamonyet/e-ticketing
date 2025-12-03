// middleware/auth/userAuth.js
const verifyToken = require("./verifyToken");

module.exports = function userAuth(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== "USER") {
      return res.status(403).json({ error: "User access only" });
    }
    next();
  });
};
