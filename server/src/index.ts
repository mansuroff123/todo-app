import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

import authRoutes from './routes/auth.routes.js';
import todoRoutes from "./routes/todo.routes.js";
import userRoutes from "./routes/user.routes.js";

import { initCron } from './lib/cron.js';
import './lib/telegram.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); 
app.use('/api/todo', todoRoutes);

io.on('connection', (socket) => {
  console.log('Foydalanuvchi ulandi:', socket.id);

  socket.on('join', (userId: string | number) => {
    socket.join(`user_${userId}`);
    console.log(`Foydalanuvchi o'z xonasiga kirdi: user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Foydalanuvchi uzildi');
  });
});

initCron();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server va WebSockets http://localhost:${PORT} da ishga tushdi`);
});

export { io };