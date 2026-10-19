import WebSocket, { WebSocketServer } from 'ws';

/**
 * Registry of match subscribers:
 * Key: matchId (number)
 * Value: Set<WebSocket> of clients tuned in to this match
 */
const matchSubscribers = new Map();

/**
 * Safe helper to send JSON to an individual socket
 */
export function sendJson(socket, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  try {
    socket.send(JSON.stringify(payload));
  } catch (err) {
    console.error('Error sending JSON to client:', err.message);
  }
}

/**
 * Megaphone pattern: Broadcasts to every connected client on the server
 */
export function broadcastToAll(wss, payload) {
  if (!wss || !wss.clients) return;
  const message = JSON.stringify(payload);

  for (const client of wss.clients) {
    // Crucial: continue to next client rather than returning, so all clients receive it
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    try {
      client.send(message);
    } catch (err) {
      console.error('Failed to send broadcast to client:', err.message);
    }
  }
}

/**
 * Selective Pub/Sub pattern: Broadcasts only to clients subscribed to a specific match
 */
export function broadcastToMatch(matchId, payload) {
  const numericId = Number(matchId);
  const subscribers = matchSubscribers.get(numericId);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    try {
      client.send(message);
    } catch (err) {
      console.error(`Failed to send match ${numericId} update to client:`, err.message);
    }
  }
}

/**
 * Subscribes a socket to a specific match room
 */
function subscribe(matchId, socket) {
  const numericId = Number(matchId);
  if (!matchSubscribers.has(numericId)) {
    matchSubscribers.set(numericId, new Set());
  }
  matchSubscribers.get(numericId).add(socket);
  socket.subscriptions.add(numericId);
}

/**
 * Unsubscribes a socket from a specific match room
 */
function unsubscribe(matchId, socket) {
  const numericId = Number(matchId);
  const subscribers = matchSubscribers.get(numericId);
  if (!subscribers) return;

  subscribers.delete(socket);
  socket.subscriptions.delete(numericId);

  // Clean up memory if no users are watching this match
  if (subscribers.size === 0) {
    matchSubscribers.delete(numericId);
  }
}

/**
 * Cleans up all match subscriptions when a socket disconnects or errors
 */
function cleanupSubscriptions(socket) {
  if (!socket.subscriptions) return;
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
  socket.subscriptions.clear();
}

/**
 * Handles incoming messages from clients following the Envelope Pattern
 */
function handleMessage(socket, rawData) {
  let message;
  try {
    message = JSON.parse(rawData.toString());
  } catch (err) {
    sendJson(socket, {
      type: 'error',
      message: 'Invalid JSON payload received',
    });
    return;
  }

  // Handle subscribe action
  if (message.type === 'subscribe' && Number.isInteger(Number(message.matchId))) {
    const matchId = Number(message.matchId);
    subscribe(matchId, socket);
    sendJson(socket, {
      type: 'subscribed',
      matchId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle unsubscribe action
  if (message.type === 'unsubscribe' && Number.isInteger(Number(message.matchId))) {
    const matchId = Number(message.matchId);
    unsubscribe(matchId, socket);
    sendJson(socket, {
      type: 'unsubscribed',
      matchId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle client ping for latency measurement
  if (message.type === 'ping') {
    sendJson(socket, {
      type: 'pong',
      clientTimestamp: message.timestamp || null,
      serverTimestamp: Date.now(),
    });
    return;
  }

  // Unknown message type
  sendJson(socket, {
    type: 'unknown_command',
    message: `Command '${message.type}' is not recognized. Expected 'subscribe', 'unsubscribe', or 'ping'.`,
  });
}

/**
 * Attaches the WebSocket server to the existing HTTP server instance.
 * Shares port 8000 (one port, two protocols).
 */
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024, // 1MB security protection against memory flood attacks
  });

  // Ping/Pong Heartbeat to eliminate Ghost Connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // Socket failed to respond to previous ping: kill the ghost connection
        cleanupSubscriptions(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (socket, request) => {
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    const clientIp = request.socket.remoteAddress;

    // Send instant welcome handshake confirmation
    sendJson(socket, {
      type: 'welcome',
      message: 'Connected to Sports Live Engine WebSocket Tunnel',
      protocol: 'ws-101',
      remoteAddress: clientIp,
      timestamp: new Date().toISOString(),
    });

    socket.on('message', (data) => {
      handleMessage(socket, data);
    });

    socket.on('error', (err) => {
      console.error(`Socket error from ${clientIp}:`, err.message);
      cleanupSubscriptions(socket);
    });

    socket.on('close', (code, reason) => {
      cleanupSubscriptions(socket);
    });
  });

  // Broadcast helper functions exposed to Express routes via app.locals
  function broadcastMatchCreated(match) {
    broadcastToAll(wss, {
      type: 'match_created',
      data: match,
      timestamp: new Date().toISOString(),
    });
  }

  function broadcastCommentary(matchId, entry) {
    broadcastToMatch(matchId, {
      type: 'commentary',
      matchId: Number(matchId),
      data: entry,
      timestamp: new Date().toISOString(),
    });
  }

  function broadcastScoreUpdate(matchId, match) {
    // Broadcast to subscribers of the match and to the main ticker
    broadcastToMatch(matchId, {
      type: 'score_update',
      matchId: Number(matchId),
      data: match,
      timestamp: new Date().toISOString(),
    });

    // Also broadcast to all clients so matches list updates live score
    broadcastToAll(wss, {
      type: 'match_score_changed',
      matchId: Number(matchId),
      data: match,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    wss,
    broadcastMatchCreated,
    broadcastCommentary,
    broadcastScoreUpdate,
  };
}
