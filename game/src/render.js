// Canvas rendering for "The Midnight Vault".
// One clear visual language: dark floor, amber loot, red danger cones, green exit.
import { TILE, FLOOR_W, FLOOR_H, LEVELS } from './levels.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE, CAM_HALF_ANGLE } from './engine.js';

const FLOOR_A = '#1c1f2a';
const FLOOR_B = '#20242f';
const WALL = '#3a4157';
const WALL_TOP = '#4b5470';

function drawCone(ctx, x, y, angle, range, halfAngle, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < FLOOR_H / TILE; ty++) {
    for (let tx = 0; tx < FLOOR_W / TILE; tx++) {
      ctx.fillStyle = (tx + ty) % 2 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FLOOR_W; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FLOOR_H); ctx.stroke();
  }
  for (let y = 0; y <= FLOOR_H; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FLOOR_W, y); ctx.stroke();
  }
}

function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = WALL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

function drawLoot(ctx, loot) {
  for (const item of loot) {
    if (item.taken) continue;
    const bob = Math.sin(Date.now() / 300 + item.x) * 2;
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(item.x - 2.5, item.y + bob - 2.5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${item.value}`, item.x, item.y + bob - 15);
  }
}

function drawVault(ctx, vault) {
  const { x, y } = vault;
  ctx.fillStyle = vault.cracked ? '#2f6b4f' : '#5b6478';
  ctx.fillRect(x - 24, y - 24, 48, 48);
  ctx.strokeStyle = vault.cracked ? '#7ee2a8' : '#c9d2e8';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 24, y - 24, 48, 48);
  ctx.fillStyle = '#20242f';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = vault.cracked ? '#7ee2a8' : '#e8b23a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + 9, y - 6);
  ctx.stroke();
  ctx.fillStyle = vault.cracked ? '#7ee2a8' : '#e8b23a';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(vault.cracked ? 'OPEN' : 'VAULT', x, y - 31);
  if (!vault.cracked && vault.progress > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 26, y + 30, 52, 8);
    ctx.fillStyle = '#e8b23a';
    ctx.fillRect(x - 25, y + 31, 50 * vault.progress, 6);
  }
}

function drawExit(ctx, exit, vaultCracked) {
  const pulse = 0.55 + Math.sin(Date.now() / 250) * 0.2;
  ctx.fillStyle = vaultCracked ? `rgba(46,204,113,${pulse})` : 'rgba(120,130,150,0.5)';
  ctx.fillRect(exit.x - 22, exit.y - 22, 44, 44);
  ctx.strokeStyle = vaultCracked ? '#2ecc71' : '#8b95a8';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 22, exit.y - 22, 44, 44);
  ctx.fillStyle = '#0e2418';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x, exit.y + 4);
}

function drawGuard(ctx, g, alert) {
  drawCone(ctx, g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE,
    g.chasing ? 'rgba(255,60,60,0.28)' : 'rgba(255,190,60,0.20)');
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff6b5e';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick + eyes so the patrol direction reads at a glance.
  ctx.strokeStyle = '#ffd9d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GUARD', g.x, g.y - 19);
}

function drawCamera(ctx, c) {
  drawCone(ctx, c.x, c.y, c.angle, c.range, CAM_HALF_ANGLE, 'rgba(255,80,80,0.16)');
  ctx.fillStyle = '#7a1f1f';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff5a5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + Math.cos(c.angle) * 15, c.y + Math.sin(c.angle) * 15);
  ctx.stroke();
  const blink = Math.sin(Date.now() / 200) > 0;
  ctx.fillStyle = blink ? '#ff2e2e' : '#7a1010';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawThief(ctx, thief) {
  const { x, y, angle } = thief;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Shadow + body: a hooded figure in a dark coat with a teal mask.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#232a3d';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#35d0ba';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#35d0ba';
  ctx.beginPath();
  ctx.moveTo(13, 0); ctx.lineTo(2, -6); ctx.lineTo(2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#eaf6f3';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOU', x, y - 19);
}

function drawHud(ctx, game) {
  const W = FLOOR_W;
  ctx.fillStyle = 'rgba(8,10,18,0.92)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`💰 $${game.loot}   Score ${game.score}`, 14, 28);
  ctx.fillText(`${LEVELS[game.levelIndex].name}`, 300, 28);
  const mins = Math.floor(game.timeLeft / 60);
  const secs = Math.floor(game.timeLeft % 60);
  ctx.fillStyle = game.timeLeft < 30 ? '#ff6b5e' : '#e8ecf5';
  ctx.textAlign = 'right';
  ctx.fillText(`⏱ ${mins}:${String(secs).padStart(2, '0')}`, W - 14, 28);
  // Alert meter.
  const ax = W / 2 - 130, ay = 50, aw = 260, ah = 12;
  ctx.fillStyle = 'rgba(8,10,18,0.85)';
  ctx.fillRect(ax - 6, ay - 6, aw + 12, ah + 22);
  ctx.fillStyle = '#222';
  ctx.fillRect(ax, ay, aw, ah);
  const frac = game.alert / 100;
  ctx.fillStyle = frac < 0.5 ? '#f5b942' : '#ff3b30';
  ctx.fillRect(ax, ay, aw * frac, ah);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(ax, ay, aw, ah);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.police ? `🚨 ALARM — POLICE IN ${Math.ceil(game.policeTime)}s` : `ALERT ${Math.round(game.alert)}%`, ax + aw / 2, ay + 26);
  // Bottom help line.
  ctx.fillStyle = 'rgba(8,10,18,0.85)';
  ctx.fillRect(0, FLOOR_H - 26, W, 26);
  ctx.fillStyle = '#aab3c5';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / Arrows move · E hold to crack vault · Space dash · P pause · M mute — crack the vault, then reach EXIT', W / 2, FLOOR_H - 9);
  if (game.messageTime > 0 && game.message) {
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    const mw = ctx.measureText(game.message).width + 28;
    ctx.fillRect((W - mw) / 2, 82, mw, 30);
    ctx.fillStyle = '#ffe08a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(game.message, W / 2, 102);
  }
}

function panel(ctx, title, lines, accent) {
  const W = FLOOR_W, H = FLOOR_H;
  ctx.fillStyle = 'rgba(6,8,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#141828';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  const pw = 560, ph = 110 + lines.length * 30;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, py + 52);
  ctx.fillStyle = '#dfe5f2';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 92 + i * 30));
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, FLOOR_W, FLOOR_H);
  if (game.screen === 'start') {
    drawFloor(ctx);
    panel(ctx, 'THE MIDNIGHT VAULT', [
      'A top-down heist across three floors. Sneak past guards and cameras,',
      'crack the vault, grab the loot and slip out the EXIT before the police arrive.',
      '',
      'WASD / Arrows — move      E — pick up / hold to crack the vault',
      'Space — dash      P — pause      M — mute',
      '',
      'Press ENTER or click to start the job.',
    ], '#f5b942');
    return;
  }
  drawFloor(ctx);
  drawWalls(ctx, game.level.walls);
  drawExit(ctx, game.level.exit, game.level.vault.cracked);
  drawLoot(ctx, game.level.loot);
  drawVault(ctx, game.level.vault);
  for (const c of game.level.cameras) drawCamera(ctx, c);
  for (const g of game.level.guards) drawGuard(ctx, g, game.alert);
  drawThief(ctx, game.thief);
  drawHud(ctx, game);

  if (game.screen === 'paused') {
    panel(ctx, 'PAUSED', ['The crew is holding its breath.', '', 'Press P or click to resume.'], '#8fa3c8');
  } else if (game.screen === 'win') {
    const s = game.winStats || { loot: game.loot, score: game.score, timeBonus: 0, spotted: game.timesSpotted };
    panel(ctx, 'CLEAN GETAWAY!', [
      `All three floors robbed. Loot $${s.loot} · time bonus $${s.timeBonus} · spotted ${s.spotted}×`,
      `FINAL SCORE: ${s.score}`,
      '',
      'Press ENTER to run it back.',
    ], '#2ecc71');
  } else if (game.screen === 'caught') {
    panel(ctx, 'BUSTED!', [
      game.police ? 'The police arrived before you got out.' : 'A guard grabbed you.',
      `Loot kept: $${game.loot} · Score ${game.score}`,
      '',
      'Press ENTER to try again.',
    ], '#ff3b30');
  } else if (game.screen === 'timeup') {
    panel(ctx, 'OUT OF TIME', [
      'Dawn broke and the crew had to scatter.',
      `Loot kept: $${game.loot} · Score ${game.score}`,
      '',
      'Press ENTER to try again.',
    ], '#ff8c42');
  }
}
