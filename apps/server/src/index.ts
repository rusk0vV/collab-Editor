import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { docsRouter } from './routes/docs';
import { registerSocketHandlers } from './ws/opHandler';
import { runMigrations } from './db/client';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS settings mapped to frontend on port 3000
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Bind HTTP routes
app.use('/docs', ClerkExpressRequireAuth(), docsRouter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Bind WebSocket routes
registerSocketHandlers(io);

// Global unhandled error middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Perform Postgres migration updates synchronously
    await runMigrations();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
