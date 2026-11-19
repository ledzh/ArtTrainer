window.Temperature = (function () {
    'use strict';

    const ROUNDS_PER_LEVEL = 10;
    const TOTAL_LEVELS = 3;
    const PROGRESS_KEY = 'artist_helper_temperature_progress_v3';

    const LEVEL_1_COLORS = [
        [230, 50, 50], [255, 140, 30], [255, 215, 50], [200, 80, 60], [230, 100, 150],
        [70, 130, 230], [40, 170, 200], [30, 140, 140], [110, 90, 200]
    ];
    const LEVEL_2_COLORS = [
        [210, 180, 140], [150, 170, 200], [190, 140, 150], [130, 160, 130],
        [200, 190, 160], [160, 150, 190], [220, 200, 180], [100, 130, 150],
        [170, 210, 200], [200, 170, 130]
    ];

    /* ============================================================
       ЦВЕТОВЫЕ УТИЛИТЫ
       ============================================================ */
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
                case g: h = ((b - r) / d + 2) * 60; break;
                case b: h = ((r - g) / d + 4) * 60; break;
            }
        }
        return { h, s, l };
    }

    function computeTemperature(r, g, b) {
        const { h, s, l } = rgbToHsl(r, g, b);
        const cosFactor = Math.cos((h - 30) * Math.PI / 180);
        const chroma = s * Math.min(l, 1 - l) * 2;
        return Math.round(cosFactor * chroma * 100);
    }

    function colorToCss(rgb) {
        return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
    }

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function formatTemp(t) { return t > 0 ? '+' + t : String(t); }

    function plural(n, one, few, many) {
        const abs = Math.abs(n);
        const mod10 = abs % 10;
        const mod100 = abs % 100;
        if (mod100 >= 11 && mod100 <= 19) return many;
        if (mod10 === 1) return one;
        if (mod10 >= 2 && mod10 <= 4) return few;
        return many;
    }

    /* ============================================================
       ПРОГРЕСС
       ============================================================ */
    let progress = { currentLevel: 1, bestAccuracy: {} };

    function loadProgress() {
        try {
            const raw = localStorage.getItem(PROGRESS_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return;
            const cl = parseInt(data.currentLevel, 10);
            progress = {
                currentLevel: isFinite(cl) && cl >= 1 ? Math.min(cl, TOTAL_LEVELS + 1) : 1,
                bestAccuracy: data.bestAccuracy && typeof data.bestAccuracy === 'object'
                    ? data.bestAccuracy : {}
            };
        } catch (e) { }
    }
    function saveProgress() {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { }
    }

    /* ============================================================
       ГЕНЕРАЦИЯ
       ============================================================ */
    function pickLevel1Color() {
        return LEVEL_1_COLORS[randomInt(0, LEVEL_1_COLORS.length - 1)].slice();
    }
    function pickLevel2Color() {
        return LEVEL_2_COLORS[randomInt(0, LEVEL_2_COLORS.length - 1)].slice();
    }

    function generatePairRound() {
        for (let attempt = 0; attempt < 30; attempt++) {
            let a, b;
            if (Math.random() < 0.5) { a = pickLevel1Color(); b = pickLevel1Color(); }
            else { a = pickLevel2Color(); b = pickLevel2Color(); }
            const tempA = computeTemperature(a[0], a[1], a[2]);
            const tempB = computeTemperature(b[0], b[1], b[2]);
            if (Math.abs(tempA - tempB) >= 25) return { a, b, tempA, tempB };
        }
        const a = [255, 140, 30], b = [70, 130, 230];
        return {
            a, b,
            tempA: computeTemperature(a[0], a[1], a[2]),
            tempB: computeTemperature(b[0], b[1], b[2])
        };
    }

    /* ============================================================
       DOM (заполняется в doInit)
       ============================================================ */
    let screenTemperature = null;
    let gameScreen = null;
    let subtitle = null;
    let levelBadge = null;
    let colorSwatch = null;
    let pairArea = null;
    let sliderControls = null;
    let pairControls = null;
    let tempSlider = null;
    let tempValue = null;
    let checkBtn = null;
    let feedbackEl = null;
    let roundCurrentEl = null;
    let roundTotalEl = null;
    let accuracyDisplay = null;
    let resultModal = null;
    let resultTitle = null;
    let resultMessage = null;
    let btnMenu = null;
    let btnRetry = null;
    let btnNext = null;
    let btnRestart = null;
    let pairButtons = [];

    function $(id) {
        const el = document.getElementById(id);
        if (!el) console.error('Temperature: не найден элемент #' + id);
        return el;
    }

    /* ============================================================
       СОСТОЯНИЕ
       ============================================================ */
    let currentLevel = 1;
    let currentRound = 0;
    let totalError = 0;
    let locked = false;
    let advanceTimer = null;
    let currentCorrectTemp = 0;
    let currentPair = null;

    /* ============================================================
       ИГРА
       ============================================================ */
    function startLevel(level) {
        currentLevel = level;
        currentRound = 0;
        totalError = 0;
        locked = false;
        if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }

        if (resultModal) resultModal.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex';

        if (subtitle) subtitle.textContent = 'Уровень ' + level + ' из ' + TOTAL_LEVELS;
        if (levelBadge) levelBadge.textContent = level + ' / ' + TOTAL_LEVELS;
        if (roundTotalEl) roundTotalEl.textContent = String(ROUNDS_PER_LEVEL);
        if (accuracyDisplay) accuracyDisplay.textContent = '—';

        if (level === 1) {
            if (colorSwatch) colorSwatch.style.display = 'none';
            if (pairArea) pairArea.style.display = 'flex';
            if (sliderControls) sliderControls.style.display = 'none';
            if (pairControls) pairControls.style.display = 'flex';
        } else {
            if (colorSwatch) colorSwatch.style.display = 'block';
            if (pairArea) pairArea.style.display = 'none';
            if (sliderControls) sliderControls.style.display = 'flex';
            if (pairControls) pairControls.style.display = 'none';
        }

        nextRound();
    }

    function nextRound() {
        locked = false;
        if (feedbackEl) {
            feedbackEl.textContent = '';
            feedbackEl.className = 'temperature-feedback';
        }
        if (roundCurrentEl) roundCurrentEl.textContent = String(currentRound + 1);
        if (subtitle) subtitle.textContent = 'Уровень ' + currentLevel + ' · Раунд ' +
            (currentRound + 1) + ' из ' + ROUNDS_PER_LEVEL;

        if (currentLevel === 1) setupPairRound();
        else setupSliderRound();
    }

    function setupSliderRound() {
        const rgb = currentLevel === 2 ? pickLevel1Color() : pickLevel2Color();
        currentCorrectTemp = computeTemperature(rgb[0], rgb[1], rgb[2]);
        if (colorSwatch) colorSwatch.style.background = colorToCss(rgb);
        if (tempSlider) {
            tempSlider.value = '0';
            tempSlider.disabled = false;
        }
        if (tempValue) tempValue.textContent = '0';
        if (checkBtn) checkBtn.disabled = false;
    }

    function setupPairRound() {
        currentPair = generatePairRound();
        if (pairButtons[0]) pairButtons[0].style.background = colorToCss(currentPair.a);
        if (pairButtons[1]) pairButtons[1].style.background = colorToCss(currentPair.b);
        pairButtons.forEach(btn => {
            btn.classList.remove('correct', 'incorrect');
            btn.disabled = false;
        });
    }

    function checkSliderGuess() {
        if (locked) return;
        const guess = parseInt(tempSlider.value, 10);
        const correct = currentCorrectTemp;
        const error = Math.abs(guess - correct);
        totalError += error;

        locked = true;
        if (tempSlider) tempSlider.disabled = true;
        if (checkBtn) checkBtn.disabled = true;

        let cls = 'temperature-feedback ';
        let mainText;
        if (error <= 5)       { cls += 'ok';   mainText = 'Идеально!'; }
        else if (error <= 15) { cls += 'ok';   mainText = 'Отлично!'; }
        else if (error <= 30) { cls += 'warn'; mainText = 'Близко'; }
        else                  { cls += 'err';  mainText = 'Мимо'; }

        if (feedbackEl) {
            let extraTip = '';
            if (error > 20 && currentLevel === 3) {
                extraTip = '<br><span style="opacity:0.7; font-size:0.8rem; display:inline-block; margin-top:4px;">💡 Пастельные цвета менее выражены — их температура ближе к нулю.</span>';
            }

            feedbackEl.className = cls;
            feedbackEl.innerHTML =
                '<div class="temperature-feedback-main">' + mainText + '</div>' +
                '<div class="temperature-feedback-detail">' +
                    'Правильно: ' + formatTemp(correct) +
                    '. Вы указали: ' + formatTemp(guess) +
                    '. Ошибка: ' + error + ' ' + plural(error, 'балл', 'балла', 'баллов') + '.' +
                    extraTip +
                '</div>';
        }

        updateAccuracy();
        scheduleAdvance(2000);
    }

    function onPairClick(e) {
        if (locked) return;
        const btn = e.currentTarget;
        const idx = parseInt(btn.dataset.index, 10);
        const correctIdx = currentPair.tempA > currentPair.tempB ? 0 : 1;
        const correct = idx === correctIdx;

        locked = true;
        pairButtons.forEach(b => b.disabled = true);
        if (pairButtons[correctIdx]) pairButtons[correctIdx].classList.add('correct');

        let cls = 'temperature-feedback ';
        let mainText;
        if (correct) { cls += 'ok'; mainText = 'Верно!'; }
        else {
            cls += 'err'; mainText = 'Мимо';
            btn.classList.add('incorrect');
            totalError += 100;
        }

        if (feedbackEl) {
            feedbackEl.className = cls;
            feedbackEl.innerHTML =
                '<div class="temperature-feedback-main">' + mainText + '</div>' +
                '<div class="temperature-feedback-detail">' +
                    'Температуры: ' + formatTemp(currentPair.tempA) +
                    ' и ' + formatTemp(currentPair.tempB) + '.' +
                '</div>';
        }

        updateAccuracy();
        scheduleAdvance(2200);
    }

    function scheduleAdvance(ms) {
        if (advanceTimer) clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => {
            advanceTimer = null;
            currentRound++;
            if (currentRound >= ROUNDS_PER_LEVEL) finishLevel();
            else nextRound();
        }, ms);
    }

    function updateAccuracy() {
        const roundsDone = currentRound + 1;
        const avgError = totalError / roundsDone;
        const acc = Math.max(0, Math.round(100 - avgError));
        if (accuracyDisplay) accuracyDisplay.textContent = acc + '%';
    }

    function finishLevel() {
        const avgError = totalError / ROUNDS_PER_LEVEL;
        const acc = Math.max(0, Math.round(100 - avgError));
        onLevelComplete(currentLevel, acc);
    }

    function onLevelComplete(level, accuracy) {
        const prevBest = progress.bestAccuracy[level];
        const isNewRecord = prevBest === undefined || accuracy > prevBest;
        if (isNewRecord) progress.bestAccuracy[level] = accuracy;

        const isFinalLevel = level === TOTAL_LEVELS;
        progress.currentLevel = isFinalLevel ? TOTAL_LEVELS + 1 : level + 1;

        saveProgress();
        showResultModal(level, accuracy, isNewRecord, isFinalLevel);
    }

    function showResultModal(level, accuracy, isNewRecord, isFinalLevel) {
        let title, message;

        if (isFinalLevel) {
            title = 'Все уровни пройдены!';
            message = 'Точность: ' + accuracy + '%. ' +
                (isNewRecord ? 'Новый рекорд!' : 'Лучший результат: ' + progress.bestAccuracy[level] + '%.');
            if (btnNext) btnNext.style.display = 'none';
            if (btnRetry) {
                btnRetry.textContent = 'Пройти заново';
                btnRetry.style.display = 'inline-block';
            }
        } else {
            const nextLevel = level + 1;
            title = 'Уровень ' + level + ' пройден!';
            message = 'Точность: ' + accuracy + '%. ' +
                (isNewRecord ? 'Новый рекорд! ' : 'Лучший результат: ' + progress.bestAccuracy[level] + '%. ') +
                'Дальше: Уровень ' + nextLevel + '.';
            if (btnNext) {
                btnNext.style.display = 'inline-block';
                btnNext.textContent = 'Дальше: Уровень ' + nextLevel;
            }
            if (btnRetry) btnRetry.textContent = 'Повторить уровень';
        }

        if (resultTitle) resultTitle.textContent = title;
        if (resultMessage) resultMessage.textContent = message;
        if (resultModal) resultModal.style.display = 'flex';
    }

    /* ============================================================
       ИНИЦИАЛИЗАЦИЯ
       ============================================================ */
    let inited = false;

    function doInit() {
        if (inited) return;
        inited = true;

        screenTemperature = $('screen-temperature');
        gameScreen = $('temperature-game-screen');
        subtitle = $('temperature-subtitle');
        levelBadge = $('temperature-level-display');
        colorSwatch = $('temperature-color-swatch');
        pairArea = $('temperature-pair-area');
        sliderControls = $('temperature-slider-controls');
        pairControls = $('temperature-pair-controls');
        tempSlider = $('temperature-slider');
        tempValue = $('temperature-value');
        checkBtn = $('temperature-check-btn');
        feedbackEl = $('temperature-feedback');
        roundCurrentEl = $('temperature-round-current');
        roundTotalEl = $('temperature-round-total');
        accuracyDisplay = $('temperature-accuracy');
        resultModal = $('temperature-result-modal');
        resultTitle = $('temperature-result-title');
        resultMessage = $('temperature-result-message');
        btnMenu = $('temperature-btn-menu');
        btnRetry = $('temperature-btn-retry');
        btnNext = $('temperature-btn-next');
        btnRestart = $('temperature-btn-restart');
        pairButtons = pairArea ? pairArea.querySelectorAll('.temperature-pair-swatch') : [];

        if (tempSlider) {
            tempSlider.addEventListener('input', () => {
                if (tempValue) tempValue.textContent = tempSlider.value;
            });
        }
        if (checkBtn) checkBtn.addEventListener('click', checkSliderGuess);

        pairButtons.forEach(btn => {
            btn.addEventListener('click', onPairClick);
        });

        if (btnMenu) {
            btnMenu.addEventListener('click', () => {
                if (resultModal) resultModal.style.display = 'none';
                if (window.App && window.App.backToMenu) window.App.backToMenu();
            });
        }

        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                if (resultModal) resultModal.style.display = 'none';
                if (currentLevel === TOTAL_LEVELS) {
                    progress.currentLevel = 1;
                    saveProgress();
                    startLevel(1);
                } else {
                    startLevel(currentLevel);
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (resultModal) resultModal.style.display = 'none';
                const nextLevel = Math.min(currentLevel + 1, TOTAL_LEVELS);
                startLevel(nextLevel);
            });
        }

        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                if (confirm('Начать заново с 1 уровня? Ваши рекорды сохранятся.')) {
                    progress.currentLevel = 1;
                    saveProgress();
                    if (resultModal) resultModal.style.display = 'none';
                    startLevel(1);
                }
            });
        }

        if (screenTemperature) {
            screenTemperature.addEventListener('contextmenu', e => e.preventDefault());
        }

        loadProgress();
    }

    function enter() {
        if (!inited) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    doInit();
                    enter();
                }, { once: true });
                return;
            }
            doInit();
        }

        if (progress.currentLevel > TOTAL_LEVELS) {
            progress.currentLevel = 1;
            saveProgress();
        }
        startLevel(progress.currentLevel);
    }

    function stop() {
        if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
        locked = false;
        if (resultModal) resultModal.style.display = 'none';
    }

    if (document.readyState !== 'loading') {
        doInit();
    }

    return {
        enter,
        stop,
        isOpen: () => screenTemperature && screenTemperature.style.display === 'flex',
        isDevPanelOpen: () => false
    };
})();