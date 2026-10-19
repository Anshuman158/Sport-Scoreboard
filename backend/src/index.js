import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware, checkWebSocketUpgradeSecurity } from './arcjet.js';

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS for frontend clients
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Standard JSON body parsing
app.use(express.json());

// Arcjet security middleware for REST routes (rate limiting, bot shield)
app.use(securityMiddleware());

// Root health check route
app.get('/', (req, res) => {
  res.json({
    name: 'Sports Real-Time Scoreboard API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      matches: '/matches',
      commentary: '/matches/:id/commentary',
      websocket: '/ws',
    },
    currentTime: new Date().toISOString(),
  });
});

// Mount match and nested commentary routes
matchRouter.use('/:id/commentary', commentaryRouter);
app.use('/matches', matchRouter);

// Wrap Express with native Node HTTP Server
// One port, two protocols: Express handles HTTP, WS handles WebSocket upgrades
const server = http.createServer(app);

// Attach the WebSocket server with Pub/Sub & Heartbeat
const { wss, broadcastMatchCreated, broadcastCommentary, broadcastScoreUpdate } =
  attachWebSocketServer(server);

// Store broadcast functions on app.locals so REST controllers can trigger real-time pushes
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
app.locals.broadcastScoreUpdate = broadcastScoreUpdate;

// Intercept HTTP upgrade request for Arcjet rate limiting & bot shield before WebSocket handshake
server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/ws') {
    const security = await checkWebSocketUpgradeSecurity(req);
    if (!security.allowed) {
      socket.write(`HTTP/1.1 ${security.statusCode} ${security.reason}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
      return;
    }
  }
});

// Start the unified HTTP & WebSocket server
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === '0.0.0.0'
      ? `http://localhost:${PORT}`
      : `http://${HOST}:${PORT}`;
  const wsUrl = baseUrl.replace('http', 'ws') + '/ws';

  console.log(`Server running on ${baseUrl}`);
  console.log(`WebSocket server is live on ${wsUrl}`);
  console.log(`Live Sports Match Engine ready for concurrent connections.`);
});
