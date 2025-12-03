const ticketTypeService = require("../../services/eo/ticketType.service");

module.exports = {
  create: (req, res) => ticketTypeService.create(req, res),
  list: (req, res) => ticketTypeService.list(req, res),
  detail: (req, res) => ticketTypeService.detail(req, res),
  update: (req, res) => ticketTypeService.update(req, res),
  remove: (req, res) => ticketTypeService.remove(req, res),
};
