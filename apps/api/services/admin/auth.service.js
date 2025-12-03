const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../../../packages/db");

exports.login = async (email, password) => {
  const admin = await prisma.user.findUnique({ where: { email } });

  if (!admin) throw new Error("INVALID_CREDENTIAL");

  if (admin.role !== "ADMIN") throw new Error("NOT_ADMIN");

  if (!admin.isActive) throw new Error("NOT_ACTIVE");

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new Error("INVALID_CREDENTIAL");

  const token = jwt.sign(
    { id: admin.id, role: admin.role, email: admin.email },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: "1d" }
  );

  return { admin, token };
};
