// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = function Auth(req, res, next) {
  const token = req.cookies.token; // Ambil dari cookie

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // simpan decoded token ke request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
