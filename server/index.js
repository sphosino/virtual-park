import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MAP } from '../shared/map.js';
import { normalizeInput, step } from '../shared/physics.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SHARED_DIR = path.join(ROOT, 'shared');
const PORT = Number(process.env.PORT) || 3000;
const TICK_MS = 50; // 20回/秒
const MAX_PLAYERS = 30;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// ---- 静的ファイル配信 ----
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let base = PUBLIC_DIR;
  let rel = urlPath;
  if (urlPath.startsWith('/shared/')) {
    base = SHARED_DIR;
    rel = urlPath.slice('/shared'.length);
  }
  if (rel === '/') rel = '/index.html';
  const file = path.join(base, path.normalize(rel));
  if (!file.startsWith(base + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// ---- プレイヤー ----
const COLORS = ['#e8594f', '#f2a33a', '#e6cf3c', '#5cb85c', '#3fa7d6', '#6c6fd8', '#c867c4', '#e57fa8', '#8a6a4f', '#4fb3a6'];
const players = new Map(); // id -> player
let nextId = 1;
let colorIndex = 0;

function cleanName(name) {
  const s = String(name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'あそびびと';
}

function spawnPoint() {
  const { x, y, spread } = MAP.spawn;
  return {
    x: x + (Math.random() * 2 - 1) * spread,
    y: y + (Math.random() * 2 - 1) * spread * 0.5,
  };
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// ---- WebSocket ----
const wss = new WebSocketServer({ server, maxPayload: 4 * 1024 });

wss.on('connection', (ws) => {
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.t === 'join' && !player) {
      if (players.size >= MAX_PLAYERS) {
        send(ws, { t: 'full' });
        ws.close();
        return;
      }
      const pos = spawnPoint();
      player = {
        id: nextId++,
        name: cleanName(msg.name),
        color: COLORS[colorIndex++ % COLORS.length],
        x: pos.x, y: pos.y, dx: 0, dy: 0,
        ws,
      };
      players.set(player.id, player);
      send(ws, { t: 'welcome', id: player.id });
      console.log(`join  #${player.id} ${player.name} (${players.size}人)`);
      return;
    }

    if (msg.t === 'input' && player) {
      const v = normalizeInput(msg.dx, msg.dy);
      player.dx = v.dx;
      player.dy = v.dy;
    }
  });

  ws.on('close', () => {
    if (!player) return;
    players.delete(player.id);
    console.log(`leave #${player.id} ${player.name} (${players.size}人)`);
  });
});

// ---- ゲームループ ----
setInterval(() => {
  const dt = TICK_MS / 1000;
  for (const p of players.values()) step(p, dt);
  const snapshot = JSON.stringify({
    t: 'state',
    players: [...players.values()].map((p) => ({
      id: p.id, name: p.name, color: p.color,
      x: Math.round(p.x), y: Math.round(p.y),
    })),
  });
  for (const p of players.values()) {
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(snapshot);
  }
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`virtual-park: http://localhost:${PORT}`);
});
