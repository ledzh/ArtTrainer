window.Tonal = (function () {
    'use strict';

    const ROUNDS_TOTAL = 10;
    const CANVAS_SIZE = 720;
    const SPHERE_RADIUS_RATIO = 0.38;
    const TARGET_RADIUS = 12;
    const BG_VALUE = 128;

    let state = { round: 1, score: 0, current: null, phase: 'guessing' };

    const $ = id => document.querySelector('#screen-tonal #' + id);

    const scene = $('tonal-scene');
    const ctx = scene.getContext('2d');
    scene.width = CANVAS_SIZE; scene.height = CANVAS_SIZE;

    const slider = $('tonal-slider');
    const sliderValue = $('tonal-sliderValue');
    const swatchPreview = $('tonal-swatchPreview');
    const submitBtn = $('tonal-submitBtn');
    const feedback = $('tonal-feedback');
    const roundNum = $('tonal-roundNum');
    const scoreValue = $('tonal-scoreValue');
    const header = $('tonal-header');
    const content = $('tonal-content');
    const gameOver = $('tonal-gameOver');
    const finalScore = $('tonal-finalScore');
    const grade = $('tonal-grade');
    const restartBtn = $('tonal-restartBtn');
    const levelDisplay = $('tonal-level-display');

    $('tonal-roundTotal').textContent = ROUNDS_TOTAL;

    const rand = (min, max) => Math.random() * (max - min) + min;
    const grayCss = (v) => `rgb(${v},${v},${v})`;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function generateScene() {
        const azimuth = rand(0, Math.PI * 2);
        const elevation = rand(Math.PI * 0.15, Math.PI * 0.45);
        const light = [
            Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(azimuth) * Math.cos(elevation),
        ];
        const len = Math.hypot(light[0], light[1], light[2]);
        light[0] /= len; light[1] /= len; light[2] /= len;

        const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2, r = CANVAS_SIZE * SPHERE_RADIUS_RATIO;
        const img = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
        const values = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE);

        for (let y = 0; y < CANVAS_SIZE; y++) {
            for (let x = 0; x < CANVAS_SIZE; x++) {
                const idx = (y * CANVAS_SIZE + x) * 4;
                const dx = (x - cx) / r, dy = (y - cy) / r, d2 = dx * dx + dy * dy;
                let v;
                if (d2 <= 1) {
                    const dz = Math.sqrt(1 - d2);
                    const nx = dx, ny = -dy, nz = dz;
                    const ndotl = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
                    const bounce = Math.max(0, -ny) * 0.06;
                    const linear = 0.08 + 0.86 * ndotl + bounce;
                    const tone = Math.pow(clamp(linear, 0, 1), 1 / 1.5);
                    v = clamp(Math.round(tone * 240 + 10), 0, 255);
                } else { v = BG_VALUE; }
                values[y * CANVAS_SIZE + x] = v;
                img.data[idx] = v; img.data[idx + 1] = v; img.data[idx + 2] = v; img.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        let targetX, targetY, targetValue;
        for (let attempt = 0; attempt < 60; attempt++) {
            const ang = rand(0, Math.PI * 2);
            const rad = Math.sqrt(Math.random()) * r * 0.72;
            targetX = Math.round(cx + Math.cos(ang) * rad);
            targetY = Math.round(cy + Math.sin(ang) * rad);
            const d2t = Math.pow((targetX - cx) / r, 2) + Math.pow((targetY - cy) / r, 2);
            if (d2t <= 0.75 * 0.75) {
                targetValue = values[targetY * CANVAS_SIZE + targetX];
                break;
            }
        }
        if (targetValue === undefined) {
            targetX = Math.round(cx); targetY = Math.round(cy);
            targetValue = values[targetY * CANVAS_SIZE + targetX];
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(targetX, targetY, TARGET_RADIUS, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(targetX, targetY, TARGET_RADIUS, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        return { targetX, targetY, targetValue };
    }

    function updateSliderUI() {
        const v = parseInt(slider.value, 10);
        sliderValue.textContent = v;
        swatchPreview.style.background = grayCss(v);
    }
    slider.addEventListener('input', updateSliderUI);

    function startRound() {
        state.current = generateScene();
        state.phase = 'guessing';
        slider.value = 128; updateSliderUI();
        submitBtn.textContent = 'Проверить'; submitBtn.disabled = false;
        feedback.classList.remove('visible'); feedback.innerHTML = '';
        roundNum.textContent = state.round;
        scoreValue.textContent = state.score;
        levelDisplay.textContent = state.round + ' / ' + ROUNDS_TOTAL;
    }

    function submitGuess() {
        if (state.phase !== 'guessing') { nextRound(); return; }
        const guess = parseInt(slider.value, 10);
        const correct = state.current.targetValue;
        const diff = Math.abs(guess - correct);
        const points = Math.max(0, Math.round(1000 - diff * 15));
        state.score += points; scoreValue.textContent = state.score;

        let diffClass = 'bad';
        if (diff <= 5) diffClass = 'good'; else if (diff <= 15) diffClass = 'ok';

        let comment = '';
        if (diff <= 3) comment = 'Идеально!'; else if (diff <= 8) comment = 'Отлично!';
        else if (diff <= 15) comment = 'Хорошо, но можно точнее.'; else if (diff <= 30) comment = 'Есть заметное расхождение.';
        else comment = 'Существенная ошибка.';
        if (guess > correct + 10) comment += ' Ваш тон светлее.'; else if (guess < correct - 10) comment += ' Ваш тон темнее.';

        const guessPct = (guess / 255) * 100, correctPct = (correct / 255) * 100;
        feedback.innerHTML = `
            <div class="fb-swatches">
                <div class="fb-swatch-item"><div class="fb-swatch" style="background: ${grayCss(guess)}"></div><div class="fb-caption">ваш</div></div>
                <div class="fb-swatch-item"><div class="fb-swatch" style="background: ${grayCss(correct)}"></div><div class="fb-caption">эталон</div></div>
            </div>
            <div class="tone-strip-wrap"><div class="tone-strip">
                <div class="tone-marker" style="left: ${guessPct}%"></div>
                <div class="tone-marker correct" style="left: ${correctPct}%"></div>
            </div></div>
            <div class="fb-summary"><span>Ошибка: <span class="diff-value ${diffClass}">${diff}</span></span><span class="points">+${points}</span></div>
            <div class="fb-comment">${comment}</div>`;
        feedback.classList.add('visible');
        state.phase = 'revealed';
        submitBtn.textContent = state.round < ROUNDS_TOTAL ? 'Следующий →' : 'Результаты';
    }

    function nextRound() {
        if (state.round >= ROUNDS_TOTAL) { endGame(); return; }
        state.round++; startRound();
    }

    function endGame() {
        state.phase = 'over';
        header.style.display = 'none'; content.style.display = 'none';
        gameOver.classList.add('visible'); finalScore.textContent = state.score;
        const pct = state.score / (ROUNDS_TOTAL * 1000);
        let g;
        if (pct >= 0.9) g = 'Мастер светотени 🏆'; else if (pct >= 0.75) g = 'Уверенный глазомер 👁️';
        else if (pct >= 0.55) g = 'Хороший старт 🌱'; else g = 'Продолжайте тренироваться 💪';
        grade.textContent = g;
    }

    submitBtn.addEventListener('click', submitGuess);
    restartBtn.addEventListener('click', () => {
        state = { round: 1, score: 0, current: null, phase: 'guessing' };
        header.style.display = ''; content.style.display = '';
        gameOver.classList.remove('visible'); startRound();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !submitBtn.disabled && document.getElementById('screen-tonal').style.display === 'flex') {
            e.preventDefault(); submitGuess();
        }
    });

    function enter() {
        restartBtn.click(); // Сбрасываем и начинаем заново при входе
    }
    function stop() {}

    return { enter, stop, isOpen: () => document.getElementById('screen-tonal').style.display === 'flex' };
})();