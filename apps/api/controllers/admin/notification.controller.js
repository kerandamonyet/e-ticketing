const adminNotificationService = require("../../services/admin/notification.service");

module.exports = {
  getCounts: (req, res) => adminNotificationService.getCounts(req, res),
  getDetails: (req, res) => adminNotificationService.getDetails(req, res),
  testNotification: (req, res) =>
    adminNotificationService.testNotification(req, res),
};
