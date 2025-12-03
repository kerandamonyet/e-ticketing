const eventService = require("../../services/eo/event.service");

module.exports = {
  create: (req, res) => eventService.create(req, res),
  list: (req, res) => eventService.list(req, res),
  detail: (req, res) => eventService.detail(req, res),
  update: (req, res) => eventService.update(req, res),
  remove: (req, res) => eventService.remove(req, res),
  updateStatus: (req, res) => eventService.updateStatus(req, res),
};
