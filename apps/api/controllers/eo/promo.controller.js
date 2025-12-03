const promoService = require("../../services/eo/promo.service");

module.exports = {
  createPromo: promoService.createPromo,
  getPromos: promoService.getPromos,
  updatePromo: promoService.updatePromo,
  deletePromo: promoService.deletePromo,
};
