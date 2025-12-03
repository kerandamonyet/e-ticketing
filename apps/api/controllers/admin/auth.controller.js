const authService = require("../../services/admin/auth.service");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { admin, token } = await authService.login(email, password);

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400000,
      path: "/",
    });

    res.json({
      success: true,
      message: "Login admin berhasil",
      user: admin,
    });
  } catch (error) {
    const map = {
      INVALID_CREDENTIAL: [401, "Email atau password salah"],
      NOT_ADMIN: [403, "Bukan admin"],
      NOT_ACTIVE: [403, "Akun dinonaktifkan"],
    };

    const [status, message] = map[error.message] || [500, "Server error"];
    res.status(status).json({ success: false, message });
  }
};

exports.me = (req, res) => {
  res.json({ success: true, user: req.admin });
};

exports.logout = (req, res) => {
  res.clearCookie("admin_token", { path: "/" });
  res.json({ success: true });
};
