# CLAUDE.md

## Project Overview

**Bagit Catch Game** is a browser-based arcade game where players control a cat to catch falling baguettes. Built with vanilla HTML5, CSS3, and JavaScript (no frameworks or build tools). Deployed via GitHub Pages at `bagit.explorium.ninja`.

- **License**: MIT
- **Author**: Maayan Yosef

## Repository Structure

```
bagit-catch-game/
├── index.html          # Entry point — HTML structure, meta tags, Google Analytics
├── game.js             # All game logic (634 lines, single file)
├── css/
│   └── style.css       # All styling — responsive design with media queries
├── assets/
│   ├── background.png  # Start screen background
│   ├── github.png      # Cat sprite
│   ├── github-stars.png# Star reward animation image
│   ├── apple-touch-icon.png
│   ├── screenshot.png  # README screenshot
│   └── sound.mp3       # Baguette catch sound effect
├── favicon.ico
├── CNAME               # Custom domain: bagit.explorium.ninja
└── README.md           # Player-facing documentation
```

## Tech Stack

- **HTML5 Canvas** for game rendering
- **Vanilla JavaScript** — no frameworks, no bundler, no npm
- **CSS3** with responsive breakpoints (480px, 768px)
- **Web Audio API** for sound effects
- **Google Apps Script** as backend for leaderboard (POST scores, GET leaderboard)
- **Google Analytics** (GA tag: G-XHEC3V0NPY)

## Development Workflow

### No Build Step

This project has **no build tools, no package.json, no transpilation**. Files are served directly. To develop locally, open `index.html` in a browser or use any static file server.

### Deployment

Deployed via **GitHub Pages** from the `main` branch. The `CNAME` file maps to `bagit.explorium.ninja`. Any push to `main` triggers deployment.

### Testing

There are **no automated tests**. Testing is manual — open the game in a browser and verify gameplay on desktop and mobile.

## Architecture

### game.js — Single File Architecture

All game logic lives in `game.js`, organized into numbered sections:

| Section | Purpose |
|---------|---------|
| 1 | Variable declarations — DOM refs, game state, cat object |
| 2 | `resizeCanvas()` — responsive canvas and cat sizing |
| 3 | Event handlers — touch/click helpers, keyboard, mouse, mobile controls |
| 4 | Movement functions — `moveLeft()`, `moveRight()`, `jump()`, `updateCat()` |
| 5 | `startGame()` / `stopGame()` — game lifecycle |
| 6 | Game loop — `updateGame()`, `drawCat()`, `drawSidewalk()`, `spawnBaguette()`, `updateBaguettes()`, `checkCollisions()`, `checkMissedBaguettes()` |
| 7 | `endGame()` / `showLeaderboard()` — score submission and leaderboard display |
| 8 | `unlockAudio()` — iOS audio context workaround |
| 9 | Touchmove pinch-zoom prevention |
| 10 | Window load and visibility change handlers |

### Key Game Mechanics

- **Game duration**: 60 seconds countdown
- **Scoring**: +1 per catch, -1 per miss (floor at 0)
- **Stars**: +1 star every 10 catches, +2 bonus stars every 100 catches
- **Difficulty scaling**: Baguette spawn rate increases with score (`Math.min(0.03, 0.01 + score / 500)`)
- **Physics**: Gravity-based jumping with velocity (`gravity: 1.5`, `velocityY` accumulator)
- **Game loop**: Runs at ~60 FPS via `setInterval(updateGame, 1000/60)`

### Baguette Rendering

Baguettes are **DOM `<img>` elements** (not canvas-drawn). They are appended to `document.body`, positioned absolutely, and removed on catch or miss. The baguette image is loaded from an external Slack emoji CDN URL.

### Collision Detection

Bounding-box collision between the canvas-based cat (`cat.x`, `cat.y`, `cat.width`, `cat.height`) and DOM baguette elements (`getBoundingClientRect()`).

### Leaderboard

- **Backend**: Google Apps Script endpoint (POST to submit, GET to fetch)
- **Data**: nickname, score, stars, platform (mobile/desktop), timestamp
- **Display**: HTML table injected into `#leaderboard` div

## Platform Support

### Desktop

- Mouse tracking moves the cat horizontally
- Arrow keys for left/right movement
- Space / Up arrow for jump
- Full-size cat sprite (120×90px)

### Mobile

- Touch button controls at bottom of screen (←, ↑, →)
- Continuous movement via `setInterval` on touch-hold
- Tap/touch on canvas for jump
- Smaller sprites on screens ≤480px (cat: 80×60px, baguette: 30×60px)
- Slower baguette fall speed (`speedYBase: 1.5` vs desktop `2`)
- iOS audio unlock workaround (`unlockAudio()`)

## Coding Conventions

- **No modules or imports** — everything is global scope in a single JS file
- **Section comments** — numbered `/**** N) Title ****/` block comments separate logical areas
- **DOM elements** — referenced via `document.getElementById()` at file top
- **Mobile detection** — `isMobile` flag based on touch events + user agent sniffing
- **Event handling** — `{ passive: false }` on touch events to allow `preventDefault()`
- **CSS naming** — IDs for unique elements (`#gameControls`, `#scoreboard`), classes for repeated elements (`.baguette`, `.controlButton`)
- **Colors** — Primary accent: `#FF5722` (deep orange), background: black, sidewalk: `#a9a9a9`

## Common Pitfalls

- **Audio on iOS**: Browsers block autoplay. The `unlockAudio()` function must run on first user interaction. Any changes to audio playback must account for this.
- **Baguettes are DOM elements**: They live in `document.body`, not on the canvas. Collision detection mixes canvas coordinates with `getBoundingClientRect()`. Keep this hybrid approach consistent.
- **No cleanup on hot reload**: The game appends baguette `<img>` elements to the body. If the game restarts without calling `clearBaguettes()`, orphan elements will pile up.
- **External asset URLs**: Cat sprite and baguette image are loaded from `bagit.explorium.ninja` and `emoji.slack-edge.com` respectively. These URLs must remain accessible.
- **Single-file constraint**: All JS is in `game.js`. Refactoring into modules would require adding a bundler or switching to ES modules with a server.

## Making Changes

When modifying this project:

1. **Keep it simple** — No build tools, no frameworks. Vanilla JS only.
2. **Test on both desktop and mobile** — The game has significantly different behavior on each platform.
3. **Preserve the section comment structure** in `game.js` — it's the only organizational pattern.
4. **Be careful with the game loop** — `setInterval` at 60 FPS means performance matters. Avoid heavy DOM operations inside `updateGame()`.
5. **Audio changes** require testing on iOS Safari specifically.
6. **CSS changes** must be tested at all three breakpoints: desktop, ≤768px, and ≤480px.
