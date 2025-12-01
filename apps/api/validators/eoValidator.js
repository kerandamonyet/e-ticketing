const Joi = require("joi");

const eoValidator = Joi.object({
  fullName: Joi.string().min(3).max(100).trim().required().messages({
    "string.empty": "Nama lengkap wajib diisi",
    "string.min": "Nama minimal 3 karakter",
    "string.max": "Nama maksimal 100 karakter",
    "any.required": "Nama lengkap wajib diisi",
  }),

  nik: Joi.string()
    .length(16)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "NIK wajib diisi",
      "string.length": "NIK harus 16 digit",
      "string.pattern.base": "NIK harus berupa angka",
      "any.required": "NIK wajib diisi",
    }),

  phone: Joi.string()
    .min(10)
    .max(15)
    .pattern(/^(\+62|62|0)[0-9]{9,13}$/)
    .required()
    .messages({
      "string.empty": "Nomor HP wajib diisi",
      "string.min": "Nomor HP minimal 10 digit",
      "string.max": "Nomor HP maksimal 15 digit",
      "string.pattern.base":
        "Format nomor HP tidak valid (contoh: 081234567890)",
      "any.required": "Nomor HP wajib diisi",
    }),

  address: Joi.string().min(10).max(500).trim().required().messages({
    "string.empty": "Alamat wajib diisi",
    "string.min": "Alamat minimal 10 karakter",
    "string.max": "Alamat maksimal 500 karakter",
    "any.required": "Alamat wajib diisi",
  }),
});

module.exports = { eoValidator };
