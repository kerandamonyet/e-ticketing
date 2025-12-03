const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Admin API Documentation",
      version: "1.0.0",
      description: "Documentation Admin Panel API",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "admin_token",
        },
      },
      schemas: {
        AdminUser: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },

  apis: ["./apps/api/routes/**/*.js", "./apps/api/controllers/**/*.js"],
};

module.exports = swaggerJSDoc(options);
