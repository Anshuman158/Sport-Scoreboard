
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const PORT = 3000;

app.use(express.json());

const match = {
  id: "match-001",
  homeTeam: "India",
  awayTeam: "Australia",
  homeScore: 0,
  awayScore: 0,
  status: "LIVE",
};

app.get("/api/matches", (req, res) => {
  res.json([match]);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (socket) => {
  console.log("WebSocket client connected");

  socket.send(JSON.stringify({
    type: "score_update",
    data: match,
  }));
});

app.post("/api/matches/:id/score", (req, res) => {
  if (req.params.id !== match.id) {
    return res.status(404).json({ error: "Match not found" });
  }

  const { homeScore, awayScore } = req.body;

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return res.status(400).json({
      error: "Scores must be non-negative integers",
    });
  }

  match.homeScore = homeScore;
  match.awayScore = awayScore;

  const event = JSON.stringify({
    type: "score_update",
    data: match,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(event);
    }
  });

  res.json({ message: "Score updated", match });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});

