// middleware/auth/adminAuth.js
const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  const token = req.cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
};
