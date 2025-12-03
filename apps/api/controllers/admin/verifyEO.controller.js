const verifyEOService = require("../../services/admin/verifyEO.service");

module.exports = {
  getPendingEO: (req, res) => verifyEOService.getPendingEO(req, res),
  getApprovedEO: (req, res) => verifyEOService.getApprovedEO(req, res),
  getRejectedEO: (req, res) => verifyEOService.getRejectedEO(req, res),
  getAllEO: (req, res) => verifyEOService.getAllEO(req, res),
  getEODetail: (req, res) => verifyEOService.getEODetail(req, res),
  approveEO: (req, res) => verifyEOService.approveEO(req, res),
  rejectEO: (req, res) => verifyEOService.rejectEO(req, res),
};
