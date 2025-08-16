    import express from 'express';
    import cors from 'cors';
    import dotenv from 'dotenv';
    import mongoose from 'mongoose';

    import authRoutes from './routes/auth.routes.js';
    import orderRoutes from './routes/order.routes.js';

    dotenv.config();

    const app = express();
    const PORT = process.env.PORT || 5000;

    // Middlewares
    app.use(cors());
    app.use(express.json());

    // Routes
    app.use('/api', authRoutes);           // /api/register, /api/login
    app.use('/api/orders', orderRoutes);   // /api/orders/*

    // DB connection
    mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('❌ Mongo Error:', err.message);
    });
