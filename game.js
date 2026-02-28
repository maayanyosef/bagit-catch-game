    /**********************************************
     * 1) Declare Variables Before Using Them
     **********************************************/
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreboard = document.getElementById('scoreboard');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const starImage = document.getElementById('starImage');
    const nicknameInput = document.getElementById('nicknameInput');
    const leaderboard = document.getElementById('leaderboard');
    const timeElement = document.getElementById('time');
    const scoreElement = document.getElementById('score');
    const starsElement = document.getElementById('stars');
    const catchSound = document.getElementById('catchSound');
    const body = document.body;
    const mobileControls = document.getElementById('mobileControls');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    const jumpButton = document.getElementById('jumpButton');
    const gameControls = document.getElementById('gameControls');
    const orientationWarning = document.getElementById('orientationWarning');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const comboDisplay = document.getElementById('comboDisplay');
    const powerupDisplay = document.getElementById('powerupDisplay');
    const personalBestEl = document.getElementById('personalBest');
    const endScoreSummary = document.getElementById('endScoreSummary');

    // Detect mobile devices
    const isMobile =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Difficulty settings
    let selectedDifficulty = 'easy';
    const DIFFICULTY = {
      easy:   { time: 90, speedBase: isMobile ? 1.2 : 1.5, speedMax: 4, spawnMin: 0.008, spawnMax: 0.03, missPenalty: 0 },
      normal: { time: 60, speedBase: isMobile ? 1.5 : 2,   speedMax: 6, spawnMin: 0.010, spawnMax: 0.04, missPenalty: 1 },
      hard:   { time: 45, speedBase: isMobile ? 2.0 : 2.8, speedMax: 9, spawnMin: 0.015, spawnMax: 0.06, missPenalty: 2 }
    };

    // Personal best (localStorage, per difficulty)
    function getPBKey(diff) { return `bagit_pb_${diff}`; }
    function getPersonalBest(diff) { return parseInt(localStorage.getItem(getPBKey(diff)) || '0', 10); }
    function savePersonalBest(diff, s) {
      if (s > getPersonalBest(diff)) localStorage.setItem(getPBKey(diff), s);
    }
    function updatePersonalBestDisplay() {
      const pb = getPersonalBest(selectedDifficulty);
      personalBestEl.textContent = pb > 0 ? `🏅 Your best (${selectedDifficulty}): ${pb}` : '';
    }

    // Wire up difficulty buttons
    document.querySelectorAll('.diffBtn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.diffBtn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedDifficulty = this.dataset.diff;
        updatePersonalBestDisplay();
      });
    });
    updatePersonalBestDisplay();

    // Global game variables
    let score = 0;
    let stars = 0;
    let time = 60;
    let gameInterval;
    let timerInterval;
    let baguettes = [];
    let endGameTriggered = false;
    let isPaused = false;
    let currentNickname = '';

    // Combo system
    let combo = 0;
    let comboTimer = null;
    const COMBO_TIMEOUT = 2000; // ms without catch resets combo

    // Power-up system
    let powerups = [];
    let activePowerups = {};
    // activePowerups keys: 'speed', 'magnet', 'points'
    let powerupTimers = {};

    // Particles
    let particles = [];

    // Cat object declared BEFORE usage in resizeCanvas
    let cat = {
      x: canvas.width / 2,
      y: canvas.height - 150,
      width: 120,
      height: 90,
      isJumping: false,
      jumpHeight: canvas.height * 2,
      initialY: canvas.height - 150,
      velocityY: 0,
      gravity: 1.5,
      speed: isMobile ? 8 : 10
    };

    // Adjust cat size for small screens
    if (window.innerWidth <= 480) {
      cat.width = 80;
      cat.height = 60;
    }

    /**********************************************
     * 2) Resize Canvas Function
     **********************************************/
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initClouds();

      cat.initialY = canvas.height - 150;
      if (!cat.isJumping) {
        cat.y = cat.initialY;
      }
      if (window.innerWidth <= 480) {
        cat.width = 80;
        cat.height = 60;
      } else {
        cat.width = 120;
        cat.height = 90;
      }

      if (orientationWarning && isMobile && window.innerHeight > window.innerWidth) {
        orientationWarning.style.display = 'none';
      }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    const catImg = new Image();
    catImg.src = 'https://bagit.explorium.ninja/assets/github.png';

    /**********************************************
     * 3) Helper for Both Touch & Click
     **********************************************/
    function addTouchEventHandler(element, callback) {
      element.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }, { passive: false });
      element.addEventListener('click', function(e) {
        e.preventDefault();
        callback();
      });
    }

    addTouchEventHandler(startButton, startGame);
    addTouchEventHandler(stopButton, stopGame);

    canvas.addEventListener('click', jump);
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      jump();
    }, { passive: false });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        moveLeft();
      } else if (event.key === 'ArrowRight') {
        moveRight();
      } else if (event.key === ' ' || event.key === 'ArrowUp') {
        jump();
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        togglePause();
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (!isMobile && !isPaused) {
        cat.x = event.clientX - cat.width / 2;
        cat.x = Math.max(0, Math.min(cat.x, canvas.width - cat.width));
      }
    });

    document.addEventListener('touchmove', function (event) {
      if (!isMobile) {
        const touch = event.touches[0];
        cat.x = touch.clientX - cat.width / 2;
        cat.x = Math.max(0, Math.min(cat.x, canvas.width - cat.width));
        event.preventDefault();
      }
    }, { passive: false });

    if (isMobile) {
      let leftInterval, rightInterval;
      jumpButton.addEventListener('touchstart', function (e) {
        e.preventDefault();
        jump();
      }, { passive: false });
      leftButton.addEventListener('touchstart', function (e) {
        e.preventDefault();
        clearInterval(leftInterval);
        leftInterval = setInterval(() => { moveLeft(); }, 16);
      }, { passive: false });
      leftButton.addEventListener('touchend', function (e) {
        e.preventDefault();
        clearInterval(leftInterval);
      }, { passive: false });
      rightButton.addEventListener('touchstart', function (e) {
        e.preventDefault();
        clearInterval(rightInterval);
        rightInterval = setInterval(() => { moveRight(); }, 16);
      }, { passive: false });
      rightButton.addEventListener('touchend', function (e) {
        e.preventDefault();
        clearInterval(rightInterval);
      }, { passive: false });
      document.addEventListener('touchend', function () {
        clearInterval(leftInterval);
        clearInterval(rightInterval);
      });
    }

    // Pause button (mobile)
    const pauseButton = document.getElementById('pauseButton');
    if (pauseButton) {
      addTouchEventHandler(pauseButton, togglePause);
    }

    /**********************************************
     * 4) Pause
     **********************************************/
    function togglePause() {
      // Only pause if game is running
      if (gameControls.style.display === 'flex' || endGameTriggered) return;
      isPaused = !isPaused;
      if (isPaused) {
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        pauseOverlay.style.display = 'flex';
      } else {
        pauseOverlay.style.display = 'none';
        gameInterval = setInterval(updateGame, 1000 / 60);
        timerInterval = setInterval(() => {
          if (time > 0) {
            time--;
            timeElement.textContent = time;
          } else if (!endGameTriggered) {
            clearInterval(timerInterval);
            endGame(currentNickname);
          }
        }, 1000);
      }
    }

    /**********************************************
     * 5) Movement & Game Functions
     **********************************************/
    function moveLeft() {
      if (isPaused) return;
      cat.x -= cat.speed;
      cat.x = Math.max(0, cat.x);
    }
    function moveRight() {
      if (isPaused) return;
      cat.x += cat.speed;
      cat.x = Math.min(cat.x, canvas.width - cat.width);
    }
    function jump() {
      if (isPaused) return;
      if (!cat.isJumping) {
        cat.isJumping = true;
        cat.velocityY = -cat.jumpHeight * 2;
      }
    }

    function updateCat() {
      // Magnet: pull nearby baguettes toward cat
      if (activePowerups['magnet']) {
        baguettes.forEach((b) => {
          const bx = parseFloat(b.style.left) + 25;
          const by = parseFloat(b.style.top) + 50;
          const cx = cat.x + cat.width / 2;
          const cy = cat.y + cat.height / 2;
          const dx = cx - bx;
          const dy = cy - by;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const pull = 3;
            b.style.left = `${parseFloat(b.style.left) + (dx / dist) * pull}px`;
            b.style.top = `${parseFloat(b.style.top) + (dy / dist) * pull}px`;
          }
        });
      }

      if (cat.isJumping) {
        cat.y += cat.velocityY;
        cat.velocityY += cat.gravity;
        if (cat.y > cat.initialY) {
          cat.y = cat.initialY;
          cat.isJumping = false;
          cat.velocityY = 0;
        }
      }
    }

    /**********************************************
     * 6) Start & Stop Game
     **********************************************/
    function startGame() {
      if (orientationWarning) orientationWarning.style.display = 'none';

      const nickname = nicknameInput.value.trim();
      if (!nickname) {
        alert('Please enter your nickname!');
        return;
      }
      currentNickname = nickname;

      body.classList.remove('start');
      gameControls.style.display = 'none';
      leaderboard.style.display = 'none';
      stopButton.style.display = 'block';
      scoreboard.style.display = 'block';
      if (pauseButton) pauseButton.style.display = 'block';

      if (isMobile) mobileControls.style.display = 'flex';

      score = 0;
      stars = 0;
      time = DIFFICULTY[selectedDifficulty].time;
      combo = 0;
      activePowerups = {};
      powerupTimers = {};
      particles = [];
      isPaused = false;
      endGameTriggered = false;

      timeElement.textContent = time;
      scoreElement.textContent = score;
      starsElement.textContent = stars;
      updateComboDisplay();
      updatePowerupDisplay();

      cat.y = cat.initialY;
      cat.isJumping = false;
      cat.velocityY = 0;
      cat.speed = isMobile ? 8 : 10;

      pauseOverlay.style.display = 'none';
      comboDisplay.style.display = 'none';

      // Show 3-2-1-GO! countdown then start
      let count = 3;
      const fontSize = Math.min(canvas.width, canvas.height) * 0.22;

      function drawCountStep() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawSidewalk();
        drawCat();

        ctx.save();
        if (count > 0) {
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255, 87, 34, 0.92)';
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 20;
          ctx.fillText(count, canvas.width / 2, canvas.height / 2);
          count--;
          setTimeout(drawCountStep, 750);
        } else {
          ctx.font = `bold ${fontSize * 0.85}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(39, 174, 96, 0.95)';
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 20;
          ctx.fillText('GO! 🐱', canvas.width / 2, canvas.height / 2);
          setTimeout(() => {
            gameInterval = setInterval(updateGame, 1000 / 60);
            timerInterval = setInterval(() => {
              if (time > 0) {
                time--;
                timeElement.textContent = time;
              } else if (!endGameTriggered) {
                clearInterval(timerInterval);
                endGame(currentNickname);
              }
            }, 1000);
          }, 550);
        }
        ctx.restore();
      }

      drawCountStep();
    }

    function stopGame() {
      clearInterval(gameInterval);
      clearInterval(timerInterval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stopButton.style.display = 'none';
      if (pauseButton) pauseButton.style.display = 'none';
      scoreboard.style.display = 'none';
      mobileControls.style.display = 'none';
      pauseOverlay.style.display = 'none';
      comboDisplay.style.display = 'none';
      powerupDisplay.textContent = '';
      score = 0;
      stars = 0;
      combo = 0;
      isPaused = false;
      activePowerups = {};
      clearBaguettes();
      clearPowerups();
      particles = [];
      body.classList.add('start');
      gameControls.style.display = 'flex';
      endScoreSummary.style.display = 'none';
      updatePersonalBestDisplay();
    }

    /**********************************************
     * 7) Power-Ups
     **********************************************/
    const POWERUP_TYPES = [
      { type: 'speed',  color: '#FFD700', label: '⚡ Speed!',   duration: 5000 },
      { type: 'magnet', color: '#00BFFF', label: '🧲 Magnet!',  duration: 6000 },
      { type: 'points', color: '#00CC44', label: '💚 +10 pts!', duration: 0    },
      { type: 'shield', color: '#9B59B6', label: '🛡️ Shield!',  duration: 0    },
      { type: 'time',   color: '#1ABC9C', label: '⏱️ +5s!',     duration: 0    },
    ];

    function spawnPowerup() {
      const def = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      const x = Math.random() * (canvas.width - 60) + 10;
      const pu = document.createElement('div');
      pu.className = 'powerup';
      pu.dataset.type = def.type;
      pu.dataset.speedY = 1.5;
      pu.style.left = `${x}px`;
      pu.style.top = `0px`;
      pu.style.background = def.color;
      pu.style.boxShadow = `0 0 12px ${def.color}`;
      const emojiMap = { speed: '⚡', magnet: '🧲', points: '💚', shield: '🛡️', time: '⏱️' };
      pu.textContent = emojiMap[def.type] || '✨';
      document.body.appendChild(pu);
      powerups.push({ el: pu, def });
    }

    function updatePowerups() {
      // Spawn chance: low but grows
      const puRate = 0.003 + score / 2000;
      if (Math.random() < puRate) spawnPowerup();

      powerups = powerups.filter(({ el, def }) => {
        const top = parseFloat(el.style.top) + parseFloat(el.dataset.speedY);
        el.style.top = `${top}px`;

        // Collision with cat
        const rect = el.getBoundingClientRect();
        const catRect = { left: cat.x, top: cat.y, right: cat.x + cat.width, bottom: cat.y + cat.height };
        if (catRect.left < rect.right && catRect.right > rect.left &&
            catRect.top < rect.bottom && catRect.bottom > rect.top) {
          activatePowerup(def);
          document.body.removeChild(el);
          return false;
        }

        if (top > canvas.height) {
          document.body.removeChild(el);
          return false;
        }
        return true;
      });
    }

    function activatePowerup(def) {
      spawnFloatingText(cat.x + cat.width / 2, cat.y, def.label, def.color);

      if (def.type === 'points') {
        score += 10;
        scoreElement.textContent = score;
        return;
      }
      if (def.type === 'shield') {
        activePowerups['shield'] = true;
        updatePowerupDisplay();
        return;
      }
      if (def.type === 'time') {
        time = Math.min(time + 5, DIFFICULTY[selectedDifficulty].time);
        timeElement.textContent = time;
        return;
      }

      activePowerups[def.type] = true;
      updatePowerupDisplay();

      if (def.type === 'speed') {
        cat.speed = isMobile ? 16 : 20;
      }

      clearTimeout(powerupTimers[def.type]);
      powerupTimers[def.type] = setTimeout(() => {
        delete activePowerups[def.type];
        if (def.type === 'speed') cat.speed = isMobile ? 8 : 10;
        updatePowerupDisplay();
      }, def.duration);
    }

    function updatePowerupDisplay() {
      const labels = [];
      if (activePowerups['speed'])  labels.push('⚡ Speed');
      if (activePowerups['magnet']) labels.push('🧲 Magnet');
      if (activePowerups['shield']) labels.push('🛡️ Shield');
      powerupDisplay.textContent = labels.join('  ');
    }

    function clearPowerups() {
      powerups.forEach(({ el }) => {
        if (document.body.contains(el)) document.body.removeChild(el);
      });
      powerups = [];
      Object.values(powerupTimers).forEach(clearTimeout);
      powerupTimers = {};
      activePowerups = {};
    }

    /**********************************************
     * 8) Particles
     **********************************************/
    function spawnParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          life: 1.0,
          color: color || '#FF5722',
          radius: Math.random() * 5 + 2,
        });
      }
    }

    function updateParticles() {
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.04;
      });
    }

    function drawParticles() {
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    /**********************************************
     * 9) Floating Text (score popups)
     **********************************************/
    let floatingTexts = [];

    // Screen shake
    let shakeIntensity = 0;

    // Clouds for background
    let clouds = [];
    function initClouds() {
      clouds = [
        { x: canvas.width * 0.1, y: 60,  w: 130, speed: 0.25 },
        { x: canvas.width * 0.35, y: 40, w: 100, speed: 0.18 },
        { x: canvas.width * 0.6, y: 90,  w: 160, speed: 0.32 },
        { x: canvas.width * 0.82, y: 55, w: 90,  speed: 0.22 },
      ];
    }
    initClouds();

    function drawCloud(x, y, w) {
      const h = w * 0.38;
      ctx.beginPath();
      ctx.ellipse(x,          y,          w * 0.5,  h * 0.5,  0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.22, y + h * 0.1, w * 0.3, h * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.22, y + h * 0.1, w * 0.3, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBackground() {
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height - 30);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(0.65, '#C9E8F5');
      grad.addColorStop(1, '#D6EEF8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height - 30);

      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > canvas.width + c.w) c.x = -c.w;
        drawCloud(c.x, c.y, c.w);
      });
    }

    function spawnFloatingText(x, y, text, color) {
      floatingTexts.push({ x, y, text, color: color || '#FF5722', life: 1.0, vy: -1.5 });
    }

    function updateFloatingTexts() {
      floatingTexts = floatingTexts.filter(t => t.life > 0);
      floatingTexts.forEach(t => {
        t.y += t.vy;
        t.life -= 0.025;
      });
    }

    function drawFloatingTexts() {
      floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });
    }

    /**********************************************
     * 10) Combo System
     **********************************************/
    function addCombo() {
      combo++;
      clearTimeout(comboTimer);
      if (combo >= 3) {
        updateComboDisplay();
        comboDisplay.style.display = 'block';
        comboTimer = setTimeout(() => {
          combo = 0;
          comboDisplay.style.display = 'none';
        }, COMBO_TIMEOUT);
      } else {
        comboTimer = setTimeout(() => {
          combo = 0;
          comboDisplay.style.display = 'none';
        }, COMBO_TIMEOUT);
      }
    }

    function updateComboDisplay() {
      if (combo >= 3) {
        comboDisplay.textContent = `🔥 x${combo} Combo!`;
      }
    }

    function getComboMultiplier() {
      if (combo >= 10) return 3;
      if (combo >= 5) return 2;
      return 1;
    }

    /**********************************************
     * 11) Game Loop
     **********************************************/
    function updateGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (shakeIntensity > 0) {
        ctx.translate(
          (Math.random() - 0.5) * shakeIntensity,
          (Math.random() - 0.5) * shakeIntensity
        );
        shakeIntensity = Math.max(0, shakeIntensity - 1.5);
      }

      drawBackground();
      drawSidewalk();
      updateCat();
      drawCat();
      updateBaguettes();
      updatePowerups();
      checkCollisions();
      checkMissedBaguettes();
      updateParticles();
      drawParticles();
      updateFloatingTexts();
      drawFloatingTexts();

      ctx.restore();
    }

    function drawCat() {
      // Draw magnet aura if active
      if (activePowerups['magnet']) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(Date.now() / 200);
        ctx.fillStyle = '#00BFFF';
        ctx.beginPath();
        ctx.ellipse(cat.x + cat.width / 2, cat.y + cat.height / 2, 100, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (activePowerups['speed']) {
        // Speed trail
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#FFD700';
        ctx.drawImage(catImg, cat.x - 10, cat.y, cat.width, cat.height);
        ctx.restore();
      }
      ctx.drawImage(catImg, cat.x, cat.y, cat.width, cat.height);
      if (activePowerups['shield']) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(Date.now() / 150);
        ctx.strokeStyle = '#9B59B6';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#9B59B6';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(
          cat.x + cat.width / 2, cat.y + cat.height / 2,
          cat.width * 0.68, cat.height * 0.68,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawSidewalk() {
      ctx.fillStyle = '#a9a9a9';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      // Sidewalk stripe detail
      ctx.fillStyle = '#999';
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.fillRect(x, canvas.height - 30, 2, 30);
      }
    }

    function spawnBaguette() {
      const x = Math.random() * (canvas.width - 50);
      const speedX = (Math.random() - 0.5) * 4;
      const baguette = document.createElement('img');
      baguette.src = 'https://emoji.slack-edge.com/T8UPK0YQ3/bagit/130f01dbd0e3f77d.gif';
      baguette.classList.add('baguette');
      baguette.style.left = `${x}px`;
      baguette.style.top = `0px`;

      // Difficulty: baguettes get faster with score
      const diff = DIFFICULTY[selectedDifficulty];
      const difficultyBoost = 1 + score / 100;
      const speedYAdjust = canvas.height > 800 ? 1.2 : 1;
      baguette.dataset.speedY = Math.min(diff.speedBase * speedYAdjust * difficultyBoost, diff.speedMax);
      baguette.dataset.speedX = speedX;
      document.body.appendChild(baguette);
      baguettes.push(baguette);
    }

    function updateBaguettes() {
      const spawnRate = Math.min(0.04, 0.01 + score / 400);
      if (Math.random() < spawnRate) spawnBaguette();

      baguettes.forEach((baguette) => {
        const speedY = parseFloat(baguette.dataset.speedY);
        const speedX = parseFloat(baguette.dataset.speedX);
        baguette.style.top = `${parseFloat(baguette.style.top) + speedY}px`;
        baguette.style.left = `${parseFloat(baguette.style.left) + speedX}px`;

        const baguetteWidth = parseFloat(getComputedStyle(baguette).width);
        if (parseFloat(baguette.style.left) < 0 || parseFloat(baguette.style.left) > canvas.width - baguetteWidth) {
          baguette.dataset.speedX = -speedX;
        }
      });
    }

    function checkCollisions() {
      baguettes.forEach((baguette, index) => {
        const baguetteRect = baguette.getBoundingClientRect();
        const catRect = {
          left: cat.x,
          top: cat.y,
          right: cat.x + cat.width,
          bottom: cat.y + cat.height
        };
        if (catRect.left < baguetteRect.right && catRect.right > baguetteRect.left &&
            catRect.top < baguetteRect.bottom && catRect.bottom > baguetteRect.top) {
          if (!baguette.dataset.isColliding) {
            baguette.dataset.isColliding = 'true';

            try {
              catchSound.currentTime = 0;
              catchSound.volume = 0.2;
              catchSound.play().catch(e => console.log('Audio play prevented:', e));
            } catch (err) {}

            // Particles at baguette center
            const bCX = parseFloat(baguette.style.left) + 25;
            const bCY = parseFloat(baguette.style.top) + 50;
            spawnParticles(bCX, bCY, '#f5a623');

            document.body.removeChild(baguette);
            baguettes.splice(index, 1);

            addCombo();
            const multiplier = getComboMultiplier();
            const points = multiplier;
            score += points;
            scoreElement.textContent = score;

            if (multiplier > 1) {
              spawnFloatingText(bCX, bCY - 30, `+${points} x${multiplier}`, '#FFD700');
            } else {
              spawnFloatingText(bCX, bCY - 30, '+1', '#FF5722');
            }

            // Star logic
            if (score % 10 === 0) {
              stars++;
              starsElement.textContent = stars;
              showStarImage();
            }
            if (score % 100 === 0) {
              stars += 2;
              starsElement.textContent = stars;
              showStarImage();
            }
          }
        }
      });
    }

    function checkMissedBaguettes() {
      baguettes.forEach((baguette, index) => {
        if (parseFloat(baguette.style.top) > canvas.height - 30) {
          const bx = parseFloat(baguette.style.left) + 25;
          const by = canvas.height - 50;
          document.body.removeChild(baguette);
          baguettes.splice(index, 1);

          if (activePowerups['shield']) {
            // Shield absorbs this miss
            delete activePowerups['shield'];
            updatePowerupDisplay();
            spawnFloatingText(bx, by, '🛡️ Blocked!', '#9B59B6');
            spawnParticles(bx, canvas.height - 30, '#9B59B6');
          } else {
            // Reset combo on miss
            combo = 0;
            comboDisplay.style.display = 'none';
            const penalty = DIFFICULTY[selectedDifficulty].missPenalty;
            if (penalty > 0) {
              score = Math.max(0, score - penalty);
              scoreElement.textContent = score;
              spawnFloatingText(bx, by, `-${penalty}`, '#ff3333');
            }
            shakeIntensity = 8;
            // Missed particle (red)
            spawnParticles(bx, canvas.height - 30, '#ff3333');
          }
        }
      });
    }

    function clearBaguettes() {
      baguettes.forEach((baguette) => {
        if (document.body.contains(baguette)) document.body.removeChild(baguette);
      });
      baguettes = [];
    }

    function showStarImage() {
      starImage.style.display = 'block';
      setTimeout(() => { starImage.style.display = 'none'; }, 1000);
    }

    /**********************************************
     * 12) End Game & Leaderboard
     **********************************************/
    function endGame(nickname) {
      if (endGameTriggered) return;
      endGameTriggered = true;

      clearInterval(gameInterval);
      clearInterval(timerInterval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stopButton.style.display = 'none';
      if (pauseButton) pauseButton.style.display = 'none';
      scoreboard.style.display = 'none';
      mobileControls.style.display = 'none';
      pauseOverlay.style.display = 'none';
      comboDisplay.style.display = 'none';
      powerupDisplay.textContent = '';
      clearBaguettes();
      clearPowerups();
      body.classList.add('start');
      gameControls.style.display = 'flex';

      // Show end score summary
      const prevPB = getPersonalBest(selectedDifficulty);
      const isNewRecord = score > prevPB && score > 0;
      savePersonalBest(selectedDifficulty, score);
      const diffLabel = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1);
      endScoreSummary.innerHTML = `
        <div style="font-size:22px;margin-bottom:6px;">🎮 Game Over!</div>
        <div>Score: <strong>${score}</strong> &nbsp;|&nbsp; ⭐ ${stars}</div>
        <div style="color:#888;font-size:13px;margin-top:4px;">Difficulty: ${diffLabel}</div>
        ${isNewRecord
          ? '<div class="new-record">🏅 New Personal Best!</div>'
          : (getPersonalBest(selectedDifficulty) > 0 ? `<div style="color:#888;font-size:13px;">Best: ${getPersonalBest(selectedDifficulty)}</div>` : '')}
      `;
      endScoreSummary.style.display = 'block';

      const gameData = {
        event: 'Game Ended',
        details: {
          nickname,
          score,
          stars,
          platform: isMobile ? 'mobile' : 'desktop'
        }
      };

      fetch(
        'https://script.google.com/macros/s/AKfycbw9dyf_wJn2KFMGSV8VeslPCZHUSLufYdhXM1bPKlhik7hcjgTicKykdLFsB9qTDsxmQw/exec',
        { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gameData) }
      )
        .then(() => showLeaderboard())
        .catch(() => showLeaderboard());
    }

    function showLeaderboard() {
      leaderboard.innerHTML = '<p style="text-align: center;">Loading leaderboard...</p>';
      leaderboard.style.display = 'block';
      fetch('https://script.google.com/macros/s/AKfycbw9dyf_wJn2KFMGSV8VeslPCZHUSLufYdhXM1bPKlhik7hcjgTicKykdLFsB9qTDsxmQw/exec')
        .then(r => r.json())
        .then(data => {
          let html = `
            <h2 style="text-align:center;color:#FF5722;margin-bottom:20px;">🏆 Leaderboard</h2>
            <table>
              <thead>
                <tr style="background-color:#FF5722;color:white;">
                  <th>#</th><th>Nickname</th><th>Score</th><th>Stars</th><th>Date</th>
                </tr>
              </thead><tbody>`;
          data.forEach((row, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const timestamp = row[3] ? row[3].split(' ')[0] : '';
            html += `<tr${i < 3 ? ' style="font-weight:bold;"' : ''}>
              <td>${medal}</td><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${timestamp}</td>
            </tr>`;
          });
          html += `</tbody></table>`;
          leaderboard.innerHTML = html;
        })
        .catch(() => {
          leaderboard.innerHTML = '<p style="text-align:center;color:red;">Failed to load leaderboard. Please try again later.</p>';
        });
    }

    /**********************************************
     * 13) Audio Unlock for iOS
     **********************************************/
    function unlockAudio() {
      try {
        const unlockEl = document.createElement('audio');
        unlockEl.setAttribute('src', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjMyLjEwNAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABEgD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAwAAAAAAABEgJARgTQAB4AAAESJMYLQTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        unlockEl.volume = 0.01;
        unlockEl.play().catch(() => {});
        catchSound.volume = 0.01;
        catchSound.muted = true;
        catchSound.play().then(() => {
          catchSound.pause();
          catchSound.currentTime = 0;
          catchSound.muted = false;
        }).catch(() => {});
      } catch (err) {}
    }

    document.addEventListener('touchstart', unlockAudio, { once: true, passive: false });
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    /**********************************************
     * 14) Misc
     **********************************************/
    document.addEventListener('touchmove', function (event) {
      if (event.scale !== 1) event.preventDefault();
    }, { passive: false });

    window.addEventListener('load', function () {
      resizeCanvas();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && gameInterval && !isPaused) {
        isPaused = true;
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        pauseOverlay.style.display = 'flex';
      } else if (!document.hidden && isPaused && !endGameTriggered && gameControls.style.display !== 'flex') {
        // Don't auto-resume; let user resume manually
      }
    });
