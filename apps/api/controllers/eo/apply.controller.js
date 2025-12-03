const applyService = require("../../services/eo/apply.service");

module.exports = {
  applyEO: (req, res) => applyService.applyEO(req, res),
  updateEO: (req, res) => applyService.updateEO(req, res),
  myStatus: (req, res) => applyService.myStatus(req, res),
};
