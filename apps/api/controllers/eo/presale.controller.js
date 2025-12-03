const presaleService = require("../../services/eo/presale.service");

module.exports = {
  createPresale: (req, res) => presaleService.createPresale(req, res),
  getPresales: (req, res) => presaleService.getPresales(req, res),
  updatePresale: (req, res) => presaleService.updatePresale(req, res),
  deletePresale: (req, res) => presaleService.deletePresale(req, res),
};
