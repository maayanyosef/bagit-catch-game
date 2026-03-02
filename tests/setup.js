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
    <div id="scoreboard" style="display:none">
      <span class="hud-item"><span class="hud-label">Time</span><span class="hud-value" id="time">60</span>s</span>
      <span class="hud-sep"></span>
      <span class="hud-item"><span class="hud-label">Score</span><span class="hud-value" id="score">0</span></span>
      <span class="hud-sep"></span>
      <span class="hud-item"><span class="hud-label">Stars</span><span class="hud-value" id="stars">0</span></span>
    </div>
    <button id="startButton"></button>
    <button id="stopButton" style="display:none"></button>
    <img id="starImage" style="display:none" />
    <input type="text" id="nicknameInput" placeholder="Enter your nickname" />
    <div id="leaderboard" style="display:none"></div>
    <audio id="catchSound"></audio>
    <div id="mobileControls" style="display:none"></div>
    <button id="leftButton"></button>
    <button id="rightButton"></button>
    <button id="jumpButton"></button>
    <div id="gameControls" style="display:flex"></div>
    <div id="orientationWarning" style="display:none"><button id="dismissOrientation" aria-label="Dismiss">&times;</button></div>
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

// Stub canvas 2D context — uses a Proxy so any method game.js calls
// that is not explicitly listed returns a no-op jest.fn().
HTMLCanvasElement.prototype.getContext = function() {
  const explicitMethods = {
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
    scale: jest.fn(),
    rotate: jest.fn(),
    ellipse: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    setTransform: jest.fn(),
    resetTransform: jest.fn(),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createPattern: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 10 })),
  };

  // Writable properties with defaults
  let _font = '';
  let _fillStyle = '';
  let _strokeStyle = '';
  let _textAlign = '';
  let _textBaseline = '';
  let _globalAlpha = 1;
  let _shadowColor = '';
  let _shadowBlur = 0;
  let _lineWidth = 1;
  let _lineCap = 'butt';
  let _lineJoin = 'miter';
  let _globalCompositeOperation = 'source-over';

  const properties = {
    get font()        { return _font; },
    set font(v)       { _font = v; },
    get fillStyle()   { return _fillStyle; },
    set fillStyle(v)  { _fillStyle = v; },
    get strokeStyle() { return _strokeStyle; },
    set strokeStyle(v){ _strokeStyle = v; },
    get textAlign()   { return _textAlign; },
    set textAlign(v)  { _textAlign = v; },
    get textBaseline(){ return _textBaseline; },
    set textBaseline(v){ _textBaseline = v; },
    get globalAlpha() { return _globalAlpha; },
    set globalAlpha(v){ _globalAlpha = v; },
    get shadowColor() { return _shadowColor; },
    set shadowColor(v){ _shadowColor = v; },
    get shadowBlur()  { return _shadowBlur; },
    set shadowBlur(v) { _shadowBlur = v; },
    get lineWidth()   { return _lineWidth; },
    set lineWidth(v)  { _lineWidth = v; },
    get lineCap()     { return _lineCap; },
    set lineCap(v)    { _lineCap = v; },
    get lineJoin()    { return _lineJoin; },
    set lineJoin(v)   { _lineJoin = v; },
    get globalCompositeOperation() { return _globalCompositeOperation; },
    set globalCompositeOperation(v){ _globalCompositeOperation = v; },
  };

  const target = Object.defineProperties(explicitMethods,
    Object.getOwnPropertyDescriptors(properties)
  );

  // Proxy catches any method not explicitly stubbed and returns a no-op jest.fn()
  const cache = {};
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      if (typeof prop === 'string') {
        if (!cache[prop]) cache[prop] = jest.fn();
        return cache[prop];
      }
      return undefined;
    },
    set(obj, prop, value) {
      obj[prop] = value;
      return true;
    },
  });
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
