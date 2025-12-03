// api/validators/user/auth.validator.js
module.exports = {
  register(req, res, next) {
    const body = req.body ?? {}; // prevent destructure crash
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Semua field wajib diisi" });
    }

    next();
  },

  login(req, res, next) {
    const body = req.body ?? {}; // prevent destructure crash
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password wajib" });
    }

    next();
  },
};
