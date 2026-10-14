// 公園のマップ。サーバーとクライアントの両方で読む。
// コードではなくデータとして持っておくと、あとで別の公園やイベント用マップに差し替えやすい。

export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 220; // px/秒

export const MAP = {
  width: 1600,
  height: 1000,
  spawn: { x: 800, y: 860, spread: 80 },

  // 通れないもの
  solids: [
    // 木
    { kind: 'tree', shape: 'circle', x: 180, y: 160, r: 38 },
    { kind: 'tree', shape: 'circle', x: 300, y: 110, r: 32 },
    { kind: 'tree', shape: 'circle', x: 1420, y: 150, r: 40 },
    { kind: 'tree', shape: 'circle', x: 1300, y: 230, r: 30 },
    { kind: 'tree', shape: 'circle', x: 140, y: 780, r: 36 },
    { kind: 'tree', shape: 'circle', x: 1460, y: 820, r: 34 },
    { kind: 'tree', shape: 'circle', x: 560, y: 300, r: 30 },
    { kind: 'tree', shape: 'circle', x: 1040, y: 680, r: 32 },
    // 池
    { kind: 'pond', shape: 'circle', x: 1250, y: 520, r: 110 },
    // ベンチ
    { kind: 'bench', shape: 'rect', x: 640, y: 140, w: 110, h: 30 },
    { kind: 'bench', shape: 'rect', x: 860, y: 140, w: 110, h: 30 },
    // すべり台
    { kind: 'slide', shape: 'rect', x: 330, y: 520, w: 60, h: 150 },
  ],

  // 通れる飾り（地面）
  ground: [
    { kind: 'path', shape: 'rect', x: 760, y: 0, w: 80, h: 1000 },
    { kind: 'path', shape: 'rect', x: 0, y: 460, w: 1600, h: 80 },
    { kind: 'sandbox', shape: 'rect', x: 180, y: 300, w: 200, h: 140 },
    { kind: 'plaza', shape: 'circle', x: 800, y: 500, r: 150 },
  ],

  // 遊びに使う道具（Phase 0 では置いてあるだけ）
  props: [
    { kind: 'can', x: 800, y: 500 },
  ],
};
