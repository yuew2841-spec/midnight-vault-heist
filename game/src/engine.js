// Game state and rules for "The Midnight Vault".
// Owns the thief, the patrols, detection, the vault, the alarm and the score.
// Rendering lives in render.js; input and screens live in main.js.
import { LEVELS, buildLevel, TILE, FLOOR_W, FLOOR_H } from './levels.js';

export const GUARD_RANGE = 190;
export const GUARD_HALF_ANGLE = 0.55; // ~31 degrees each side
export const CAM_HALF_ANGLE = 0.45;
export const POLICE_TIME = 30;
export const CRACK_TIME = 3.0;
export const SPOT_PENALTY = 25;

const TAU = Math.PI * 2;

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Segment (x1,y1)-(x2,y2) hits rect r? Used for line of sight through walls.
function segHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
    else { if (t < tmin) return false; if (t < tmax) tmax = t; }
  }
  return true;
}

export function hasLineOfSight(walls, x1, y1, x2, y2) {
  for (const w of walls) if (segHitsRect(x1, y1, x2, y2, w)) return false;
  return true;
}

// Is the thief inside a vision cone of range/halfAngle at (ox,oy) facing ang?
export function inCone(walls, ox, oy, ang, range, halfAngle, tx, ty) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (Math.abs(angleDiff(Math.atan2(ty - oy, tx - ox), ang)) > halfAngle) return false;
  return hasLineOfSight(walls, ox, oy, tx, ty);
}

function circleHitsWalls(walls, x, y, r) {
  for (const w of walls) {
    const cx = clamp(x, w.x, w.x + w.w), cy = clamp(y, w.y, w.y + w.h);
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}

export function createGame() {
  return {
    screen: 'start', // start | playing | paused | win | caught | timeup
    levelIndex: 0,
    level: buildLevel(LEVELS[0]),
    thief: { x: 0, y: 0, r: 13, speed: 165, angle: -Math.PI / 2, dashCd: 0, dashTime: 0 },
    loot: 0,
    score: 0,
    timesSpotted: 0,
    alert: 0,
    police: false,
    policeTime: POLICE_TIME,
    timeLeft: LEVELS[0].timeLimit,
    message: '',
    messageTime: 0,
    winStats: null,
    elapsed: 0,
  };
}

export function startLevel(game, index) {
  game.levelIndex = index;
  game.level = buildLevel(LEVELS[index]);
  game.thief.x = game.level.start.x;
  game.thief.y = game.level.start.y;
  game.thief.angle = -Math.PI / 2;
  game.thief.dashCd = 0;
  game.thief.dashTime = 0;
  game.alert = 0;
  game.police = false;
  game.policeTime = POLICE_TIME;
  game.timeLeft = LEVELS[index].timeLimit;
  game.screen = 'playing';
  game.message = LEVELS[index].name;
  game.messageTime = 3;
}

export function startRun(game) {
  game.loot = 0;
  game.score = 0;
  game.timesSpotted = 0;
  game.winStats = null;
  startLevel(game, 0);
}

function moveThief(game, dt, input) {
  const t = game.thief;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    t.angle = Math.atan2(my, mx);
  }
  t.dashCd = Math.max(0, t.dashCd - dt);
  if (input.dash && t.dashCd <= 0 && (mx || my)) {
    t.dashTime = 0.16;
    t.dashCd = 1.1;
    input.dash = false;
    game.onDash?.();
  }
  const speed = t.speed * (t.dashTime > 0 ? 2.4 : 1);
  t.dashTime = Math.max(0, t.dashTime - dt);
  const nx = t.x + mx * speed * dt;
  const ny = t.y + my * speed * dt;
  if (!circleHitsWalls(game.level.walls, nx, t.y, t.r)) t.x = clamp(nx, t.r, FLOOR_W - t.r);
  if (!circleHitsWalls(game.level.walls, t.x, ny, t.r)) t.y = clamp(ny, t.r, FLOOR_H - t.r);
}

function updateGuards(game, dt) {
  for (const g of game.level.guards) {
    if (g.chasing) {
      // Chase the thief for a few seconds, then give up and resume the patrol.
      g.chaseTime -= dt;
      const d = dist(g.x, g.y, game.thief.x, game.thief.y);
      if (d > 1) {
        g.angle = Math.atan2(game.thief.y - g.y, game.thief.x - g.x);
        const sp = g.speed * 1.35;
        const nx = g.x + Math.cos(g.angle) * sp * dt;
        const ny = g.y + Math.sin(g.angle) * sp * dt;
        if (!circleHitsWalls(game.level.walls, nx, g.y, 14)) g.x = nx;
        if (!circleHitsWalls(game.level.walls, g.x, ny, 14)) g.y = ny;
      }
      if (g.chaseTime <= 0) g.chasing = false;
      continue;
    }
    if (g.wait > 0) { g.wait -= dt; continue; }
    const wp = g.waypoints[g.target];
    const d = dist(g.x, g.y, wp.x, wp.y);
    if (d < 6) {
      g.target = (g.target + 1) % g.waypoints.length;
      g.wait = g.pause;
      continue;
    }
    const ang = Math.atan2(wp.y - g.y, wp.x - g.x);
    g.angle += clamp(angleDiff(ang, g.angle), -3.2 * dt, 3.2 * dt);
    g.x += Math.cos(g.angle) * g.speed * dt;
    g.y += Math.sin(g.angle) * g.speed * dt;
  }
}

