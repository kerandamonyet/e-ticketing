const AuthService = require("../../services/user/auth.service");

module.exports = {
  async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      return res.json(result);
    } catch (err) {
      console.error("REGISTER CONTROLLER ERROR:", err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  async login(req, res) {
    try {
      const { user, token } = await AuthService.login(req.body);

      // set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.json({
        message: "Login sukses",
        user,
      });
    } catch (err) {
      console.error("LOGIN CONTROLLER ERROR:", err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  async me(req, res) {
    try {
      const user = await AuthService.me(req.user.id);
      return res.json({ user });
    } catch (err) {
      console.error("ME CONTROLLER ERROR:", err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  logout(req, res) {
    res.clearCookie("token", { path: "/" });
    return res.json({ success: true });
  },
};
