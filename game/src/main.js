// Bootstrap, input, game loop and screenshot staging for "The Midnight Vault".
// Screenshot mode: open index.html?shot=<cover|vault|alarm|win>&seed=<n> and the game
// stages that exact moment, then sets window.__shotReady = true once rendered.
import { createGame, startRun, startLevel, update } from './engine.js';
import { render } from './render.js';
import { FLOOR_W, FLOOR_H } from './levels.js';
import { SoundBank } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FLOOR_W;
canvas.height = FLOOR_H;

const game = createGame();
const sounds = new SoundBank();
game.onPickup = () => sounds.pickup();
game.onDash = () => sounds.dash();
game.onVaultTick = () => sounds.vaultTick();
game.onVaultOpen = () => sounds.vaultOpen();
game.onSpotted = () => { sounds.spotted(); sounds.startAlarm(); };
game.onCaught = () => { sounds.stopAlarm(); sounds.lose(); };
game.onTimeUp = () => { sounds.stopAlarm(); sounds.lose(); };
game.onWin = () => { sounds.stopAlarm(); sounds.win(); };
game.onLevelClear = () => sounds.win();

const input = { up: false, down: false, left: false, right: false, interact: false, dash: false };
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyE: 'interact',
};

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = true;
  if (e.code === 'Space' && !e.repeat) input.dash = true;
  if (e.code === 'KeyM' && !e.repeat) sounds.toggleMute();
  if (e.code === 'KeyP' && !e.repeat) {
    if (game.screen === 'playing') { game.screen = 'paused'; sounds.stopAlarm(); }
    else if (game.screen === 'paused') game.screen = 'playing';
  }
  if (e.code === 'Enter' && !e.repeat) {
    sounds.ensure();
    if (game.screen === 'start' || game.screen === 'win' || game.screen === 'caught' || game.screen === 'timeup') {
      sounds.click();
      startRun(game);
    }
  }
});
window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) input[mapped] = false;
});
canvas.addEventListener('mousedown', () => {
  sounds.ensure();
  if (game.screen === 'start' || game.screen === 'win' || game.screen === 'caught' || game.screen === 'timeup') {
    startRun(game);
  } else if (game.screen === 'paused') {
    game.screen = 'playing';
  }
});

// Deterministic staged scenes for screenshots. Each one is the real game
// rendered in its normal playing state (or win screen), never a mock-up.
function stageShot(name) {
  if (name === 'cover') {
    startRun(game);
    // Thief mid-room, a guard's cone sweeping over the floor, a camera,
    // loose loot and a half-full alert meter — all in one frame.
    game.thief.x = 470; game.thief.y = 330; game.thief.angle = Math.PI / 6;
    game.level.guards[0].x = 640; game.level.guards[0].y = 250;
    game.level.guards[0].angle = Math.PI * 0.75;
    // Put the camera where its dot and cone both read clearly (not under the HUD).
    game.level.cameras[0].x = 760; game.level.cameras[0].y = 110;
    game.level.cameras[0].angle = Math.PI * 0.7;
    game.messageTime = 0;
    game.alert = 55;
    game.loot = 270; game.score = 270;
    game.level.loot[0].taken = true;
  } else if (name === 'vault') {
    startRun(game);
    game.thief.x = game.level.vault.x - 46; game.thief.y = game.level.vault.y + 10;
    game.thief.angle = 0;
    game.level.vault.progress = 0.72;
    input.interact = true;
    game.loot = 430; game.score = 430;
    game.alert = 30;
    game.messageTime = 0;
  } else if (name === 'alarm') {
    startRun(game);
    game.thief.x = 300; game.thief.y = 420; game.thief.angle = -Math.PI / 3;
    game.level.guards[0].x = 380; game.level.guards[0].y = 380;
    game.level.guards[0].angle = Math.PI * 0.9;
    game.level.guards[0].chasing = true; game.level.guards[0].chaseTime = 4;
    game.level.cameras[0].x = 760; game.level.cameras[0].y = 110;
    game.level.cameras[0].angle = Math.PI * 0.7;
    game.alert = 100;
    game.police = true;
    game.policeTime = 17;
    game.timesSpotted = 1;
    game.loot = 620; game.score = 595;
    game.message = 'SPOTTED! Police are on the way — get out!';
    game.messageTime = 99;
  } else if (name === 'win') {
    startRun(game);
    game.screen = 'win';
    game.winStats = { level: 3, loot: 2840, timeBonus: 96, spotted: 1, score: 2911 };
    game.loot = 2840; game.score = 2911; game.timesSpotted = 1;
    game.messageTime = 0;
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) stageShot(shot);

// Exposed for local play-testing only (never used by the game itself).
window.__heist = { game, input, startRun, startLevel };

let last = performance.now();
let shotReadyFired = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(game, dt, input);
  render(ctx, game);
  if (shot && !shotReadyFired) {
    shotReadyFired = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