function updateCameras(game, dt) {
  for (const c of game.level.cameras) {
    c.phase += dt * c.speed;
    c.angle = c.baseAngle + Math.sin(c.phase) * c.sweep;
  }
}

function updateDetection(game, dt) {
  const t = game.thief;
  let seen = false;
  let seenByGuard = null;
  for (const g of game.level.guards) {
    if (inCone(game.level.walls, g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, t.x, t.y)) {
      seen = true;
      seenByGuard = g;
      break;
    }
  }
  if (!seen) {
    for (const c of game.level.cameras) {
      if (inCone(game.level.walls, c.x, c.y, c.angle, c.range, CAM_HALF_ANGLE, t.x, t.y)) {
        seen = true;
        break;
      }
    }
  }
  if (seen) {
    const wasLow = game.alert < 100;
    game.alert = clamp(game.alert + 42 * dt, 0, 100);
    if (seenByGuard && !seenByGuard.chasing) {
      seenByGuard.chasing = true;
      seenByGuard.chaseTime = 4;
    }
    if (game.alert >= 100 && wasLow) {
      game.police = true;
      game.policeTime = POLICE_TIME;
      game.timesSpotted += 1;
      game.score = Math.max(0, game.score - SPOT_PENALTY);
      game.message = 'SPOTTED! Police are on the way — get out!';
      game.messageTime = 3;
      game.onSpotted?.();
    }
  } else {
    game.alert = clamp(game.alert - 9 * dt, 0, 100);
  }
  // Caught on contact with a chasing guard.
  for (const g of game.level.guards) {
    if (dist(g.x, g.y, t.x, t.y) < 26) {
      game.screen = 'caught';
      game.onCaught?.();
      return;
    }
  }
}

function updateInteract(game, dt, input) {
  const t = game.thief;
  const lv = game.level;
  // Pick up loose loot.
  for (const item of lv.loot) {
    if (!item.taken && dist(t.x, t.y, item.x, item.y) < 34) {
      item.taken = true;
      game.loot += item.value;
      game.score += item.value;
      game.message = `+$${item.value} loot`;
      game.messageTime = 1.5;
      game.onPickup?.();
    }
  }
  // Crack the vault by holding E beside it.
  const nearVault = dist(t.x, t.y, lv.vault.x, lv.vault.y) < 52;
  if (nearVault && !lv.vault.cracked) {
    if (input.interact) {
      lv.vault.progress += dt / CRACK_TIME;
      if (Math.floor(lv.vault.progress * 12) !== Math.floor((lv.vault.progress - dt / CRACK_TIME) * 12)) {
        game.onVaultTick?.();
      }
      if (lv.vault.progress >= 1) {
        lv.vault.cracked = true;
        lv.vault.progress = 1;
        game.loot += lv.vault.value;
        game.score += lv.vault.value;
        game.message = `Vault cracked! +$${lv.vault.value} — now reach the exit!`;
        game.messageTime = 3;
        game.onVaultOpen?.();
      }
    } else {
      lv.vault.progress = Math.max(0, lv.vault.progress - dt * 0.5);
    }
  }
  // Escape: vault cracked and thief reaches the green exit.
  if (lv.vault.cracked && dist(t.x, t.y, lv.exit.x, lv.exit.y) < 36) {
    const bonus = Math.round(game.timeLeft) * 2;
    game.score += bonus;
    game.winStats = {
      level: game.levelIndex + 1,
      loot: game.loot,
      timeBonus: bonus,
      spotted: game.timesSpotted,
      score: game.score,
    };
    if (game.levelIndex + 1 < LEVELS.length) {
      game.message = `Floor cleared! +$${bonus} time bonus`;
      game.messageTime = 2;
      game.onLevelClear?.();
      startLevel(game, game.levelIndex + 1);
    } else {
      game.screen = 'win';
      game.onWin?.();
    }
  }
}

export function update(game, dt, input) {
  if (game.screen !== 'playing') return;
  game.elapsed += dt;
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    game.screen = 'timeup';
    game.onTimeUp?.();
    return;
  }
  if (game.police) {
    game.policeTime -= dt;
    if (game.policeTime <= 0) {
      game.policeTime = 0;
      game.screen = 'caught';
      game.onCaught?.();
      return;
    }
  }
  if (game.messageTime > 0) game.messageTime -= dt;
  moveThief(game, dt, input);
  updateGuards(game, dt);
  updateCameras(game, dt);
  updateDetection(game, dt);
  if (game.screen !== 'playing') return;
  updateInteract(game, dt, input);
}
