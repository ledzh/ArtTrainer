window.LightDrag = (function () {
    'use strict';

    const ROUNDS_TOTAL = 10;
    const MAIN_SIZE = 480;
    const REF_SIZE = 200;
    const BASE_SCALE = 0.36;
    const BG_VALUE = 128;

    const rand = (min, max) => Math.random() * (max - min) + min;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function rotMat(ax, ay, az) {
        const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
        return [cc*cb, cc*sb*sa - sc*ca, cc*sb*ca + sc*sa, sc*cb, sc*sb*sa + cc*ca, sc*sb*ca - cc*sa, -sb, cb*sa, cb*ca];
    }
    function applyMat(m, x, y, z) { return [m[0]*x + m[1]*y + m[2]*z, m[3]*x + m[4]*y + m[5]*z, m[6]*x + m[7]*y + m[8]*z]; }
    function transpose(m) { return [m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8]]; }

    function intersectSphere(ox, oy, oz, dx, dy, dz, R) {
        const a = dx*dx + dy*dy + dz*dz, b = 2*(ox*dx + oy*dy + oz*dz), c = ox*ox + oy*oy + oz*oz - R*R;
        const disc = b*b - 4*a*c; if (disc < 0) return null;
        const sq = Math.sqrt(disc); let t = (-b - sq) / (2*a); if (t < 0) t = (-b + sq) / (2*a);
        if (t < 0) return null;
        const hx = ox + t*dx, hy = oy + t*dy, hz = oz + t*dz, len = Math.hypot(hx, hy, hz);
        return { t, nx: hx/len, ny: hy/len, nz: hz/len };
    }
    function intersectCube(ox, oy, oz, dx, dy, dz, half) {
        let tmin = -Infinity, tmax = Infinity, nx = 0, ny = 0, nz = 0;
        const axes = [[ox, dx], [oy, dy], [oz, dz]];
        for (let i = 0; i < 3; i++) {
            const o = axes[i][0], d = axes[i][1];
            if (Math.abs(d) < 1e-9) { if (o < -half || o > half) return null; continue; }
            let t1 = (-half - o) / d, t2 = (half - o) / d;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
            if (t1 > tmin) { tmin = t1; nx = i === 0 ? -Math.sign(d) : 0; ny = i === 1 ? -Math.sign(d) : 0; nz = i === 2 ? -Math.sign(d) : 0; }
            if (t2 < tmax) tmax = t2;
        }
        if (tmin > tmax || tmin < 0) return null;
        return { t: tmin, nx, ny, nz };
    }
    function intersectCylinder(ox, oy, oz, dx, dy, dz, R, H) {
        const hh = H / 2; let bestT = Infinity, bestN = null;
        const A = dx*dx + dz*dz, B = 2*(ox*dx + oz*dz), C = ox*ox + oz*oz - R*R;
        if (A > 1e-9) {
            const disc = B*B - 4*A*C;
            if (disc >= 0) {
                const sq = Math.sqrt(disc), t1 = (-B - sq) / (2*A), t2 = (-B + sq) / (2*A);
                for (const t of [t1, t2]) {
                    if (t > 1e-6 && t < bestT) { const y = oy + t*dy; if (y >= -hh && y <= hh) { bestT = t; bestN = { nx: (ox + t*dx) / R, ny: 0, nz: (oz + t*dz) / R }; } }
                }
            }
        }
        if (Math.abs(dy) > 1e-9) {
            for (const capY of [-hh, hh]) {
                const t = (capY - oy) / dy;
                if (t > 1e-6 && t < bestT) { const x = ox + t*dx, z = oz + t*dz; if (x*x + z*z <= R*R) { bestT = t; bestN = { nx: 0, ny: Math.sign(capY), nz: 0 }; } }
            }
        }
        if (!bestN) return null; return { t: bestT, ...bestN };
    }
    function intersectEllipsoid(ox, oy, oz, dx, dy, dz, rx, ry, rz) {
        const o2x = ox/rx, o2y = oy/ry, o2z = oz/rz, d2x = dx/rx, d2y = dy/ry, d2z = dz/rz;
        const a = d2x*d2x + d2y*d2y + d2z*d2z, b = 2*(o2x*d2x + o2y*d2y + o2z*d2z), c = o2x*o2x + o2y*o2y + o2z*o2z - 1;
        const disc = b*b - 4*a*c; if (disc < 0) return null;
        const sq = Math.sqrt(disc); let t = (-b - sq) / (2*a); if (t < 0) t = (-b + sq) / (2*a);
        if (t < 0) return null;
        const px = o2x + t*d2x, py = o2y + t*d2y, pz = o2z + t*d2z;
        let nx = px/rx, ny = py/ry, nz = pz/rz, len = Math.hypot(nx, ny, nz);
        return { t, nx: nx/len, ny: ny/len, nz: nz/len };
    }
    function intersectShape(shape, rot, wx, wy) {
        const Rt = transpose(rot), [ox, oy, oz] = applyMat(Rt, wx, wy, 10), [dx, dy, dz] = applyMat(Rt, 0, 0, -1);
        let hit;
        if (shape === 'sphere') hit = intersectSphere(ox, oy, oz, dx, dy, dz, 0.42);
        else if (shape === 'cube') hit = intersectCube(ox, oy, oz, dx, dy, dz, 0.5);
        else if (shape === 'cylinder') hit = intersectCylinder(ox, oy, oz, dx, dy, dz, 0.42, 1.0);
        else if (shape === 'ellipsoid') hit = intersectEllipsoid(ox, oy, oz, dx, dy, dz, 0.38, 0.5, 0.32);
        if (!hit) return null;
        const [nx, ny, nz] = applyMat(rot, hit.nx, hit.ny, hit.nz);
        return { nx, ny, nz };
    }
    function makeRotation(shape) {
        if (shape === 'sphere') return rotMat(0, 0, 0);
        if (shape === 'cube') return rotMat(rand(0.5, 0.7), rand(0.5, 0.7), 0);
        if (shape === 'cylinder') return rotMat(rand(0.2, 0.4), rand(0.3, 0.5), 0);
        return rotMat(rand(-0.2, 0.2), rand(-0.2, 0.2), 0);
    }
    function computeNormals(shape, rot, size) {
        const normals = new Float32Array(size * size * 3), hitMask = new Uint8Array(size * size);
        const cx = size / 2, cy = size / 2, scale = size * BASE_SCALE;
        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const wx = (px - cx) / scale, wy = -(py - cy) / scale;
                if (wx*wx + wy*wy > 1.05) continue;
                const hit = intersectShape(shape, rot, wx, wy);
                if (!hit) continue;
                const idx = py * size + px, i3 = idx * 3;
                normals[i3] = hit.nx; normals[i3+1] = hit.ny; normals[i3+2] = hit.nz; hitMask[idx] = 1;
            }
        }
        return { normals, hitMask };
    }

    const toneLUT = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) {
        const linear = i / 1023, tone = Math.pow(linear, 1 / 1.5);
        toneLUT[i] = clamp(Math.round(tone * 240 + 8), 0, 255);
    }

    const $ = id => document.querySelector('#screen-lightdrag #' + id);

    const mainCanvas = $('lightdrag-mainCanvas'), mainCtx = mainCanvas.getContext('2d');
    mainCanvas.width = MAIN_SIZE; mainCanvas.height = MAIN_SIZE;
    const refCanvas = $('lightdrag-refCanvas'), refCtx = refCanvas.getContext('2d');
    refCanvas.width = REF_SIZE; refCanvas.height = REF_SIZE;

    const mainImageData = mainCtx.createImageData(MAIN_SIZE, MAIN_SIZE);
    for (let i = 0; i < MAIN_SIZE * MAIN_SIZE; i++) {
        const i4 = i * 4; mainImageData.data[i4] = BG_VALUE; mainImageData.data[i4+1] = BG_VALUE; mainImageData.data[i4+2] = BG_VALUE; mainImageData.data[i4+3] = 255;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = MAIN_SIZE; tempCanvas.height = MAIN_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    const tempImageData = tempCtx.createImageData(MAIN_SIZE, MAIN_SIZE);
    for (let i = 0; i < MAIN_SIZE * MAIN_SIZE; i++) {
        const i4 = i * 4; tempImageData.data[i4] = BG_VALUE; tempImageData.data[i4+1] = BG_VALUE; tempImageData.data[i4+2] = BG_VALUE; tempImageData.data[i4+3] = 255;
    }

    function fillBackground(imageData, size) {
        const data = imageData.data;
        for (let i = 0; i < size * size; i++) { const i4 = i * 4; data[i4] = BG_VALUE; data[i4+1] = BG_VALUE; data[i4+2] = BG_VALUE; }
    }
    function shadePixel(nx, ny, nz, light) {
        const ndotl = nx*light[0] + ny*light[1] + nz*light[2];
        const p = ndotl > 0 ? ndotl : 0, bounce = ny < 0 ? -ny * 0.15 : 0;
        const linear = 0.06 + 0.86 * p + bounce, lc = linear > 1 ? 1 : (linear < 0 ? 0 : linear);
        return toneLUT[Math.round(lc * 1023)];
    }
    function renderMainSparse(normals, hitMask, light) {
        const data = mainImageData.data, N = MAIN_SIZE * MAIN_SIZE;
        for (let idx = 0; idx < N; idx++) {
            if (!hitMask[idx]) continue;
            const i3 = idx * 3, v = shadePixel(normals[i3], normals[i3+1], normals[i3+2], light), i4 = idx * 4;
            data[i4] = v; data[i4+1] = v; data[i4+2] = v;
        }
        mainCtx.putImageData(mainImageData, 0, 0);
    }
    function renderRef(normals, hitMask, light) {
        fillBackground(tempImageData, MAIN_SIZE);
        const data = tempImageData.data, N = MAIN_SIZE * MAIN_SIZE;
        for (let idx = 0; idx < N; idx++) {
            if (!hitMask[idx]) continue;
            const i3 = idx * 3, v = shadePixel(normals[i3], normals[i3+1], normals[i3+2], light), i4 = idx * 4;
            data[i4] = v; data[i4+1] = v; data[i4+2] = v;
        }
        tempCtx.putImageData(tempImageData, 0, 0);
        refCtx.clearRect(0, 0, REF_SIZE, REF_SIZE);
        refCtx.drawImage(tempCanvas, 0, 0, REF_SIZE, REF_SIZE);
    }

    const state = {
        round: 1, score: 0, shape: null, rot: null, targetLight: null, currentLight: [0, 0, 1],
        normals: null, hitMask: null, phase: 'playing'
    };

    const roundNum = $('lightdrag-roundNum'), scoreValue = $('lightdrag-scoreValue');
    const submitBtn = $('lightdrag-submitBtn'), feedbackEl = $('lightdrag-feedback');
    const pad = $('lightdrag-pad'), sun = $('lightdrag-sun'), targetMarker = $('lightdrag-targetMarker');
    const topBar = $('lightdrag-topBar'), playArea = $('lightdrag-playArea'), bottomBar = $('lightdrag-bottomBar');
    const gameOver = $('lightdrag-gameOver'), finalScore = $('lightdrag-finalScore'), grade = $('lightdrag-grade'), restartBtn = $('lightdrag-restartBtn');
    const levelDisplay = $('lightdrag-level-display');

    $('lightdrag-roundTotal').textContent = ROUNDS_TOTAL;

    function getPadGeometry() {
        const rect = pad.getBoundingClientRect();
        const size = rect.width;
        return { rect, size, cx: size / 2, cy: size / 2, maxDist: size * 0.3 };
    }
    function updateSunPosition() {
        const g = getPadGeometry();
        if (!g.size) return;
        const [lx, ly] = state.currentLight;
        sun.style.left = (g.cx + lx * g.maxDist) + 'px';
        sun.style.top  = (g.cy - ly * g.maxDist) + 'px';
    }
    function showTargetMarker() {
        const g = getPadGeometry();
        if (!g.size) return;
        const [tx, ty] = state.targetLight;
        targetMarker.style.left = (g.cx + tx * g.maxDist) + 'px';
        targetMarker.style.top  = (g.cy - ty * g.maxDist) + 'px';
        targetMarker.style.display = 'block';
    }

    let renderPending = false;
    function scheduleRender() {
        if (renderPending) return;
        renderPending = true;
        requestAnimationFrame(() => {
            renderPending = false;
            if (state.normals) renderMainSparse(state.normals, state.hitMask, state.currentLight);
        });
    }

    let isDragging = false;
    function handlePadPointer(e) {
        const g = getPadGeometry(); if (!g.size) return;
        let dx = e.clientX - g.rect.left - g.cx, dy = e.clientY - g.rect.top - g.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > g.maxDist) { dx = dx / dist * g.maxDist; dy = dy / dist * g.maxDist; }
        const lx = dx / g.maxDist, ly = -dy / g.maxDist, lz = Math.sqrt(Math.max(0, 1 - lx*lx - ly*ly));
        state.currentLight = [lx, ly, lz];
        sun.style.left = (g.cx + dx) + 'px'; sun.style.top = (g.cy + dy) + 'px';
        scheduleRender();
    }
    pad.addEventListener('pointerdown', (e) => { if (state.phase !== 'playing') return; isDragging = true; try { pad.setPointerCapture(e.pointerId); } catch (_) {} handlePadPointer(e); });
    pad.addEventListener('pointermove', (e) => { if (isDragging) handlePadPointer(e); });
    pad.addEventListener('pointerup', (e) => { isDragging = false; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} });
    pad.addEventListener('pointercancel', () => { isDragging = false; });

    const SHAPE_SEQUENCE = ['sphere', 'sphere', 'cube', 'cube', 'cylinder', 'ellipsoid', 'cube', 'cylinder', 'ellipsoid', 'sphere'];
    const shapeNames = { sphere: 'сфера', cube: 'куб', cylinder: 'цилиндр', ellipsoid: 'эллипсоид' };

    function generateTargetLight() {
        for (let attempt = 0; attempt < 200; attempt++) {
            const lx = rand(-0.85, 0.85), ly = rand(-0.7, 0.85), r2 = lx*lx + ly*ly;
            if (r2 > 0.8) continue;
            const lz = Math.sqrt(1 - r2);
            if (lz < 0.3 || lz > 0.92) continue;
            return [lx, ly, lz];
        }
        return [0.55, 0.55, Math.sqrt(1 - 0.55*0.55 - 0.55*0.55)];
    }

    function startRound() {
        const shape = SHAPE_SEQUENCE[(state.round - 1) % SHAPE_SEQUENCE.length];
        const rot = makeRotation(shape);
        const targetLight = generateTargetLight();
        const { normals, hitMask } = computeNormals(shape, rot, MAIN_SIZE);
        state.shape = shape; state.rot = rot; state.targetLight = targetLight;
        state.currentLight = [0, 0, 1]; state.normals = normals; state.hitMask = hitMask; state.phase = 'playing';
        roundNum.textContent = state.round; scoreValue.textContent = state.score;
        levelDisplay.textContent = state.round + ' / ' + ROUNDS_TOTAL;
        updateSunPosition(); targetMarker.style.display = 'none';
        feedbackEl.classList.remove('visible'); feedbackEl.innerHTML = '';
        submitBtn.textContent = 'Проверить'; submitBtn.disabled = false;
        fillBackground(mainImageData, MAIN_SIZE); renderMainSparse(normals, hitMask, state.currentLight);
        renderRef(normals, hitMask, targetLight);
    }

    function describeLight(light) {
        const [lx, ly] = light;
        if (Math.hypot(lx, ly) < 0.2) return 'спереди';
        const deg = ((Math.atan2(ly, lx) * 180 / Math.PI) + 360) % 360;
        if (deg >= 337.5 || deg < 22.5) return 'справа';
        if (deg < 67.5) return 'сверху-справа'; if (deg < 112.5) return 'сверху';
        if (deg < 157.5) return 'сверху-слева'; if (deg < 202.5) return 'слева';
        if (deg < 247.5) return 'снизу-слева'; if (deg < 292.5) return 'снизу';
        return 'снизу-справа';
    }

    function submit() {
        if (state.phase === 'over') return;
        if (state.phase === 'checked') { nextRound(); return; }
        const [ux, uy, uz] = state.currentLight, [tx, ty, tz] = state.targetLight;
        const dot = clamp(ux*tx + uy*ty + uz*tz, -1, 1);
        const angleDeg = Math.round(Math.acos(dot) * 180 / Math.PI);
        const score = Math.round(1000 * Math.max(0, 1 - (angleDeg * Math.PI / 180) / (Math.PI / 2)));
        state.score += score; scoreValue.textContent = state.score;
        let quality, qclass;
        if (angleDeg <= 5) { quality = 'Идеально!'; qclass = 'good'; }
        else if (angleDeg <= 15) { quality = 'Отлично!'; qclass = 'good'; }
        else if (angleDeg <= 30) { quality = 'Хорошо'; qclass = 'ok'; }
        else if (angleDeg <= 50) { quality = 'Неплохо, но неточно'; qclass = 'ok'; }
        else { quality = 'Мимо'; qclass = 'bad'; }
        feedbackEl.innerHTML = `
            <span class="quality ${qclass}">${quality}</span>
            <span class="score-add">+${score}</span>
            <span class="detail">${angleDeg}° · ${shapeNames[state.shape]} · свет ${describeLight(state.targetLight)}</span>`;
        feedbackEl.classList.add('visible'); showTargetMarker();
        state.phase = 'checked';
        submitBtn.textContent = state.round < ROUNDS_TOTAL ? 'Следующий →' : 'Результаты';
    }

    function nextRound() {
        if (state.round >= ROUNDS_TOTAL) { endGame(); return; }
        state.round++; startRound();
    }
    function endGame() {
        state.phase = 'over';
        topBar.style.display = 'none'; playArea.style.display = 'none'; bottomBar.style.display = 'none';
        gameOver.classList.add('visible'); finalScore.textContent = state.score;
        const pct = state.score / (ROUNDS_TOTAL * 1000);
        let g;
        if (pct >= 0.9) g = 'Мастер света 🏆'; else if (pct >= 0.75) g = 'Отличное чувство света 👁️';
        else if (pct >= 0.55) g = 'Хороший результат 🌱'; else g = 'Продолжайте тренироваться 💪';
        grade.textContent = g;
    }

    submitBtn.addEventListener('click', submit);
    restartBtn.addEventListener('click', () => {
        state.round = 1; state.score = 0; state.phase = 'playing';
        topBar.style.display = ''; playArea.style.display = ''; bottomBar.style.display = '';
        gameOver.classList.remove('visible'); startRound();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('screen-lightdrag').style.display === 'flex') { e.preventDefault(); submit(); }
    });

    function enter() {
        restartBtn.click();
        requestAnimationFrame(() => {
            if (state.normals) updateSunPosition();
            if (state.phase === 'checked') showTargetMarker();
        });
    }
    function stop() {}

    return { enter, stop, isOpen: () => document.getElementById('screen-lightdrag').style.display === 'flex' };
})();