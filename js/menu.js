window.App = (function () {
    'use strict';

    const screenMenu = document.getElementById('screen-menu');
    const screenExercise = document.getElementById('screen-exercise');
    const screenColorExercise = document.getElementById('screen-color');
    const screenVectorExercise = document.getElementById('screen-vector');
    const screenPressureExercise = document.getElementById('screen-pressure');
    const screenTemperatureExercise = document.getElementById('screen-temperature');
    const screenBlindExercise = document.getElementById('screen-blind');

    /* Список разделов — легко расширять. */
    const sections = {
        line: { el: screenExercise, mod: () => window.Line },
        color: { el: screenColorExercise, mod: () => window.Color },
        vector: { el: screenVectorExercise, mod: () => window.Vector },
        pressure: { el: screenPressureExercise, mod: () => window.Pressure },
        temperature: { el: screenTemperatureExercise, mod: () => window.Temperature },
        blind: { el: screenBlindExercise, mod: () => window.Blind }
    };

    function startExercise(type) {
        const section = sections[type];
        if (!section) return;

        /* Скрыть все экраны. */
        screenExercise.style.display = 'none';
        screenColorExercise.style.display = 'none';
        screenVectorExercise.style.display = 'none';
        screenPressureExercise.style.display = 'none';
        screenTemperatureExercise.style.display = 'none';
        screenBlindExercise.style.display = 'none';
        screenMenu.classList.add('hidden');

        /* Показать нужный. */
        section.el.style.display = 'flex';
        section.mod().enter();
    }

    function backToMenu() {
        /* Останавливаем игры, если они были активны. */
        if (screenPressureExercise.style.display === 'flex' && window.Pressure) {
            window.Pressure.stop();
        }
        if (screenTemperatureExercise.style.display === 'flex' && window.Temperature) {
            window.Temperature.stop();
        }
        if (screenBlindExercise.style.display === 'flex' && window.Blind) {
            window.Blind.stop();
        }

        document.getElementById('dev-panel').classList.add('hidden');
        document.getElementById('color-dev-panel').classList.add('hidden');
        document.getElementById('vector-dev-panel').classList.add('hidden');

        screenExercise.style.display = 'none';
        screenColorExercise.style.display = 'none';
        screenVectorExercise.style.display = 'none';
        screenPressureExercise.style.display = 'none';
        screenTemperatureExercise.style.display = 'none';
        screenBlindExercise.style.display = 'none';
        screenMenu.classList.remove('hidden');
    }

    /* D + V — открыть/закрыть dev-панель активного раздела. */
    const pressedKeys = new Set();
    let devToggleArmed = true;

    window.addEventListener('keydown', e => {
        if (e.repeat) return;
        pressedKeys.add(e.code);

        const lineOpen = screenExercise.style.display === 'flex';
        const colorOpen = screenColorExercise.style.display === 'flex';
        const vectorOpen = screenVectorExercise.style.display === 'flex';

        if ((lineOpen || colorOpen || vectorOpen) &&
            pressedKeys.has('KeyD') && pressedKeys.has('KeyV') && devToggleArmed) {
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

    /* Пересчёт размеров холстов при ресайзе/повороте. */
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
       Прокрутка меню колесиком мыши (вертикальное -> горизонтальное)
       Работает в любом месте экрана меню
       ============================================================ */
    let snapTimeout;

    screenMenu.addEventListener('wheel', (e) => {
        // Если меню сейчас скрыто (пользователь внутри раздела), ничего не делаем
        if (screenMenu.classList.contains('hidden') || screenMenu.style.display === 'none') return;

        const menuNav = document.querySelector('#screen-menu .menu');
        if (!menuNav) return;

        // Если карточки помещаются на экране, не перехватываем колесико
        if (menuNav.scrollWidth <= menuNav.clientWidth) return;

        // Останавливаем вертикальную прокрутку страницы
        e.preventDefault();

        // Временно отключаем "прилипание" (scroll-snap), чтобы прокрутка была мягкой
        menuNav.style.scrollSnapType = 'none';

        // Прокручиваем горизонтально
        menuNav.scrollBy({
            left: e.deltaY * 2,
            behavior: 'smooth'
        });

        // Возвращаем прилипание через 200 мс после остановки колеса
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => {
            menuNav.style.scrollSnapType = '';
        }, 200);
    }, { passive: false });
    return {
        startExercise,
        backToMenu
    };
})();