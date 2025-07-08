export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '数据守护者AI API',
      version: '1.0.0',
      description: '智能化数据治理工具API文档',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // API文档路径
}; 