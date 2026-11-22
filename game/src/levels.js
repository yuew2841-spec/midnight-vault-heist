// Level definitions for "The Midnight Vault".
// Every level is one building floor the thief must rob: sneak past the patrols
// and cameras, crack the vault, grab the loot and slip out the exit.
// Coordinates are in tiles; one tile is 40 px, the floor is 24 x 15 tiles.
export const TILE = 40;
export const FLOOR_W = 24 * TILE; // 960
export const FLOOR_H = 15 * TILE; // 600

// A wall is [tileX, tileY, tilesWide, tilesHigh].
// A guard patrols a list of [tileX, tileY] waypoints.
// A camera sits at [tileX, tileY] and sweeps around baseAngle (radians).
// Loot is [tileX, tileY, value]. Vault and exit are single tiles.
export const LEVELS = [
  {
    name: 'Floor 1 — The Gallery',
    briefing: 'One sleepy guard, one camera. Crack the vault, grab what shines, leave quietly.',
    timeLimit: 150,
    walls: [
      [0, 0, 24, 1], [0, 14, 24, 1], [0, 0, 1, 15], [23, 0, 1, 15],
      [5, 2, 1, 5], [5, 2, 6, 1], [10, 2, 1, 4],
      [14, 8, 1, 5], [14, 12, 6, 1], [19, 4, 1, 5],
      [3, 10, 5, 1], [8, 10, 1, 3],
    ],
    guards: [
      { waypoints: [[7, 4], [17, 4], [17, 12], [7, 12]], speed: 62, pause: 1.2 },
    ],
    cameras: [
      { at: [12, 1], baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55, range: 230 },
    ],
    loot: [
      [3, 3, 120], [18, 2, 150], [21, 12, 180], [2, 12, 100],
    ],
    vault: [20, 7],
    vaultValue: 500,
    exit: [1, 7],
    start: [1, 13],
  },
  {
    name: 'Floor 2 — The Vault Wing',
    briefing: 'Two guards, three cameras, tighter corridors. The vault pays double — if you get out.',
    timeLimit: 180,
    walls: [
      [0, 0, 24, 1], [0, 14, 24, 1], [0, 0, 1, 15], [23, 0, 1, 15],
      [4, 2, 1, 6], [4, 7, 7, 1], [10, 7, 1, 4],
      [15, 2, 1, 5], [15, 2, 5, 1], [19, 9, 1, 5],
      [7, 11, 6, 1], [12, 11, 1, 3], [19, 4, 3, 1],
    ],
    guards: [
      { waypoints: [[3, 3], [13, 3], [13, 9], [3, 9]], speed: 72, pause: 0.9 },
      { waypoints: [[20, 2], [20, 12], [16, 12], [16, 6]], speed: 66, pause: 1.0 },
    ],
    cameras: [
      { at: [8, 1], baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.7, range: 230 },
      { at: [17, 13], baseAngle: -Math.PI / 2, sweep: 0.9, speed: 0.6, range: 230 },
      { at: [22, 7], baseAngle: Math.PI, sweep: 0.8, speed: 0.8, range: 210 },
    ],
    loot: [
      [2, 2, 150], [6, 12, 180], [13, 5, 200], [21, 13, 220], [18, 2, 160],
    ],
    vault: [21, 7],
    vaultValue: 1000,
    exit: [1, 7],
    start: [1, 13],
  },
  {
    name: 'Floor 3 — The Diamond Suite',
    briefing: 'Three guards, four cameras, one very nervous vault. No room for mistakes.',
    timeLimit: 210,
    walls: [
      [0, 0, 24, 1], [0, 14, 24, 1], [0, 0, 1, 15], [23, 0, 1, 15],
      [4, 2, 1, 5], [4, 6, 6, 1], [9, 2, 1, 4],
      [14, 2, 1, 6], [14, 7, 5, 1], [18, 7, 1, 6],
      [6, 10, 5, 1], [10, 10, 1, 3], [20, 3, 1, 6], [20, 11, 2, 1],
    ],
    guards: [
      { waypoints: [[2, 4], [12, 4], [12, 9], [2, 9]], speed: 80, pause: 0.8 },
      { waypoints: [[16, 2], [21, 2], [21, 12], [16, 12]], speed: 76, pause: 0.9 },
      { waypoints: [[7, 12], [12, 12], [12, 9], [7, 9]], speed: 84, pause: 0.6 },
    ],
    cameras: [
      { at: [7, 1], baseAngle: Math.PI / 2, sweep: 1.1, speed: 0.8, range: 240 },
      { at: [16, 13], baseAngle: -Math.PI / 2, sweep: 1.0, speed: 0.7, range: 240 },
      { at: [22, 5], baseAngle: Math.PI, sweep: 0.9, speed: 0.9, range: 220 },
      { at: [12, 7], baseAngle: 0, sweep: 1.2, speed: 0.6, range: 200 },
    ],
    loot: [
      [2, 2, 200], [11, 3, 220], [21, 1, 250], [3, 12, 180], [16, 10, 240], [22, 13, 200],
    ],
    vault: [21, 8],
    vaultValue: 1500,
    exit: [1, 7],
    start: [1, 13],
  },
];

// Build the live state of a level: pixel rects, patrols, cameras, loot items.
export function buildLevel(def) {
  const px = (t) => t * TILE;
  return {
    def,
    walls: def.walls.map(([x, y, w, h]) => ({ x: px(x), y: px(y), w: px(w), h: px(h) })),
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([x, y]) => ({ x: px(x) + TILE / 2, y: px(y) + TILE / 2 })),
      speed: g.speed,
      pause: g.pause,
      x: px(g.waypoints[0][0]) + TILE / 2,
      y: px(g.waypoints[0][1]) + TILE / 2,
      target: 1,
      wait: 0,
      angle: 0,
      chasing: false,
      chaseTime: 0,
    })),
    cameras: def.cameras.map((c) => ({
      x: px(c.at[0]) + TILE / 2,
      y: px(c.at[1]) + TILE / 2,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      speed: c.speed,
      range: c.range,
      angle: c.baseAngle,
      phase: Math.random() * Math.PI * 2,
    })),
    loot: def.loot.map(([x, y, value]) => ({
      x: px(x) + TILE / 2, y: px(y) + TILE / 2, value, taken: false,
    })),
    vault: {
      x: px(def.vault[0]) + TILE / 2, y: px(def.vault[1]) + TILE / 2,
      value: def.vaultValue, progress: 0, cracked: false,
    },
    exit: { x: px(def.exit[0]) + TILE / 2, y: px(def.exit[1]) + TILE / 2 },
    start: { x: px(def.start[0]) + TILE / 2, y: px(def.start[1]) + TILE / 2 },
  };
}
