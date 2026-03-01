/**
 * Jest setup — build the minimal DOM that game.js expects before each test file.
 * We expose a global `loadGame()` helper so tests can inject the game script
 * into the current jsdom window after customising the environment.
 */
const fs   = require('fs');
const path = require('path');

// ------------------------------------------------------------------
// Build the DOM skeleton that game.js wires up at parse time
// ------------------------------------------------------------------
function buildDOM() {
  document.body.innerHTML = `
    <canvas id="gameCanvas"></canvas>
    <div id="scoreboard" style="display:none"></div>
    <button id="startButton"></button>
    <button id="stopButton" style="display:none"></button>
    <img id="starImage" style="display:none" />
    <input type="text" id="nicknameInput" placeholder="Enter your nickname" />
    <div id="leaderboard" style="display:none"></div>
    <span id="time">60</span>
    <span id="score">0</span>
    <span id="stars">0</span>
    <audio id="catchSound"></audio>
    <div id="mobileControls" style="display:none"></div>
    <button id="leftButton"></button>
    <button id="rightButton"></button>
    <button id="jumpButton"></button>
    <div id="gameControls" style="display:flex"></div>
    <div id="orientationWarning" style="display:none"></div>
    <div id="pauseOverlay" style="display:none"></div>
    <div id="comboDisplay" style="display:none"></div>
    <div id="powerupDisplay"></div>
    <div id="personalBest"></div>
    <div id="endScoreSummary" style="display:none"></div>
    <button id="pauseButton"></button>
    <button id="resumeButton"></button>
    <button class="diffBtn active" data-diff="easy"></button>
    <button class="diffBtn" data-diff="normal"></button>
    <button class="diffBtn" data-diff="hard"></button>
  `;
}

// Stub canvas 2D context
HTMLCanvasElement.prototype.getContext = function() {
  return {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    ellipse: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 10 })),
    get font() { return ''; },
    set font(_) {},
    get fillStyle() { return ''; },
    set fillStyle(_) {},
    get strokeStyle() { return ''; },
    set strokeStyle(_) {},
    get textAlign() { return ''; },
    set textAlign(_) {},
    get textBaseline() { return ''; },
    set textBaseline(_) {},
    get globalAlpha() { return 1; },
    set globalAlpha(_) {},
    get shadowColor() { return ''; },
    set shadowColor(_) {},
    get shadowBlur() { return 0; },
    set shadowBlur(_) {},
    get lineWidth() { return 1; },
    set lineWidth(_) {},
  };
};

// Stub audio
window.HTMLMediaElement.prototype.play  = jest.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = jest.fn();

// Stub fetch (leaderboard calls)
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve([]) })
);

// ------------------------------------------------------------------
// loadGame() — evaluate game.js in the current window context.
// Call this at the top of each test file (or beforeEach).
// ------------------------------------------------------------------
global.buildDOM  = buildDOM;
global.loadGame  = function() {
  buildDOM();
  const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  // game.js is plain inline script; eval it in global scope
  // eslint-disable-next-line no-eval
  eval.call(window, src);
};
