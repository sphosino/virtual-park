// 2人で公園に入り、片方が歩いて、もう片方の画面にその動きが届くかを確かめる。
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
import { step } from '../shared/physics.js';
import { MAP } from '../shared/map.js';

const PORT = 3999;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 障害物にめり込まないこと
{
  const tree = MAP.solids.find((s) => s.kind === 'tree');
  const p = { x: tree.x, y: tree.y - tree.r - 30, dx: 0, dy: 1 };
  for (let i = 0; i < 40; i++) step(p, 0.05);
  assert.ok(Math.hypot(p.x - tree.x, p.y - tree.y) >= tree.r + 15.9, '木を通り抜けた');
  const q = { x: 5, y: 5, dx: -1, dy: -1 };
  step(q, 0.05);
  assert.ok(q.x >= 16 && q.y >= 16, '柵の外に出た');
}

const server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT } });
let ok = false;
try {
  await sleep(500);

  // ページとマップが配信されること
  for (const p of ['/', '/client.js', '/style.css', '/shared/map.js']) {
    const r = await fetch(`http://localhost:${PORT}${p}`);
    assert.equal(r.status, 200, `${p} が配信されない`);
  }
  assert.equal((await fetch(`http://localhost:${PORT}/../package.json`)).status, 404);

  const join = (name) => new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    const c = { ws, id: null, state: [] };
    ws.on('open', () => ws.send(JSON.stringify({ t: 'join', name })));
    ws.on('message', (d) => {
      const m = JSON.parse(d);
      if (m.t === 'welcome') { c.id = m.id; resolve(c); }
      if (m.t === 'state') c.state = m.players;
    });
  });

  const a = await join('たろう');
  const b = await join('はなこ');
  await sleep(200);
  assert.equal(b.state.length, 2, '2人見えていない');

  const before = b.state.find((p) => p.id === a.id);
  a.ws.send(JSON.stringify({ t: 'input', dx: 1, dy: 0 }));
  await sleep(500);
  const after = b.state.find((p) => p.id === a.id);
  console.log(`たろう: x ${before.x} → ${after.x}`);
  assert.ok(after.x - before.x > 60, 'たろうの移動がはなこに届いていない');

  // 速すぎる入力は丸められること
  const bBefore = b.state.find((p) => p.id === b.id);
  b.ws.send(JSON.stringify({ t: 'input', dx: 0, dy: -50 }));
  await sleep(500);
  const bAfter = b.state.find((p) => p.id === b.id);
  assert.ok(bBefore.y - bAfter.y < 140, `速すぎる: ${bBefore.y - bAfter.y}`);

  a.ws.close();
  await sleep(200);
  assert.equal(b.state.length, 1, '退出が反映されていない');
  b.ws.close();
  ok = true;
  console.log('OK');
} finally {
  server.kill();
  if (!ok) process.exitCode = 1;
}
