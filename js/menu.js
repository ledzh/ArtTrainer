window.App = (function () {
    'use strict';

    const screenMenu = document.getElementById('screen-menu');
    const screenExercise = document.getElementById('screen-exercise');
    const screenColorExercise = document.getElementById('screen-color');
    const screenVectorExercise = document.getElementById('screen-vector');
    const screenPressureExercise = document.getElementById('screen-pressure');
    const screenTemperatureExercise = document.getElementById('screen-temperature');
    const screenBlindExercise = document.getElementById('screen-blind');
    const screenTonalExercise = document.getElementById('screen-tonal');
    const screenLightDragExercise = document.getElementById('screen-lightdrag');

    const sections = {
        line: { el: screenExercise, mod: () => window.Line },
        color: { el: screenColorExercise, mod: () => window.Color },
        vector: { el: screenVectorExercise, mod: () => window.Vector },
        pressure: { el: screenPressureExercise, mod: () => window.Pressure },
        temperature: { el: screenTemperatureExercise, mod: () => window.Temperature },
        blind: { el: screenBlindExercise, mod: () => window.Blind },
        tonal: { el: screenTonalExercise, mod: () => window.Tonal },
        lightdrag: { el: screenLightDragExercise, mod: () => window.LightDrag }
    };

    function startExercise(type) {
        const section = sections[type];
        if (!section) return;

        screenExercise.style.display = 'none';
        screenColorExercise.style.display = 'none';
        screenVectorExercise.style.display = 'none';
        screenPressureExercise.style.display = 'none';
        screenTemperatureExercise.style.display = 'none';
        screenBlindExercise.style.display = 'none';
        screenTonalExercise.style.display = 'none';
        screenLightDragExercise.style.display = 'none';
        screenMenu.classList.add('hidden');

        section.el.style.display = 'flex';
        section.mod().enter();
    }

    function backToMenu() {
        if (screenPressureExercise.style.display === 'flex' && window.Pressure) window.Pressure.stop();
        if (screenTemperatureExercise.style.display === 'flex' && window.Temperature) window.Temperature.stop();
        if (screenBlindExercise.style.display === 'flex' && window.Blind) window.Blind.stop();

        document.getElementById('dev-panel').classList.add('hidden');
        document.getElementById('color-dev-panel').classList.add('hidden');
        document.getElementById('vector-dev-panel').classList.add('hidden');

        screenExercise.style.display = 'none';
        screenColorExercise.style.display = 'none';
        screenVectorExercise.style.display = 'none';
        screenPressureExercise.style.display = 'none';
        screenTemperatureExercise.style.display = 'none';
        screenBlindExercise.style.display = 'none';
        screenTonalExercise.style.display = 'none';
        screenLightDragExercise.style.display = 'none';
        screenMenu.classList.remove('hidden');
    }

    const pressedKeys = new Set();
    let devToggleArmed = true;

    window.addEventListener('keydown', e => {
        if (e.repeat) return;
        pressedKeys.add(e.code);
        const lineOpen = screenExercise.style.display === 'flex';
        const colorOpen = screenColorExercise.style.display === 'flex';
        const vectorOpen = screenVectorExercise.style.display === 'flex';
        if ((lineOpen || colorOpen || vectorOpen) && pressedKeys.has('KeyD') && pressedKeys.has('KeyV') && devToggleArmed) {
            devToggleArmed = false;
            if (lineOpen) window.Line.toggleDevPanel();
            else if (colorOpen) window.Color.toggleColorDevPanel();
            else if (vectorOpen) window.Vector.toggleVectorDevPanel();
        }
    });

    window.addEventListener('keyup', e => {
        pressedKeys.delete(e.code);
        if (!pressedKeys.has('KeyD') || !pressedKeys.has('KeyV')) devToggleArmed = true;
    });

    window.addEventListener('resize', () => {
        if (screenExercise.style.display === 'flex') window.Line.resizeCanvas();
        if (screenVectorExercise.style.display === 'flex') window.Vector.resizeVectorCanvas();
        if (screenPressureExercise.style.display === 'flex') window.Pressure.resizeCanvas();
    });
    window.addEventListener('orientationchange', () => setTimeout(() => {
        if (screenExercise.style.display === 'flex') window.Line.resizeCanvas();
        if (screenVectorExercise.style.display === 'flex') window.Vector.resizeVectorCanvas();
        if (screenPressureExercise.style.display === 'flex') window.Pressure.resizeCanvas();
    }, 200));

    /* ============================================================
       Плавная прокрутка меню колесиком мыши
       ============================================================ */
    let snapTimeout;
    screenMenu.addEventListener('wheel', (e) => {
        if (screenMenu.classList.contains('hidden') || screenMenu.style.display === 'none') return;
        const menuNav = document.querySelector('#screen-menu .menu');
        if (!menuNav) return;
        if (menuNav.scrollWidth <= menuNav.clientWidth) return;
        e.preventDefault();
        menuNav.style.scrollSnapType = 'none';
        menuNav.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' });
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => { menuNav.style.scrollSnapType = ''; }, 200);
    }, { passive: false });

            /* ============================================================
       Закладки (Закрепленные разделы)
       ============================================================ */
    const PIN_KEY = 'artist_helper_pinned_sections_v1';
    let pinnedSections = [];
    try {
        pinnedSections = JSON.parse(localStorage.getItem(PIN_KEY)) || [];
    } catch (e) {
        pinnedSections = [];
    }

    const menuContainer = document.querySelector('#screen-menu .menu');
    const cardElements = Array.from(menuContainer.querySelectorAll('a'));

    // Запоминаем изначальный порядок карточек
    const originalOrder = cardElements.map(card => {
        const match = card.getAttribute('onclick').match(/'([^']+)'/);
        return match ? match[1] : null;
    }).filter(Boolean);

    // Внедряем иконку-звездочку в каждую карточку
    cardElements.forEach(card => {
        const match = card.getAttribute('onclick').match(/'([^']+)'/);
        if (!match) return;
        const id = match[1];

        const pinBtn = document.createElement('div');
        pinBtn.className = 'card-pin';
        pinBtn.title = "Закрепить";
        pinBtn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 L15 9 L22 9 L16.5 13.5 L18.5 21 L12 16.5 L5.5 21 L7.5 13.5 L2 9 L9 9 Z" /></svg>`;
        
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePin(id);
        });
        
        card.appendChild(pinBtn);
    });

    function togglePin(id) {
        if (pinnedSections.includes(id)) {
            pinnedSections = pinnedSections.filter(p => p !== id);
        } else {
            pinnedSections.unshift(id);
        }
        localStorage.setItem(PIN_KEY, JSON.stringify(pinnedSections));
        applyReorder(true); // Передаем true, чтобы включить анимацию
    }

    function applyReorder(animate = false) {
        // 1. FIRST: Запоминаем текущие позиции всех карточек перед перестановкой
        const positions = new Map();
        if (animate) {
            cardElements.forEach(card => {
                positions.set(card, card.getBoundingClientRect());
            });
            // Отключаем "прилипание", чтобы оно не мешало анимации
            menuContainer.style.scrollSnapType = 'none';
        }

        // 2. Сортируем карточки
        const sortedCards = [...cardElements].sort((a, b) => {
            const idA = a.getAttribute('onclick').match(/'([^']+)'/)[1];
            const idB = b.getAttribute('onclick').match(/'([^']+)'/)[1];
            const idxA = pinnedSections.indexOf(idA);
            const idxB = pinnedSections.indexOf(idB);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return originalOrder.indexOf(idA) - originalOrder.indexOf(idB);
        });

        // Обновляем визуальное состояние и переставляем DOM-элементы
        sortedCards.forEach(card => {
            const id = card.getAttribute('onclick').match(/'([^']+)'/)[1];
            const pinBtn = card.querySelector('.card-pin');
            
            if (pinnedSections.includes(id)) {
                card.classList.add('is-pinned');
                pinBtn.classList.add('active');
                pinBtn.title = "Открепить";
            } else {
                card.classList.remove('is-pinned');
                pinBtn.classList.remove('active');
                pinBtn.title = "Закрепить";
            }
            menuContainer.appendChild(card); // Перемещает в конец, но т.к. мы идем по порядку, всё встанет правильно
        });

        // 3. LAST, INVERT, PLAY: Анимируем перемещение
        if (animate) {
            sortedCards.forEach(card => {
                const firstRect = positions.get(card);
                const lastRect = card.getBoundingClientRect();
                
                // Вычисляем, насколько карточка сдвинулась
                const deltaX = firstRect.left - lastRect.left;
                const deltaY = firstRect.top - lastRect.top;

                if (deltaX !== 0 || deltaY !== 0) {
                    // INVERT: Визуально возвращаем на старое место
                    card.style.transition = 'none';
                    card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                    // PLAY: На следующем кадре плавно отпускаем на новое место
                    requestAnimationFrame(() => {
                        card.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
                        card.style.transform = '';
                    });
                }
            });

            // Возвращаем scroll-snap обратно через 400мс (после завершения анимации)
            setTimeout(() => {
                menuContainer.style.scrollSnapType = '';
                // Убираем inline-стили transition и transform, чтобы не мешали в будущем
                sortedCards.forEach(card => {
                    card.style.transition = '';
                    card.style.transform = '';
                });
            }, 450);
        }
    }

    // Применяем сохраненный порядок при загрузке страницы (без анимации) и сбрасываем скролл
    applyReorder(false);
    setTimeout(() => {
        menuContainer.scrollLeft = 0; // Принудительно скроллим в самое начало
        // Синхронизируем переменную из вашей логики скролла колесиком (если она есть)
        if (typeof targetScroll !== 'undefined') targetScroll = 0;
    }, 50);

    return { startExercise, backToMenu };

    

    
})();