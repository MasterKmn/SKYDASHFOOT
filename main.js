/* Sky Dash - simple endless runner, touch-friendly, PWA-ready */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 0, H = 0, DPR = Math.max(1, Math.min( window.devicePixelRatio || 1, 2));
  function resize() {
    W = Math.floor(window.innerWidth * DPR);
    H = Math.floor(window.innerHeight * DPR);
    canvas.width = W; canvas.height = H;
  }
  resize(); window.addEventListener('resize', resize);

  // UI
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const pauseBtn = document.getElementById('pauseBtn');
  const muteBtn = document.getElementById('muteBtn');

  const store = {
    get(key, def){ try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch(e){ return def; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };
  let best = store.get('sky_best', 0); bestEl.textContent = best;

  // Audio (WebAudio minimal beeps)
  let audioCtx = null;
  let muted = store.get('sky_muted', false);
  function ensureAudio() {
    if (!audioCtx && !muted) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
  }
  function beep(type='square', freq=440, dur=0.07, vol=0.08){
    if (muted || !audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); }, dur*1000);
  }

  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muted = !muted; store.set('sky_muted', muted);
    muteBtn.textContent = muted ? '🔇' : '🔊';
    if (!muted) ensureAudio();
  });

  // Game state
  const G = {
    gravity: 0.0017,
    speed: 0.38,
    maxSpeed: 1.1,
    jumpV: -0.55,
    themeHue: 215
  };
  let tPrev = 0;
  let running = true;
  let started = false;
  let score = 0;
  let spawnTimer = 0;
  let obstacles = [];
  let particles = [];

  const player = {
    x: 0.18, y: 0.8,
    w: 0.05, h: 0.08,
    vy: 0, onGround: false, jumps: 0, alive: true
  };

  function worldToPx(x){ return x * W; }
  function worldToPy(y){ return y * H; }

  function reset() {
    player.x = 0.18; player.y = 0.8;
    player.vy = 0; player.onGround = true; player.jumps = 0; player.alive = true;
    score = 0; obstacles = []; particles = []; spawnTimer = 0; started = false;
    G.speed = 0.38;
  }

  function spawnObstacle() {
    const gapH = 0.22 + Math.random()*0.1;
    const baseH = 0.08 + Math.random()*0.08;
    const w = 0.06 + Math.random()*0.05;
    obstacles.push({ x: 1.2, y: 1 - baseH, w, h: baseH, passed: false, kind: 'block' });
    if (Math.random() < 0.35) {
      // floating obstacle
      const fy = 0.6 + Math.random()*0.2;
      obstacles.push({ x: 1.2 + w*0.5, y: fy, w: w*0.9, h: 0.035, passed: false, kind: 'bar' });
    }
  }

  function jump() {
    ensureAudio();
    if (!started) started = true;
    if (!player.alive) { reset(); return; }
    if (player.onGround) {
      player.vy = G.jumpV; player.onGround = false; player.jumps = 1; beep('square', 660, 0.08, 0.05);
    } else if (player.jumps < 2) {
      player.vy = G.jumpV * 0.92; player.jumps++; beep('square', 760, 0.08, 0.05);
    }
  }

  function update(dt) {
    if (!running) return;
    if (started && player.alive) {
      // speed ramp
      G.speed = Math.min(G.maxSpeed, G.speed + dt*0.00002);
      // spawn obstacles
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnObstacle();
        spawnTimer = 900 + Math.random()*600; // ms
      }
    }

    // physics
    player.vy += G.gravity * dt;
    player.y += player.vy * (dt / 16.67);
    const groundY = 0.88;
    if (player.y + player.h >= groundY) {
      player.y = groundY - player.h; player.vy = 0; player.onGround = true; player.jumps = 0;
    }

    // obstacles move
    for (let o of obstacles) {
      o.x -= (G.speed * dt) / W * 60; // normalized by width
      if (!o.passed && o.x + o.w < player.x) { o.passed = true; score++; scoreEl.textContent = score; }
    }
    obstacles = obstacles.filter(o => o.x + o.w > -0.2);

    // collisions
    function collide(a,b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    if (player.alive) {
      for (let o of obstacles) {
        if (collide(player, o)) {
          player.alive = false;
          best = Math.max(best, score); bestEl.textContent = best; store.set('sky_best', best);
          beep('sawtooth', 140, 0.15, 0.08);
          for (let i=0;i<24;i++){
            particles.push({x: player.x+player.w/2, y: player.y+player.h/2, vx:(Math.random()-0.5)*0.01, vy:(Math.random()-0.5)*0.012, life: 600+Math.random()*400});
          }
          break;
        }
      }
    }

    // particles
    particles.forEach(p => { p.x += p.vx * (dt/16.67); p.y += p.vy * (dt/16.67); p.vy += 0.0007 * (dt/16.67); p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
  }

  function draw() {
    // bg gradient
    const hue = G.themeHue;
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, `hsl(${hue}, 40%, 12%)`);
    g.addColorStop(1, `hsl(${hue+20}, 50%, 7%)`);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // parallax mountains
    const base = H*0.88;
    ctx.fillStyle = `hsla(${hue+30}, 30%, 18%, 1)`;
    for (let i=0;i<5;i++){
      const x = (Date.now()*0.02 + i*3000) % (W+800) - 400;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x+200, base-120);
      ctx.lineTo(x+400, base);
      ctx.closePath(); ctx.fill();
    }

    // ground line
    ctx.fillStyle = `hsla(${hue}, 35%, 16%, 1)`;
    ctx.fillRect(0, base, W, H-base);

    // player
    const px = worldToPx(player.x);
    const py = worldToPy(player.y);
    const pw = worldToPx(player.w);
    const ph = worldToPy(player.h);
    ctx.fillStyle = player.alive ? '#5dd6ff' : '#ff5166';
    ctx.fillRect(px, py, pw, ph);
    // eye
    ctx.fillStyle = '#0c0f14';
    ctx.fillRect(px+pw*0.65, py+ph*0.3, pw*0.15, ph*0.18);

    // obstacles
    for (let o of obstacles) {
      const ox = worldToPx(o.x), oy = worldToPy(o.y), ow = worldToPx(o.w), oh = worldToPy(o.h);
      ctx.fillStyle = o.kind === 'bar' ? '#ffd166' : '#a78bfa';
      ctx.fillRect(ox, oy, ow, oh);
    }

    // particles
    ctx.fillStyle = '#ff5166';
    for (let p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life/800));
      ctx.fillRect(worldToPx(p.x), worldToPy(p.y), 3*DPR, 3*DPR);
    }
    ctx.globalAlpha = 1;

    // overlays
    if (!started) {
      drawCenterText("TOUCHE POUR JOUER", H*0.34);
      drawSub("Double saut disponible", H*0.34 + 42*DPR);
    } else if (!player.alive) {
      drawCenterText("GAME OVER", H*0.34);
      drawSub("Touchez pour recommencer", H*0.34 + 42*DPR);
    }
  }

  function drawCenterText(text, y){
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.floor(28*DPR)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`;
    const w = ctx.measureText(text).width;
    ctx.fillText(text, (W - w)/2, y);
  }
  function drawSub(text, y){
    ctx.fillStyle = 'rgba(220,230,255,0.85)';
    ctx.font = `${Math.floor(18*DPR)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`;
    const w = ctx.measureText(text).width;
    ctx.fillText(text, (W - w)/2, y);
  }

  // input
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, {passive:false});
  window.addEventListener('mousedown', (e) => { if (e.button===0) jump(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); jump(); } });

  pauseBtn.addEventListener('click', () => {
    running = !running;
    pauseBtn.textContent = running ? '⏸️' : '▶️';
    if (running) { tPrev = performance.now(); loop(tPrev); }
  });

  function loop(t) {
    const dt = Math.min(34, t - tPrev || 16.67); tPrev = t;
    update(dt);
    draw();
    if (running) requestAnimationFrame(loop);
  }
  reset();
  requestAnimationFrame(loop);

  // PWA service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
})();