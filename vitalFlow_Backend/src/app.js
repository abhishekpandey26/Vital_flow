const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const specs = require('./config/swagger');
const authRoutes = require('./modules/auth/auth.routes');
const doctorRoutes = require('./modules/doctors/doctor.routes');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // Enable CORS for all origins
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
});

module.exports = app;
