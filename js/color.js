window.Color = (function () {
    'use strict';

    const COLOR_STAGES = 5;
    const COLOR_PROGRESS_KEY = 'artist_helper_color_progress_v1';
    const COLOR_MAX_LEVEL = 3;
    const COLOR_STAGE_TOLERANCES = [0.25, 0.20, 0.15, 0.10, 0.05];

    const colorRoundNumEl = document.getElementById('color-round-num');
    const colorTolNumEl = document.getElementById('color-tol-num');
    const colorLevelDisplay = document.getElementById('color-level-display');
    const colorTargetEl = document.getElementById('color-target');
    const colorGuessEl = document.getElementById('color-guess');
    const sliderH = document.getElementById('slider-h');
    const sliderS = document.getElementById('slider-s');
    const sliderB = document.getElementById('slider-b');
    const sliderRowS = document.getElementById('slider-row-s');
    const sliderRowB = document.getElementById('slider-row-b');
    const valH = document.getElementById('val-h');
    const valS = document.getElementById('val-s');
    const valB = document.getElementById('val-b');
    const lockS = document.getElementById('lock-s');
    const lockB = document.getElementById('lock-b');
    const btnCheckColor = document.getElementById('btn-check-color');
    const colorFeedback = document.getElementById('color-feedback');
    const colorModalStart = document.getElementById('color-modal-start');
    const colorModalWin = document.getElementById('color-modal-win');
    const colorBtnResume = document.getElementById('color-btn-resume');
    const colorBtnNextLevel = document.getElementById('color-btn-next-level');
    const colorWinTitle = document.getElementById('color-win-title');
    const colorWinDesc = document.getElementById('color-win-desc');
    const colorDevPanel = document.getElementById('color-dev-panel');
    const colorDevContent = document.getElementById('color-dev-content');

    let colorLevel = 1;
    let colorStage = 0;
    let colorTarget = { h: 180, s: 50, b: 50 };
    let colorGuess = { h: 0, s: 50, b: 50 };
    let colorLocked = false;

    function hsbToRgb(h, s, b) {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        b = Math.max(0, Math.min(100, b)) / 100;
        const c = b * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = b - c;
        let r = 0, g = 0, bl = 0;
        if (h < 60) { r = c; g = x; bl = 0; }
        else if (h < 120) { r = x; g = c; bl = 0; }
        else if (h < 180) { r = 0; g = c; bl = x; }
        else if (h < 240) { r = 0; g = x; bl = c; }
        else if (h < 300) { r = x; g = 0; bl = c; }
        else { r = c; g = 0; bl = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((bl + m) * 255)
        };
    }

    function hsbToCss(h, s, b) {
        const c = hsbToRgb(h, s, b);
        return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }

    function saveColorProgress() {
        try {
            localStorage.setItem(COLOR_PROGRESS_KEY, JSON.stringify({
                level: colorLevel,
                round: colorStage
            }));
        } catch (e) { }
    }

    function loadColorProgress() {
        try {
            const raw = localStorage.getItem(COLOR_PROGRESS_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data.level !== 'number' || typeof data.round !== 'number') return null;
            return data;
        } catch (e) { return null; }
    }

    function clearColorProgress() {
        try { localStorage.removeItem(COLOR_PROGRESS_KEY); } catch (e) { }
    }

    function enter() {
        updateColorStartModal();
    }

    function updateColorStartModal() {
        colorModalWin.style.display = 'none';
        colorModalStart.style.display = 'flex';

        const saved = loadColorProgress();
        const hasProgress = saved && !(saved.level === 1 && saved.round === 0);

        if (hasProgress) {
            const safeLevel = Math.min(COLOR_MAX_LEVEL, Math.max(1, saved.level));
            const safeStage = Math.min(COLOR_STAGES - 1, Math.max(0, saved.round));
            colorBtnResume.style.display = 'inline-block';
            colorBtnResume.textContent = 'Продолжить с ур. ' + safeLevel + ', стадия ' + (safeStage + 1);
        } else {
            colorBtnResume.style.display = 'none';
        }

        const freshBtn = colorModalStart.querySelector('.btn-start');
        if (freshBtn) freshBtn.textContent = hasProgress ? 'Начать заново' : 'Начать';
    }

    function resumeColorProgress() {
        const saved = loadColorProgress();
        if (saved) {
            colorLevel = Math.min(COLOR_MAX_LEVEL, Math.max(1, saved.level));
            colorStage = Math.min(COLOR_STAGES - 1, Math.max(0, saved.round));
        }
        colorLevelDisplay.innerText = 'Уровень ' + colorLevel;
        initColorGame();
    }

    function startFreshColor() {
        colorLevel = 1;
        colorStage = 0;
        colorLevelDisplay.innerText = 'Уровень 1';
        clearColorProgress();
        initColorGame();
    }

    function getColorTolerance() {
        const idx = Math.min(Math.max(0, colorStage), COLOR_STAGES - 1);
        return COLOR_STAGE_TOLERANCES[idx];
    }

    function generateColorTarget() {
        const h = Math.floor(Math.random() * 361);
        let s = 50, b = 50;
        if (colorLevel >= 2) s = 20 + Math.floor(Math.random() * 81);
        if (colorLevel >= 3) b = 20 + Math.floor(Math.random() * 81);
        return { h, s, b };
    }

    function circularHueDiff(a, b) {
        let d = Math.abs(a - b);
        if (d > 180) d = 360 - d;
        return d;
    }

    function updateSliderAvailability() {
        sliderRowS.classList.toggle('locked', colorLevel < 2);
        sliderRowB.classList.toggle('locked', colorLevel < 3);
        sliderS.disabled = colorLevel < 2;
        sliderB.disabled = colorLevel < 3;
        lockS.style.display = colorLevel < 2 ? 'inline' : 'none';
        lockB.style.display = colorLevel < 3 ? 'inline' : 'none';
    }

    function updateColorUI() {
        valH.textContent = String(colorGuess.h);
        valS.textContent = String(colorGuess.s);
        valB.textContent = String(colorGuess.b);
        colorGuessEl.style.background = hsbToCss(colorGuess.h, colorGuess.s, colorGuess.b);
        colorTargetEl.style.background = hsbToCss(colorTarget.h, colorTarget.s, colorTarget.b);
        updateSliderGradients();
        colorRoundNumEl.textContent = String(Math.min(colorStage, COLOR_STAGES - 1) + 1);
        colorTolNumEl.textContent = Math.round(getColorTolerance() * 100);
        colorLevelDisplay.innerText = 'Уровень ' + colorLevel;
    }

    function updateSliderGradients() {
        const s0 = hsbToCss(colorGuess.h, 0, colorGuess.b);
        const s1 = hsbToCss(colorGuess.h, 100, colorGuess.b);
        sliderS.style.background = `linear-gradient(to right, ${s0}, ${s1})`;
        const b0 = hsbToCss(colorGuess.h, colorGuess.s, 0);
        const b1 = hsbToCss(colorGuess.h, colorGuess.s, 100);
        sliderB.style.background = `linear-gradient(to right, ${b0}, ${b1})`;
    }

    function initColorGame() {
        colorModalStart.style.display = 'none';
        colorModalWin.style.display = 'none';
        colorLocked = false;
        colorFeedback.textContent = '';
        colorFeedback.className = 'color-feedback';

        colorGuess = { h: 0, s: 50, b: 50 };
        sliderH.value = '0';
        sliderS.value = '50';
        sliderB.value = '50';

        colorTarget = generateColorTarget();
        updateSliderAvailability();
        updateColorUI();

        saveColorProgress();
        if (!colorDevPanel.classList.contains('hidden')) buildColorDevPanel();
        btnCheckColor.disabled = false;
    }

    /* Совпадение = 100% × (1 − максимальное нормированное отклонение по активным каналам).
       Канал активен: тон — всегда, насыщенность — со 2-го уровня, яркость — с 3-го. */
    function computeColorMatch() {
        const tol = getColorTolerance();
        const hDiff = circularHueDiff(colorTarget.h, colorGuess.h);
        const hErr = hDiff / 180;
        const sErr = colorLevel >= 2 ? Math.abs(colorTarget.s - colorGuess.s) / 100 : 0;
        const bErr = colorLevel >= 3 ? Math.abs(colorTarget.b - colorGuess.b) / 100 : 0;
        const worstErr = Math.max(hErr, sErr, bErr);
        const accuracy = Math.max(0, Math.min(100, Math.round((1 - worstErr) * 100)));
        const hOk = hErr <= tol;
        const sOk = colorLevel < 2 || sErr <= tol;
        const bOk = colorLevel < 3 || bErr <= tol;
        return { accuracy, tol, hOk, sOk, bOk, allOk: hOk && sOk && bOk };
    }

    function checkColorGuess() {
        if (colorLocked) return;
        const m = computeColorMatch();

        if (m.allOk) {
            colorFeedback.textContent = 'Верно! Совпадение: ' + m.accuracy + '%.';
            colorFeedback.className = 'color-feedback ok';
            colorLocked = true;
            btnCheckColor.disabled = true;
            colorStage++;
            saveColorProgress();
            if (colorStage >= COLOR_STAGES) {
                setTimeout(() => {
                    if (colorLevel >= COLOR_MAX_LEVEL) {
                        colorWinTitle.textContent = 'Все уровни пройдены!';
                        colorWinDesc.textContent = 'Вы угадали все цвета на всех уровнях.';
                        colorBtnNextLevel.style.display = 'none';
                    } else {
                        colorWinTitle.textContent = 'Уровень пройден!';
                        colorWinDesc.textContent = 'Вы угадали все ' + COLOR_STAGES + ' цветов.';
                        colorBtnNextLevel.style.display = 'inline-block';
                    }
                    colorModalWin.style.display = 'flex';
                    colorLocked = false;
                    btnCheckColor.disabled = false;
                }, 1000);
            } else {
                setTimeout(() => {
                    nextColorStage();
                    colorLocked = false;
                    btnCheckColor.disabled = false;
                }, 1000);
            }
        } else {
            const failed = [];
            if (!m.hOk) failed.push('тон');
            if (!m.sOk) failed.push('насыщенность');
            if (!m.bOk) failed.push('яркость');
            colorFeedback.textContent = 'Мимо. Совпадение: ' + m.accuracy + '%. Не попали: ' + failed.join(', ') + '.';
            colorFeedback.className = 'color-feedback err';
        }
    }

    function nextColorStage() {
        colorFeedback.textContent = '';
        colorFeedback.className = 'color-feedback';
        colorTarget = generateColorTarget();
        colorGuess = { h: 0, s: 50, b: 50 };
        sliderH.value = '0';
        sliderS.value = '50';
        sliderB.value = '50';
        updateSliderAvailability();
        updateColorUI();
        saveColorProgress();
        if (!colorDevPanel.classList.contains('hidden')) buildColorDevPanel();
    }

    function onColorSliderInput() {
        colorGuess.h = parseInt(sliderH.value, 10);
        colorGuess.s = parseInt(sliderS.value, 10);
        colorGuess.b = parseInt(sliderB.value, 10);
        updateColorUI();
    }

    sliderH.addEventListener('input', onColorSliderInput);
    sliderS.addEventListener('input', onColorSliderInput);
    sliderB.addEventListener('input', onColorSliderInput);

    function nextColorLevel() {
        if (colorLevel < COLOR_MAX_LEVEL) {
            colorLevel++;
            colorLevelDisplay.innerText = 'Уровень ' + colorLevel;
        }
        colorStage = 0;
        initColorGame();
    }

    function resetColorLevel() {
        colorLevel = 1;
        colorStage = 0;
        colorLevelDisplay.innerText = 'Уровень 1';
        initColorGame();
    }

    function toggleColorDevPanel() {
        if (colorDevPanel.classList.contains('hidden')) {
            colorDevPanel.classList.remove('hidden');
            buildColorDevPanel();
        } else {
            colorDevPanel.classList.add('hidden');
        }
    }

    function buildColorDevPanel() {
        colorDevContent.innerHTML = '';
        for (let lvl = 1; lvl <= COLOR_MAX_LEVEL; lvl++) {
            const row = document.createElement('div');
            row.className = 'dev-level-row';
            const label = document.createElement('div');
            label.className = 'dev-level-label';
            label.textContent = 'Уровень ' + lvl;
            row.appendChild(label);
            const btn = document.createElement('button');
            btn.className = 'dev-fig-btn';
            btn.textContent = '→';
            btn.style.width = '44px';
            if (lvl === colorLevel) btn.classList.add('active');
            btn.onclick = () => jumpToColorLevel(lvl);
            row.appendChild(btn);
            colorDevContent.appendChild(row);
        }
    }

    function jumpToColorLevel(level) {
        colorLevel = Math.min(COLOR_MAX_LEVEL, Math.max(1, level));
        colorStage = 0;
        colorLevelDisplay.innerText = 'Уровень ' + colorLevel;
        initColorGame();
    }

    return {
        enter,
        resumeColorProgress,
        startFreshColor,
        checkColorGuess,
        nextColorLevel,
        resetColorLevel,
        toggleColorDevPanel,
        isDevPanelOpen: () => !colorDevPanel.classList.contains('hidden'),
        isOpen: () => document.getElementById('screen-color').style.display === 'flex'
    };
})();