window.Pressure = (function () {
    'use strict';

    /* ============================================================
       КОНСТАНТЫ
       ============================================================ */
    const SENS_KEY = 'artist_helper_pressure_sens_v2';
    const BEST_KEY = 'artist_helper_pressure_best_v2';
    const SMOOTH_KEY = 'artist_helper_pressure_smooth_v2';
    const CURVE_KEY = 'artist_helper_pressure_curve_v1';

    const BALL_RADIUS = 16;
    const OBSTACLE_WIDTH = 40;
    const OBSTACLE_SPACING = 320;

    const INITIAL_SPEED = 100;
    const MAX_SPEED = 600;
    const SPEED_TIER_METERS = 50;
    const SPEED_TIER_MULT = 1.20;

    const PX_PER_METER = 50;

    const PLAY_TOP_FRAC = 0.06;
    const PLAY_BOTTOM_FRAC = 0.88;
    const GAP_SIZE_FRAC = 0.30;

    const SLIDER_Y_FRAC = 0.92;
    const SLIDER_H = 14;

    
    

    /* ============================================================
       DOM
       ============================================================ */
    const screenPressure = document.getElementById('screen-pressure');
    const canvas = document.getElementById('pressureCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWrap = document.getElementById('pressure-canvas-wrap');
    const sensInput = document.getElementById('pressure-sens');
    const sensValEl = document.getElementById('pressure-sens-val');
    const smoothInput = document.getElementById('pressure-smooth');
    const smoothValEl = document.getElementById('pressure-smooth-val');
    const curveInput = document.getElementById('pressure-curve');
    const curveValEl = document.getElementById('pressure-curve-val');
    const modalStart = document.getElementById('pressure-modal-start');
    const modalFail = document.getElementById('pressure-modal-fail');
    const hintEl = document.getElementById('pressure-hint');
    const scoreValEl = document.getElementById('pressure-score-val');
    const bestValEl = document.getElementById('pressure-best-val');
    const finalScoreEl = document.getElementById('pressure-final-score');
    const speedItemEl = document.getElementById('pressure-speed-item');
    const speedValEl = document.getElementById('pressure-speed-val');
    const speedFlashEl = document.getElementById('pressure-speed-flash');

    /* ============================================================
       СОСТОЯНИЕ
       ============================================================ */
    let gameState = 'idle';          // idle | playing | failed
    let rafId = null;
    let lastTs = 0;

    let centerX = 0;
    let playTop = 0, playBottom = 0, playHeight = 0;
    let sliderY = 0, sliderH = SLIDER_H;

    let ballY = 0;
    let targetBallY = 0;
    let rawPressure = 0;
    let isPen = false;
    let held = false;
    let sensitivity = 2.0;
    let smoothness = 5;
    let pressureCurve = 1.0;
    let SMOOTHING = 9;
    let PRESSURE_SMOOTHING = 7;

    // Отдельно сглаживаем сам сигнал pressure и положение шарика.
    let filteredPressure = 0;
    let pressureSignalAvailable = false;
    let activeInputType = '';
    let touchPressureMode = 'unknown';

    let activePointerId = null;

    let obstacles = [];
    let speed = INITIAL_SPEED;
    let distance = 0;
    let currentMeters = 0;
    let bestMeters = 0;

    let gapSizePx = 0;
    let obWidthPx = OBSTACLE_WIDTH;

    let inited = false;

    /* ============================================================
       УТИЛИТЫ
       ============================================================ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function loadSensitivity() {
        try {
            const v = parseFloat(localStorage.getItem(SENS_KEY));
            if (isFinite(v) && v >= 0.5 && v <= 4) return v;
        } catch (e) { }
        return 2.0;
    }

    function loadSmoothness() {
    try {
        const v = parseInt(localStorage.getItem(SMOOTH_KEY), 10);
        if (isFinite(v) && v >= 1 && v <= 10) return v;
    } catch (e) { }
    return 5;
}
function saveSmoothness() {
    try { localStorage.setItem(SMOOTH_KEY, String(smoothness)); } catch (e) { }
}

function loadCurve() {
    try {
        const v = parseFloat(localStorage.getItem(CURVE_KEY));
        if (isFinite(v) && v >= 0.5 && v <= 2.5) return v;
    } catch (e) { }
    return 1.0;
}

function saveCurve() {
    try { localStorage.setItem(CURVE_KEY, String(pressureCurve)); } catch (e) { }
}

function applySmoothness() {
    smoothness = parseInt(smoothInput.value, 10);
    smoothValEl.textContent = String(smoothness);

    // Большее значение означает более длинный отклик и более мягкое движение.
    const response = 0.65 + smoothness * 0.35;
    SMOOTHING = 30 / response;
    PRESSURE_SMOOTHING = 24 / response;
    saveSmoothness();
}
smoothInput.addEventListener('input', applySmoothness);

function applyCurve() {
    pressureCurve = clamp(parseFloat(curveInput.value), 0.5, 2.5);
    curveValEl.textContent = pressureCurve.toFixed(1);
    saveCurve();
    if (gameState !== 'playing') render();
}
curveInput.addEventListener('input', applyCurve);
    function saveSensitivity() {
        try { localStorage.setItem(SENS_KEY, String(sensitivity)); } catch (e) { }
    }
    function loadBest() {
        try {
            const v = parseInt(localStorage.getItem(BEST_KEY), 10);
            if (isFinite(v) && v >= 0) return v;
        } catch (e) { }
        return 0;
    }
    function saveBest(v) {
        try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { }
    }

    function getEffectivePressure(sourcePressure = filteredPressure) {
        const amplified = clamp(0.5 + (sourcePressure - 0.5) * sensitivity, 0, 1);
        // Кривая отклика: 1.0 — линейно; меньше 1 — сильнее реагирует на лёгкое
        // нажатие; больше 1 — требует более сильного нажатия.
        return Math.pow(amplified, pressureCurve);
    }

    function getPointerPressure(e) {
        const pointerType = e.pointerType || '';
        const webkitForce = Number.isFinite(e.webkitForce) ? e.webkitForce : null;
        const eventPressure = Number.isFinite(e.pressure) ? e.pressure : null;
        const value = webkitForce !== null ? webkitForce : eventPressure;

        if (pointerType === 'pen') {
            if (value === null) return null;
            activeInputType = 'pen';
            pressureSignalAvailable = true;
            return clamp(value, 0, 1);
        }

        if (pointerType === 'touch') {
            if (value === null) return null;
            activeInputType = 'touch';

            // Некоторые браузеры всегда сообщают для пальца ровно 0.5.
            // Это не сила нажатия, поэтому координаты касания намеренно не
            // используются как запасной источник. webkitForce принимаем сразу.
            if (webkitForce !== null) {
                pressureSignalAvailable = true;
                touchPressureMode = 'supported';
                return clamp(value, 0, 1);
            }
            if (touchPressureMode === 'supported') {
                pressureSignalAvailable = true;
                return clamp(value, 0, 1);
            }
            if (Math.abs(value - 0.5) > 0.025) {
                touchPressureMode = 'supported';
                pressureSignalAvailable = true;
                return clamp(value, 0, 1);
            }

            // Позволяем начать тест, но при стандартном touch-pressure=0.5
            // шарик остаётся на одном уровне и не реагирует на движение пальца.
            return 0.5;
        }

        // Мышь и обычный трекпад давления не передают. Не подменяем его
        // координатой курсора: это и было причиной нежелательного поведения.
        return null;
    }

    function pressureToY(p) {
        const lo = playTop + BALL_RADIUS + 4;
        const hi = playBottom - BALL_RADIUS - 4;
        return hi - p * (hi - lo);
    }

    function releaseActivePointer() {
        if (activePointerId !== null) {
            try { canvas.releasePointerCapture(activePointerId); } catch (err) { }
            activePointerId = null;
        }
    }

    /* ============================================================
       РАЗМЕТКА
       ============================================================ */
    function rebuildLayout() {
        const W = canvas.width, H = canvas.height;
        const scale = Math.min(W, H) / 600;

        playTop = H * PLAY_TOP_FRAC;
        playBottom = H * PLAY_BOTTOM_FRAC;
        playHeight = playBottom - playTop;

        sliderY = H * SLIDER_Y_FRAC;
        sliderH = Math.max(10, SLIDER_H * scale);
        centerX = W / 2;

        gapSizePx = playHeight * GAP_SIZE_FRAC;
        obWidthPx = Math.max(24, OBSTACLE_WIDTH * scale);
    }

    function resizeCanvas() {
        const cssW = Math.max(240, canvasWrap.clientWidth);
        const cssH = Math.max(240, canvasWrap.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        rebuildLayout();
        render();
    }

    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = rect.width ? canvas.width / rect.width : 1;
        const sy = rect.height ? canvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * sx,
            y: (e.clientY - rect.top) * sy
        };
    }

    /* ============================================================
       HUD
       ============================================================ */
    function updateSpeedDisplay() {
        const mult = speed / INITIAL_SPEED;
        speedValEl.textContent = mult.toFixed(1);
    }

    function flashSpeedIncrease(meters) {
        if (!speedItemEl || !speedFlashEl) return;

        speedFlashEl.textContent = meters + ' м';

        speedItemEl.classList.remove('pulse');
        void speedItemEl.offsetWidth;
        speedItemEl.classList.add('pulse');
        setTimeout(() => speedItemEl.classList.remove('pulse'), 700);

        speedFlashEl.classList.remove('show');
        void speedFlashEl.offsetWidth;
        speedFlashEl.classList.add('show');
    }

    /* ============================================================
       ПРЕПЯТСТВИЯ
       ============================================================ */
    function spawnObstacle(x) {
        const minC = playTop + gapSizePx / 2 + 30;
        const maxC = playBottom - gapSizePx / 2 - 30;
        const gapCenter = minC + Math.random() * Math.max(1, maxC - minC);
        return {
            x: x,
            gapCenter: gapCenter,
            gapSize: gapSizePx,
            width: obWidthPx,
            scored: false
        };
    }

    function resetObstacles() {
        obstacles = [spawnObstacle(canvas.width)];
    }

    /* ============================================================
       ОБНОВЛЕНИЕ
       ============================================================ */
    function update(dt) {
        const dx = speed * dt;
        distance += dx;
        for (const ob of obstacles) ob.x -= dx;

        obstacles = obstacles.filter(ob => ob.x + ob.width > -80);

        const rightmost = obstacles.reduce((m, ob) => Math.max(m, ob.x), -Infinity);
        if (rightmost < canvas.width - OBSTACLE_SPACING) {
            obstacles.push(spawnObstacle(canvas.width));
        }

        const newMeters = Math.floor(distance / PX_PER_METER);
        if (newMeters !== currentMeters) {
            const prevTier = Math.floor(currentMeters / SPEED_TIER_METERS);
            const newTier = Math.floor(newMeters / SPEED_TIER_METERS);
            if (newTier > prevTier) {
                const oldSpeed = speed;
                for (let i = 0; i < newTier - prevTier; i++) {
                    speed = Math.min(MAX_SPEED, speed * SPEED_TIER_MULT);
                }
                if (speed > oldSpeed) {
                    flashSpeedIncrease(newTier * SPEED_TIER_METERS);
                    updateSpeedDisplay();
                }
            }
            currentMeters = newMeters;
            scoreValEl.textContent = String(currentMeters);
        }

        // Два последовательных фильтра убирают скачки pressure: сначала
        // сглаживается входной сигнал, затем — положение шарика.
        const pressureK = 1 - Math.exp(-PRESSURE_SMOOTHING * dt);
        filteredPressure += (rawPressure - filteredPressure) * pressureK;
        targetBallY = pressureToY(getEffectivePressure());

        const positionK = 1 - Math.exp(-SMOOTHING * dt);
        ballY += (targetBallY - ballY) * positionK;

        for (const ob of obstacles) {
            if (centerX + BALL_RADIUS < ob.x || centerX - BALL_RADIUS > ob.x + ob.width) continue;
            const gapTop = ob.gapCenter - ob.gapSize / 2;
            const gapBottom = ob.gapCenter + ob.gapSize / 2;
            if (ballY - BALL_RADIUS < gapTop || ballY + BALL_RADIUS > gapBottom) {
                gameOver();
                return;
            }
        }
    }

    /* ============================================================
       ОТРИСОВКА
       ============================================================ */
    function render() {
        const W = canvas.width, H = canvas.height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#1a1a24';
        ctx.fillRect(0, playTop, W, playBottom - playTop);

        drawBackgroundGrid(W);
        for (const ob of obstacles) drawObstacle(ob);
        drawBall(centerX, ballY);
        drawSliderAndConnector();
        drawPressureIndicator();
    }

    function drawBackgroundGrid(W) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const step = 50;
        const offset = -(distance % step);
        for (let x = offset; x < W + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, playTop);
            ctx.lineTo(x, playBottom);
            ctx.stroke();
        }
        for (let y = playTop; y < playBottom; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
    }

    function drawObstacle(ob) {
        const topEnd = ob.gapCenter - ob.gapSize / 2;
        const botStart = ob.gapCenter + ob.gapSize / 2;
        const x = ob.x;

        const grad = ctx.createLinearGradient(x, 0, x + ob.width, 0);
        grad.addColorStop(0, '#3a3a4e');
        grad.addColorStop(0.5, '#5a5a75');
        grad.addColorStop(1, '#3a3a4e');
        ctx.fillStyle = grad;

        ctx.fillRect(x, playTop, ob.width, topEnd - playTop);
        ctx.fillRect(x, botStart, ob.width, playBottom - botStart);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        if (topEnd - playTop > 1) {
            ctx.strokeRect(x + 0.5, playTop + 0.5, ob.width - 1, topEnd - playTop - 1);
        }
        if (playBottom - botStart > 1) {
            ctx.strokeRect(x + 0.5, botStart + 0.5, ob.width - 1, playBottom - botStart - 1);
        }
    }

    function drawBall(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, BALL_RADIUS * 2, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(x, y, BALL_RADIUS * 0.5, x, y, BALL_RADIUS * 2);
        glow.addColorStop(0, 'rgba(255,217,61,0.35)');
        glow.addColorStop(1, 'rgba(255,217,61,0)');
        ctx.fillStyle = glow;
        ctx.fill();

        const grad = ctx.createRadialGradient(
            x - BALL_RADIUS * 0.3, y - BALL_RADIUS * 0.3, 2,
            x, y, BALL_RADIUS
        );
        grad.addColorStop(0, '#fff9c4');
        grad.addColorStop(0.5, '#ffd93d');
        grad.addColorStop(1, '#c78f00');
        ctx.beginPath();
        ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawSliderAndConnector() {
        // Пунктирная линия от шара вниз
        ctx.strokeStyle = 'rgba(123,108,246,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerX, ballY + BALL_RADIUS);
        ctx.lineTo(centerX, playBottom); // Теперь линия идет до самого низа экрана
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawPressureIndicator() {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        if (pressureSignalAvailable) {
            const effP = getEffectivePressure();
            ctx.fillText('Давление: ' + Math.round(effP * 100) + '%', canvas.width - 16, 12);
        } else {
            ctx.fillText('Давление: нет сигнала от устройства', canvas.width - 16, 12);
        }
    }

    /* ============================================================
       ИГРОВОЙ ЦИКЛ
       ============================================================ */
    function gameLoop(ts) {
        rafId = null;
        if (gameState !== 'playing') return;

        if (lastTs === 0) lastTs = ts;
        let dt = (ts - lastTs) / 1000;
        lastTs = ts;
        if (dt > 0.05) dt = 0.05;

        update(dt);
        render();

        if (gameState === 'playing') {
            rafId = requestAnimationFrame(gameLoop);
        }
    }

    function startGame() {
        modalStart.style.display = 'none';
        modalFail.style.display = 'none';

        gameState = 'playing';
        obstacles = [];
        speed = INITIAL_SPEED;
        distance = 0;
        currentMeters = 0;
        rawPressure = 0;
        filteredPressure = 0;
        ballY = pressureToY(0);
        targetBallY = ballY;
        resetObstacles();

        scoreValEl.textContent = '0';
        updateSpeedDisplay();
        hintEl.textContent = 'Удерживайте · сильнее — выше, слабее — ниже';

        lastTs = 0;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        gameState = 'failed';
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        held = false;
        rawPressure = 0;
        releaseActivePointer();

        const finalM = Math.floor(distance / PX_PER_METER);
        if (finalM > bestMeters) {
            bestMeters = finalM;
            saveBest(bestMeters);
            bestValEl.textContent = String(bestMeters);
        }

        if (finalScoreEl) finalScoreEl.textContent = String(finalM);
        hintEl.textContent = 'Столкновение. Нажмите «Ещё раз»';

        setTimeout(() => { modalFail.style.display = 'flex'; }, 300);
    }

    function resetToIdle() {
        gameState = 'idle';
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        lastTs = 0;
        obstacles = [];
        speed = INITIAL_SPEED;
        distance = 0;
        currentMeters = 0;
        rawPressure = 0;
        filteredPressure = 0;
        held = false;
        releaseActivePointer();
        ballY = pressureToY(0);
        targetBallY = ballY;

        modalStart.style.display = 'none';
        modalFail.style.display = 'none';

        scoreValEl.textContent = '0';
        updateSpeedDisplay();
        hintEl.textContent = 'Коснитесь поля, чтобы начать';
        render();
    }

    function beginFromModal() {
        modalStart.style.display = 'none';
        resetToIdle();
    }

    function restart() {
        modalFail.style.display = 'none';
        resetToIdle();
    }

    /* Вызывается App.backToMenu — останавливает игру, не показывая модалки. */
    function stop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        lastTs = 0;
        held = false;
        rawPressure = 0;
        filteredPressure = 0;
        releaseActivePointer();
        gameState = 'idle';
        modalStart.style.display = 'none';
        modalFail.style.display = 'none';
    }

    /* ============================================================
       POINTER
       ============================================================ */
    function onPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        if (gameState === 'failed') return;

        const pressure = getPointerPressure(e);
        if (pressure === null) {
            hintEl.textContent = 'Устройство не передаёт силу нажатия. Используйте перо с поддержкой pressure.';
            return;
        }

        const wasIdle = gameState === 'idle';
        if (wasIdle) startGame();

        isPen = e.pointerType === 'pen';
        held = true;
        rawPressure = pressure;

        // Не устанавливаем ballY напрямую: даже первое нажатие проходит
        // через тот же сглаженный анимационный отклик.
        activePointerId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { }

        render();
    }

    function onPointerMove(e) {
        if (gameState !== 'playing') return;
        if (!held) return;
        e.preventDefault();

        const pressure = getPointerPressure(e);
        if (pressure !== null) rawPressure = pressure;
    }

    function onPointerUp(e) {
        if (!held) return;
        held = false;
        rawPressure = 0;
        if (activePointerId === e.pointerId) {
            releaseActivePointer();
        } else {
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) { }
        }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerrawupdate', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    /* Отменяем контекстное меню на всём экране (включая модалки). */
    screenPressure.addEventListener('contextmenu', e => e.preventDefault());

    /* ============================================================
       ЧУВСТВИТЕЛЬНОСТЬ
       ============================================================ */
    function applySensitivity() {
        sensitivity = parseFloat(sensInput.value);
        sensValEl.textContent = sensitivity.toFixed(1);
        saveSensitivity();
        if (gameState !== 'playing') render();
    }
    sensInput.addEventListener('input', applySensitivity);

    /* ============================================================
       ВИДИМОСТЬ ВКЛАДКИ
       ============================================================ */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else if (screenPressure.style.display === 'flex') {
            if (gameState === 'playing' && !rafId) {
                lastTs = 0;
                rafId = requestAnimationFrame(gameLoop);
            }
        }
    });

    /* ============================================================
       ПУБЛИЧНЫЙ API
       ============================================================ */
    function enter() {
        if (!inited) {
    sensitivity = loadSensitivity();
    sensInput.value = String(sensitivity);
    sensValEl.textContent = sensitivity.toFixed(1);

    smoothness = loadSmoothness();
    smoothInput.value = String(smoothness);
    applySmoothness();

    pressureCurve = loadCurve();
    curveInput.value = String(pressureCurve);
    curveValEl.textContent = pressureCurve.toFixed(1);

    bestMeters = loadBest();
    bestValEl.textContent = String(bestMeters);
    inited = true;
}

        modalFail.style.display = 'none';
        modalStart.style.display = 'flex';

        gameState = 'idle';
        obstacles = [];
        speed = INITIAL_SPEED;
        distance = 0;
        currentMeters = 0;
        rawPressure = 0;
        held = false;
        ballY = 0;
        targetBallY = 0;

        updateSpeedDisplay();
        scoreValEl.textContent = '0';
        hintEl.textContent = 'Коснитесь поля, чтобы начать';

        resizeCanvas();
        requestAnimationFrame(resizeCanvas);
        setTimeout(resizeCanvas, 0);
    }

    return {
        enter,
        stop,
        beginFromModal,
        restart,
        resetToIdle,
        resizeCanvas,
        isOpen: () => screenPressure.style.display === 'flex',
        isDevPanelOpen: () => false
    };
})();