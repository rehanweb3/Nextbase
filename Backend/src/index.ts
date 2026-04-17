import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import dbRoutes from './routes/db';
import queryRoutes from './routes/query';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/admin', adminRoutes);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('subscribe-table', (tableName) => {
        socket.join(`table-${tableName}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

export const broadcastSchemaChange = () => {
    io.emit('schema-changed');
};

export const broadcastTableUpdate = (tableName: string) => {
    io.to(`table-${tableName}`).emit('table-updated', { tableName });
};

const PORT = process.env.BACKEND_PORT || 3001;

server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
});
