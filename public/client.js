import { MAP, PLAYER_RADIUS } from '/shared/map.js';

const canvas = document.getElementById('park');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

let ws = null;
let myId = null;
const shown = new Map(); // id -> 画面に表示中の位置（なめらかに追従させる）
let latest = [];         // サーバーから来た最新の状態

// ---- 接続 ----
$('join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('name').value;
  $('join').hidden = true;
  connect(name);
});

function connect(name) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'join', name })));
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.t === 'welcome') {
      myId = msg.id;
      $('hud').hidden = false;
    } else if (msg.t === 'state') {
      latest = msg.players;
      $('count').textContent = `公園にいる人：${latest.length}人`;
    } else if (msg.t === 'full') {
      showMessage('公園がいっぱいです。少し待ってから入ってね。');
    }
  });
  ws.addEventListener('close', () => {
    if ($('message').hidden) showMessage('接続が切れました。');
  });
}

function showMessage(text) {
  $('message-text').textContent = text;
  $('message').hidden = false;
}

// ---- 入力（キーボード） ----
const keys = new Set();
const KEYMAP = {
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
};
addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT') return;
  const k = KEYMAP[e.code];
  if (k) { keys.add(k); e.preventDefault(); }
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys.delete(k);
});
addEventListener('blur', () => keys.clear());

// ---- 入力（タッチ・マウスのドラッグ） ----
const JOY_MAX = 60;
let drag = null; // { sx, sy, x, y }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) { drag.x = e.clientX; drag.y = e.clientY; }
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function currentInput() {
  let dx = 0, dy = 0;
  if (keys.has('l')) dx -= 1;
  if (keys.has('r')) dx += 1;
  if (keys.has('u')) dy -= 1;
  if (keys.has('d')) dy += 1;
  if (drag) {
    const vx = drag.x - drag.sx, vy = drag.y - drag.sy;
    const len = Math.hypot(vx, vy);
    if (len > 8) {
      const k = Math.min(len, JOY_MAX) / JOY_MAX / len;
      dx = vx * k; dy = vy * k;
    }
  }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  return { dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100 };
}

let lastSent = { dx: 0, dy: 0 };
function sendInput() {
  if (!ws || ws.readyState !== WebSocket.OPEN || myId == null) return;
  const v = currentInput();
  if (v.dx === lastSent.dx && v.dy === lastSent.dy) return;
  ws.send(JSON.stringify({ t: 'input', ...v }));
  lastSent = v;
}

// ---- 描画 ----
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', resize);
resize();

const GROUND_COLORS = { path: '#d9c9a0', sandbox: '#ecd9a4', plaza: '#cfc3a0' };

function drawShape(s) {
  ctx.beginPath();
  if (s.shape === 'circle') ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  else ctx.roundRect(s.x, s.y, s.w, s.h, 6);
}

function drawPark() {
  ctx.fillStyle = '#86c06c';
  ctx.fillRect(0, 0, MAP.width, MAP.height);

  for (const g of MAP.ground) {
    ctx.fillStyle = GROUND_COLORS[g.kind] || '#ccc';
    drawShape(g);
    ctx.fill();
  }

  // 柵
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, MAP.width - 6, MAP.height - 6);

  for (const s of MAP.solids) {
    if (s.kind === 'pond') {
      ctx.fillStyle = '#6cb7d9'; drawShape(s); ctx.fill();
      ctx.strokeStyle = '#4f97b8'; ctx.lineWidth = 4; ctx.stroke();
    } else if (s.kind === 'tree') {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.arc(s.x + 6, s.y + 8, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f8a3a'; drawShape(s); ctx.fill();
      ctx.fillStyle = '#56a74e';
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.25, s.y - s.r * 0.25, s.r * 0.55, 0, Math.PI * 2); ctx.fill();
    } else if (s.kind === 'bench') {
      ctx.fillStyle = '#9b6b43'; drawShape(s); ctx.fill();
      ctx.fillStyle = '#7d5433';
      for (let i = 1; i < 3; i++) ctx.fillRect(s.x, s.y + (s.h / 3) * i - 1, s.w, 2);
    } else if (s.kind === 'slide') {
      ctx.fillStyle = '#e8594f'; drawShape(s); ctx.fill();
      ctx.fillStyle = '#f7c948'; ctx.fillRect(s.x + 12, s.y + 10, s.w - 24, s.h - 20);
    } else {
      ctx.fillStyle = '#888'; drawShape(s); ctx.fill();
    }
  }

  for (const p of MAP.props) {
    if (p.kind === 'can') {
      ctx.fillStyle = '#b8c2c8';
      ctx.fillRect(p.x - 8, p.y - 12, 16, 22);
      ctx.fillStyle = '#e8594f';
      ctx.fillRect(p.x - 8, p.y - 4, 16, 7);
    }
  }
}

function drawPlayer(p, isMe) {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + PLAYER_RADIUS - 2, PLAYER_RADIUS, PLAYER_RADIUS * 0.4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = isMe ? 4 : 2;
  ctx.strokeStyle = isMe ? '#fff' : 'rgba(0,0,0,0.25)';
  ctx.stroke();

  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(p.name, p.x, p.y - PLAYER_RADIUS - 8);
  ctx.fillStyle = '#2b2b22';
  ctx.fillText(p.name, p.x, p.y - PLAYER_RADIUS - 8);
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  sendInput();

  // 表示位置をサーバーの位置へなめらかに寄せる
  const ids = new Set();
  const follow = 1 - Math.exp(-dt * 18);
  for (const p of latest) {
    ids.add(p.id);
    const s = shown.get(p.id);
    if (!s) shown.set(p.id, { ...p });
    else Object.assign(s, { name: p.name, color: p.color, x: s.x + (p.x - s.x) * follow, y: s.y + (p.y - s.y) * follow });
  }
  for (const id of shown.keys()) if (!ids.has(id)) shown.delete(id);

  // カメラは自分を中心に、公園の外は映しすぎない
  const dpr = window.devicePixelRatio || 1;
  const vw = canvas.width / dpr, vh = canvas.height / dpr;
  const me = shown.get(myId) || { x: MAP.width / 2, y: MAP.height / 2 };
  const cx = vw >= MAP.width ? MAP.width / 2 : Math.min(Math.max(me.x, vw / 2), MAP.width - vw / 2);
  const cy = vh >= MAP.height ? MAP.height / 2 : Math.min(Math.max(me.y, vh / 2), MAP.height - vh / 2);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#5e9a4c';
  ctx.fillRect(0, 0, vw, vh);
  ctx.translate(Math.round(vw / 2 - cx), Math.round(vh / 2 - cy));

  drawPark();
  const list = [...shown.values()].sort((a, b) => a.y - b.y);
  for (const p of list) drawPlayer(p, p.id === myId);

  // ドラッグ操作のガイド
  if (drag) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(drag.sx, drag.sy, JOY_MAX, 0, Math.PI * 2); ctx.stroke();
    const vx = drag.x - drag.sx, vy = drag.y - drag.sy;
    const len = Math.hypot(vx, vy), k = len > JOY_MAX ? JOY_MAX / len : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(drag.sx + vx * k, drag.sy + vy * k, 18, 0, Math.PI * 2); ctx.fill();
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
