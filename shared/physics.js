import { MAP, PLAYER_RADIUS, PLAYER_SPEED } from './map.js';

// 入力 (dx, dy) を長さ1以下に丸める
export function normalizeInput(dx, dy) {
  dx = Number(dx) || 0;
  dy = Number(dy) || 0;
  const len = Math.hypot(dx, dy);
  if (len > 1) return { dx: dx / len, dy: dy / len };
  return { dx, dy };
}

// プレイヤーを dt 秒ぶん動かし、障害物と外枠から押し出す
export function step(p, dt, map = MAP) {
  p.x += p.dx * PLAYER_SPEED * dt;
  p.y += p.dy * PLAYER_SPEED * dt;
  for (const s of map.solids) pushOut(p, s);
  const r = PLAYER_RADIUS;
  p.x = Math.min(Math.max(p.x, r), map.width - r);
  p.y = Math.min(Math.max(p.y, r), map.height - r);
}

function pushOut(p, s) {
  const r = PLAYER_RADIUS;
  if (s.shape === 'circle') {
    const vx = p.x - s.x, vy = p.y - s.y;
    const d = Math.hypot(vx, vy);
    const min = s.r + r;
    if (d < min) {
      if (d === 0) { p.y = s.y + min; return; }
      p.x = s.x + (vx / d) * min;
      p.y = s.y + (vy / d) * min;
    }
  } else if (s.shape === 'rect') {
    const cx = Math.min(Math.max(p.x, s.x), s.x + s.w);
    const cy = Math.min(Math.max(p.y, s.y), s.y + s.h);
    const vx = p.x - cx, vy = p.y - cy;
    const d = Math.hypot(vx, vy);
    if (d >= r) return;
    if (d > 0) {
      p.x = cx + (vx / d) * r;
      p.y = cy + (vy / d) * r;
    } else {
      // 中心が矩形の中に入ってしまった場合は、一番近い辺から出す
      const left = p.x - s.x, right = s.x + s.w - p.x;
      const top = p.y - s.y, bottom = s.y + s.h - p.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) p.x = s.x - r;
      else if (m === right) p.x = s.x + s.w + r;
      else if (m === top) p.y = s.y - r;
      else p.y = s.y + s.h + r;
    }
  }
}
