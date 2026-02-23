const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VitalsFlow API',
            version: '1.0.0',
            description: 'Doctor Authentication API for VitalsFlow HealthTech Platform',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
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
    },
    apis: ['./src/modules/auth/auth.routes.js'], // Files containing annotations
};

const specs = swaggerJsdoc(options);

module.exports = specs;
