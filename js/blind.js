window.Blind = (function () {
    'use strict';

    const REFERENCES = [
        { id: 'tree', name: 'Дерево', viewBox: { width: 300, height: 300 }, path: 'M150,30 L70,180 L230,180 Z M120,180 L120,270 L180,270 L180,180' },
        { id: 'house', name: 'Дом', viewBox: { width: 300, height: 350 }, path: 'M40,180 L150,70 L260,180 L260,320 L180,320 L180,240 L120,240 L120,320 L40,320 Z' },
        { id: 'heart', name: 'Сердце', viewBox: { width: 300, height: 300 }, path: 'M150,240 C50,170 30,90 100,70 C130,60 150,90 150,110 C150,90 170,60 200,70 C270,90 250,170 150,240 Z' },
        { id: 'cup', name: 'Чашка', viewBox: { width: 340, height: 350 }, path: 'M80,80 L80,260 Q80,300 120,300 L220,300 Q260,300 260,260 L260,80 Z M260,130 Q310,130 310,180 Q310,230 260,230' },
        { id: 'apple', name: 'Яблоко', viewBox: { width: 340, height: 360 }, path: 'M170,120 C130,80 60,110 60,190 C60,270 110,330 170,330 C230,330 280,270 280,190 C280,110 210,80 170,120 Z M170,120 L170,70' },
        { id: 'fish', name: 'Рыба', viewBox: { width: 300, height: 300 }, path: 'M180,80 C120,80 80,110 80,150 C80,190 120,220 180,220 C240,220 280,190 280,150 C280,110 240,80 180,80 Z M80,150 L20,90 L20,210 Z' },
        { id: 'star', name: 'Звезда', viewBox: { width: 300, height: 300 }, path: 'M150,20 L182.3,105.5 L273.6,109.8 L202.3,167 L226.4,255.2 L150,205 L73.6,255.2 L97.7,167 L26.4,109.8 L117.7,105.5 Z' },
        { id: 'key', name: 'Ключ', viewBox: { width: 300, height: 250 }, path: 'M80,150 m-45,0 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0 M125,130 L260,130 L260,170 L125,170 Z M220,170 L220,200 L235,200 L235,170 M180,170 L180,190 L195,190 L195,170' },
        { id: 'umbrella', name: 'Зонт', viewBox: { width: 300, height: 300 }, path: 'M40,150 A110,110 0 0,1 260,150 Q240,120 220,150 Q200,120 180,150 Q160,120 140,150 Q120,120 100,150 Q80,120 60,150 Q40,120 40,150 M150,150 L150,240 Q150,270 125,270' },
        { id: 'cat', name: 'Кошка', viewBox: { width: 300, height: 300 }, path: 'M100,50 L120,110 C70,120 50,160 60,200 C80,250 220,250 240,200 C250,160 230,120 180,110 L200,50 L150,100 Z' }
    ];

    const MEMORIZE_DURATION = 5000;
    const SCORING_SIZE = 256;
    const DILATE_RADIUS = 3;
    const STROKE_FRAC = 0.018;

    const state = {
        roundIndex: 0, totalScore: 0, roundScores: [],
        phase: 'idle', strokes: [], currentStroke: null,
        memorizeStart: 0, drawStart: 0, memorizeRaf: 0, drawRaf: 0
    };

    const $ = id => document.getElementById(id);

    /* ---------- РЕНДЕР ---------- */
    function drawReference(ctx, ref, size, opts = {}) {
        const { stroke = '#222', lineWidth = 2, fill = 'none' } = opts;
        const vb = ref.viewBox;
        const scale = Math.min(size / vb.width, size / vb.height);
        const ox = (size - vb.width * scale) / 2;
        const oy = (size - vb.height * scale) / 2;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);
        const path = new Path2D(ref.path);
        if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(path); }
        if (stroke) {
            ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth / scale;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path);
        }
        ctx.restore();
    }

    function drawStrokes(ctx, strokes, size, opts = {}) {
        const { stroke = '#222', lineWidth = 3 } = opts;
        ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (const s of strokes) {
            if (s.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(s[0].x * size, s[0].y * size);
            for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * size, s[i].y * size);
            ctx.stroke();
        }
    }

    /* ---------- СКОРИНГ ---------- */
    function rasterizeMask(size, drawFn) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, size, size);
        drawFn(ctx, size);
        return ctx.getImageData(0, 0, size, size);
    }

    function dilateMask(mask, radius) {
        const { width, height, data } = mask;
        const src = document.createElement('canvas');
        src.width = width; src.height = height;
        src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
        const dst = document.createElement('canvas');
        dst.width = width; dst.height = height;
        const dctx = dst.getContext('2d');
        dctx.filter = `blur(${radius}px)`;
        dctx.drawImage(src, 0, 0);
        const out = dctx.getImageData(0, 0, width, height);
        for (let i = 0; i < out.data.length; i += 4) {
            const v = out.data[i] > 50 ? 255 : 0;
            out.data[i] = out.data[i+1] = out.data[i+2] = v; out.data[i+3] = 255;
        }
        return out;
    }

    function computeIoU(a, b) {
        const A = a.data, B = b.data;
        let inter = 0, uni = 0;
        for (let i = 0; i < A.length; i += 4) {
            const av = A[i] > 128, bv = B[i] > 128;
            if (av && bv) inter++;
            if (av || bv) uni++;
        }
        return uni ? inter / uni : 0;
    }

    function samplePoints(mask, step = 2) {
        const pts = [];
        const { width, height, data } = mask;
        for (let y = 0; y < height; y += step)
            for (let x = 0; x < width; x += step)
                if (data[(y * width + x) * 4] > 128) pts.push(x, y);
        return pts;
    }

    function chamferDistance(ptsA, ptsB) {
        const nA = ptsA.length / 2, nB = ptsB.length / 2;
        if (!nA || !nB) return Infinity;
        const avgMin = (A, nA, B, nB) => {
            let sum = 0;
            for (let i = 0; i < nA; i++) {
                const ax = A[i*2], ay = A[i*2+1];
                let min = Infinity;
                for (let j = 0; j < nB; j++) {
                    const dx = ax - B[j*2], dy = ay - B[j*2+1];
                    const d = dx*dx + dy*dy;
                    if (d < min) min = d;
                }
                sum += Math.sqrt(min);
            }
            return sum / nA;
        };
        return (avgMin(ptsA, nA, ptsB, nB) + avgMin(ptsB, nB, ptsA, nA)) / 2;
    }

    function computeScore(ref, strokes) {
        const S = SCORING_SIZE;
        const lw = S * STROKE_FRAC;
        const refMask = rasterizeMask(S, (ctx, size) => drawReference(ctx, ref, size, { stroke: 'white', lineWidth: lw }));
        const playerMask = rasterizeMask(S, (ctx, size) => drawStrokes(ctx, strokes, size, { stroke: 'white', lineWidth: lw }));
        const ptsRef = samplePoints(refMask, 2);
        const ptsPlayer = samplePoints(playerMask, 2);
        if (!ptsRef.length || !ptsPlayer.length) return { score: 0, iou: 0, chamferPx: 0 };
        const iou = computeIoU(dilateMask(refMask, DILATE_RADIUS), dilateMask(playerMask, DILATE_RADIUS));
        const chamfer = chamferDistance(ptsRef, ptsPlayer);
        const chamferNorm = isFinite(chamfer) ? chamfer / S : 1;
        const raw = Math.pow(iou, 0.5) * 0.6 + Math.max(0, 1 - chamferNorm * 3) * 0.4;
        return {
            score: Math.round(Math.max(0, Math.min(100, raw * 100))),
            iou: Math.round(iou * 100), chamferPx: Math.round(chamfer)
        };
    }

    /* ---------- UI ---------- */
    function showScreen(id) {
        document.querySelectorAll('.blind-screen').forEach(s => s.classList.remove('active'));
        $(id).classList.add('active');
    }

    function renderProgress(containerId) {
        const el = $(containerId);
        el.innerHTML = '';
        for (let i = 0; i < REFERENCES.length; i++) {
            const d = document.createElement('div');
            d.className = 'dot';
            if (i < state.roundIndex) d.classList.add('done');
            else if (i === state.roundIndex) d.classList.add('active');
            el.appendChild(d);
        }
    }

    function updateRoundLabels() {
        const text = `Раунд ${state.roundIndex + 1} / ${REFERENCES.length}`;
        $('blind-memorize-round-label').textContent = text;
        $('blind-draw-round-label').textContent = text;
        $('blind-result-round-label').textContent = text;
        $('blind-level-display').textContent = `${state.roundIndex + 1} / ${REFERENCES.length}`;
    }

    /* ---------- ЦИКЛ ---------- */
    function startGame() {
        cancelAnimationFrame(state.memorizeRaf);
        cancelAnimationFrame(state.drawRaf);
        state.roundIndex = 0; state.totalScore = 0; state.roundScores = [];
        startRound();
    }

    function startRound() {
        cancelAnimationFrame(state.memorizeRaf);
        cancelAnimationFrame(state.drawRaf);
        state.strokes = []; state.currentStroke = null; state.phase = 'memorize';
        updateRoundLabels(); renderProgress('blind-memorize-progress');
        showScreen('blind-screen-memorize');
        
        requestAnimationFrame(() => requestAnimationFrame(() => {
            setupMemorizeCanvas();
            state.memorizeStart = performance.now();
            tickMemorize();
        }));
    }

    function setupMemorizeCanvas() {
        const c = $('blind-memorize-canvas');
        const dpr = window.devicePixelRatio || 1;
        const size = c.getBoundingClientRect().width || 400;
        c.width = size * dpr; c.height = size * dpr;
        const ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size);
        drawReference(ctx, REFERENCES[state.roundIndex], size, { stroke: '#222', lineWidth: 4 });
    }

    function tickMemorize() {
        const remaining = MEMORIZE_DURATION - (performance.now() - state.memorizeStart);
        $('blind-memorize-timer').textContent = Math.max(0, remaining / 1000).toFixed(1) + ' с';
        if (remaining > 0) {
            state.memorizeRaf = requestAnimationFrame(tickMemorize);
        } else {
            toDrawing();
        }
    }

    function toDrawing() {
        state.phase = 'drawing';
        renderProgress('blind-draw-progress');
        showScreen('blind-screen-draw');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const c = $('blind-drawing-canvas');
            const dpr = window.devicePixelRatio || 1;
            const size = c.getBoundingClientRect().width || 400;
            c.width = size * dpr; c.height = size * dpr;
            c.getContext('2d').clearRect(0, 0, c.width, c.height);
            state.drawStart = performance.now();
            tickDrawing();
        }));
    }

    function tickDrawing() {
        if (state.phase !== 'drawing') return;
        const sec = Math.floor((performance.now() - state.drawStart) / 1000);
        $('blind-drawing-timer').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        state.drawRaf = requestAnimationFrame(tickDrawing);
    }

    function finishDrawing() {
        if (state.phase !== 'drawing') return;
        state.phase = 'result';
        cancelAnimationFrame(state.drawRaf);
        hideDot();
        const ref = REFERENCES[state.roundIndex];
        const result = computeScore(ref, state.strokes);
        state.roundScores.push(result);
        state.totalScore += result.score;
        
        renderProgress('blind-result-progress');
        showScreen('blind-screen-result');
        
        requestAnimationFrame(() => requestAnimationFrame(() => {
            renderResultCanvas(ref);
            $('blind-result-score').textContent = result.score;
            $('blind-result-label').textContent = result.score >= 70 ? 'Отлично!' : result.score >= 50 ? 'Хорошо!' : result.score >= 30 ? 'Неплохо!' : 'Попробуйте ещё';
            $('blind-metric-iou').textContent = result.iou + '%';
            $('blind-metric-chamfer').textContent = result.chamferPx + ' px';
            const done = state.roundIndex + 1;
            $('blind-result-total').textContent = `Всего: ${state.totalScore} из ${done * 100}`;
            const isLast = state.roundIndex >= REFERENCES.length - 1;
            $('blind-next-btn').textContent = isLast ? 'Результаты' : 'Следующий раунд';
        }));
    }

    function nextRound() {
        if (state.phase !== 'result') return;
        if (state.roundIndex >= REFERENCES.length - 1) {
            showFinal();
        } else {
            state.roundIndex++;
            startRound();
        }
    }

    function showFinal() {
        state.phase = 'final';
        showScreen('blind-screen-final');
        $('blind-final-total').textContent = state.totalScore;
        const label = state.totalScore >= 800 ? 'Мастер контура!' : state.totalScore >= 600 ? 'Отличный результат' : state.totalScore >= 400 ? 'Хорошо' : state.totalScore >= 200 ? 'Неплохо' : 'Тренируйтесь!';
        $('blind-final-label').textContent = label;
        
        const list = $('blind-final-list');
        list.innerHTML = '';
        state.roundScores.forEach((r, i) => {
            const row = document.createElement('div');
            row.className = 'blind-final-row';
            const cls = r.score >= 60 ? 'good' : r.score >= 35 ? 'mid' : 'low';
            row.innerHTML = `<span>${i + 1}. ${REFERENCES[i].name}</span><b class="${cls}">${r.score}</b>`;
            list.appendChild(row);
        });
    }

    function renderResultCanvas(ref) {
        const c = $('blind-result-canvas');
        const dpr = window.devicePixelRatio || 1;
        const size = c.getBoundingClientRect().width || 400;
        c.width = size * dpr; c.height = size * dpr;
        const ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        drawReference(ctx, ref, size, { stroke: 'rgba(80,140,220,0.55)', lineWidth: 4 });
        drawStrokes(ctx, state.strokes, size, { stroke: '#d94a4a', lineWidth: 3 });
    }

    /* ---------- РИСОВАНИЕ ---------- */
    function toNorm(e, canvas) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    function showDotAt(e) {
        const dot = $('blind-cursor-dot');
        const wrap = $('blind-draw-wrap').getBoundingClientRect();
        dot.style.left = (e.clientX - wrap.left) + 'px';
        dot.style.top  = (e.clientY - wrap.top)  + 'px';
        dot.style.display = 'block';
    }
    function hideDot() { $('blind-cursor-dot').style.display = 'none'; }

    function bindDrawing() {
        const canvas = $('blind-drawing-canvas');
        canvas.addEventListener('pointerdown', e => {
            if (state.phase !== 'drawing') return;
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            state.currentStroke = [toNorm(e, canvas)];
            state.strokes.push(state.currentStroke);
        });
        canvas.addEventListener('pointermove', e => {
            if (state.phase !== 'drawing') return;
            showDotAt(e);
            if (!state.currentStroke) return;
            e.preventDefault();
            state.currentStroke.push(toNorm(e, canvas));
        });
        const end = () => { state.currentStroke = null; };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('pointerleave', hideDot);
    }

    /* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */
    let inited = false;
    function doInit() {
        if (inited) return;
        inited = true;
        $('blind-start-btn').addEventListener('click', startGame);
        $('blind-done-btn').addEventListener('click', finishDrawing);
        $('blind-next-btn').addEventListener('click', nextRound);
        $('blind-restart-btn').addEventListener('click', startGame);
        bindDrawing();
    }

    function enter() {
        if (!inited) doInit();
        showScreen('blind-screen-start');
        state.phase = 'idle';
        cancelAnimationFrame(state.memorizeRaf);
        cancelAnimationFrame(state.drawRaf);
        hideDot();
    }

    function stop() {
        cancelAnimationFrame(state.memorizeRaf);
        cancelAnimationFrame(state.drawRaf);
        state.phase = 'idle';
        hideDot();
    }

    return {
        enter,
        stop,
        isOpen: () => document.getElementById('screen-blind').style.display === 'flex',
        isDevPanelOpen: () => false
    };
})();