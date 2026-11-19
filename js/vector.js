window.Vector = (function () {
    'use strict';

    const VECTOR_MAX_LEVEL = 3;
    const VECTOR_FIGURES_PER_LEVEL = 10;
    const VECTOR_PROGRESS_KEY = 'artist_helper_vector_progress_v1';

    const vectorCanvas = document.getElementById('vectorCanvas');
    const vectorCtx = vectorCanvas.getContext('2d');
    const vectorCanvasContainer = document.getElementById('vector-canvas-container');
    const vectorFigNumEl = document.getElementById('vector-fig-num');
    const vectorFigTotalEl = document.getElementById('vector-fig-total');
    const vectorLevelDisplay = document.getElementById('vector-level-display');
    const vectorMatchFill = document.getElementById('vector-match-fill');
    const vectorMatchPercent = document.getElementById('vector-match-percent');
    const vectorModalStart = document.getElementById('vector-modal-start');
    const vectorModalWin = document.getElementById('vector-modal-win');
    const vectorBtnResume = document.getElementById('vector-btn-resume');
    const vectorBtnNextLevel = document.getElementById('vector-btn-next-level');
    const vectorWinTitle = document.getElementById('vector-win-title');
    const vectorWinDesc = document.getElementById('vector-win-desc');
    const vectorDevPanel = document.getElementById('vector-dev-panel');
    const vectorDevContent = document.getElementById('vector-dev-content');

    function makeVectorFigure(cfg) {
        return {
            name: cfg.name || '',
            closed: cfg.closed !== false,
            scale: cfg.scale != null ? +cfg.scale : 1.0,
            anchors: (cfg.anchors || []).map(a => ({
                x: +a.x,
                y: +a.y,
                type: a.type || 'corner',
                cp: !!a.cp,
                inDx: +(a.inDx || 0),
                inDy: +(a.inDy || 0),
                outDx: +(a.outDx || 0),
                outDy: +(a.outDy || 0)
            }))
        };
    }

    function createVectorPlaceholder(index) {
        return makeVectorFigure({
            name: 'Заготовка ' + (index + 1),
            closed: true,
            anchors: [
                { x: 150, y: 70, type: 'symmetric', outDx: 35, outDy: 25, inDx: -35, inDy: -25, cp: true },
                { x: 245, y: 240, type: 'symmetric', outDx: -35, outDy: 15, inDx: 35, inDy: -15 },
                { x: 55, y: 240, type: 'symmetric', outDx: 15, outDy: -35, inDx: -15, inDy: 35 }
            ]
        });
    }

    const VECTOR_LEVELS = {
        1: [
            makeVectorFigure({
                name: 'Изгиб вниз',
                closed: false,
                anchors: [
                    { x: 45, y: 150, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 55, outDy: 25 },
                    { x: 260, y: 150, type: 'corner', cp: false, inDx: -60, inDy: 25, outDx: 0, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Векторный лук',
                closed: false,
                anchors: [
                    { x: 25, y: 260, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 120, outDy: 5 },
                    { x: 250, y: 45, type: 'corner', cp: false, inDx: -5, inDy: 125, outDx: 0, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Изгиб вверх',
                closed: false,
                anchors: [
                    { x: 55, y: 180, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: -60 },
                    { x: 255, y: 180, type: 'corner', cp: false, inDx: 0, inDy: -60, outDx: 0, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Холм',
                closed: false,
                anchors: [
                    { x: 15, y: 40, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 285, outDy: 35 },
                    { x: 15, y: 235, type: 'corner', cp: false, inDx: 285, inDy: -35, outDx: 0, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Волна',
                closed: false,
                anchors: [
                    { x: 25, y: 140, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 75, outDy: -115 },
                    { x: 260, y: 140, type: 'corner', cp: false, inDx: -60, inDy: 120, outDx: 0, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Лист',
                closed: true,
                anchors: [
                    { x: 60, y: 65, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 225, y: 90, type: 'symmetric', cp: false, inDx: -45, inDy: -45, outDx: 45, outDy: 45 },
                    { x: 245, y: 250, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 75, y: 225, type: 'symmetric', cp: false, inDx: 40, inDy: 45, outDx: -40, outDy: -45 }
                ]
            }),
            makeVectorFigure({
                name: 'Арка',
                closed: true,
                anchors: [
                    { x: 90, y: 205, type: 'corner', cp: false, inDx: 0, inDy: -25, outDx: -20, outDy: 0 },
                    { x: 30, y: 205, type: 'corner', cp: false, inDx: 20, inDy: 0, outDx: 0, outDy: -35 },
                    { x: 155, y: 85, type: 'symmetric', cp: false, inDx: -90, inDy: 0, outDx: 90, outDy: 0 },
                    { x: 275, y: 205, type: 'corner', cp: false, inDx: 0, inDy: -40, outDx: -20, outDy: 0 },
                    { x: 215, y: 205, type: 'corner', cp: false, inDx: 20, inDy: 0, outDx: 0, outDy: -20 },
                    { x: 155, y: 145, type: 'symmetric', cp: false, inDx: 45, inDy: 0, outDx: -45, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Яйцо',
                closed: true,
                anchors: [
                    { x: 70, y: 175, type: 'symmetric', cp: false, inDx: 0, inDy: 50, outDx: 0, outDy: -50 },
                    { x: 155, y: 25, type: 'symmetric', cp: false, inDx: -55, inDy: 0, outDx: 55, outDy: 0 },
                    { x: 245, y: 175, type: 'symmetric', cp: false, inDx: 0, inDy: -50, outDx: 0, outDy: 50 },
                    { x: 155, y: 265, type: 'symmetric', cp: false, inDx: 45, inDy: 0, outDx: -45, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Лепесток',
                closed: true,
                anchors: [
                    { x: 150, y: 230, type: 'corner', cp: false, inDx: 0, inDy: 15, outDx: 0, outDy: 15 },
                    { x: 50, y: 225, type: 'symmetric', cp: false, inDx: 30, inDy: 55, outDx: -30, outDy: -55 },
                    { x: 100, y: 140, type: 'corner', cp: false, inDx: -15, inDy: -5, outDx: -15, outDy: -5 },
                    { x: 150, y: 55, type: 'symmetric', cp: false, inDx: -75, inDy: 0, outDx: 75, outDy: 0 },
                    { x: 195, y: 140, type: 'corner', cp: false, inDx: 15, inDy: -5, outDx: 15, outDy: -5 },
                    { x: 245, y: 225, type: 'symmetric', cp: false, inDx: 30, inDy: -60, outDx: -30, outDy: 60 }
                ]
            }),
            makeVectorFigure({
                name: 'Гладкий камень',
                closed: true,
                anchors: [
                    { x: 90, y: 250, type: 'smooth', cp: false, inDx: 20.8, inDy: 8.3, outDx: -75, outDy: -30 },
                    { x: 155, y: 65, type: 'symmetric', cp: false, inDx: -70, inDy: 0, outDx: 70, outDy: 0 },
                    { x: 225, y: 250, type: 'smooth', cp: false, inDx: 62.3, inDy: -31.1, outDx: -20, outDy: 10 }
                ]
            })
        ],
        2: [


            makeVectorFigure({
                name: 'Перчатка',
                closed: true,
                scale: .8,
                anchors: [
                    { x: 90, y: 280, type: 'corner', cp: false, inDx: 28.3, inDy: 0, outDx: -30, outDy: -10 },
                    { x: 80, y: 220, type: 'corner', cp: false, inDx: -5, inDy: 15, outDx: -45, outDy: -85 },
                    { x: 140, y: 15, type: 'symmetric', cp: false, inDx: -95, inDy: 0, outDx: 95, outDy: 0 },
                    { x: 200, y: 150, type: 'corner', cp: false, inDx: 0, inDy: -15, outDx: 15, outDy: -60 },
                    { x: 255, y: 115, type: 'smooth', cp: false, inDx: -5.9, inDy: -9.5, outDx: 25, outDy: 40 },
                    { x: 215, y: 235, type: 'smooth', cp: false, inDx: -5, inDy: -25, outDx: 7.5, outDy: 37.3 },
                    { x: 200, y: 280, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 }
                ]
            }),

            makeVectorFigure({
                name: 'Плавник',
                closed: true,
                scale: 1.5,
                anchors: [
                    { x: 20, y: 200, type: 'corner', cp: false, inDx: 30, inDy: 10, outDx: 65, outDy: -20 },
                    { x: 170, y: 90, type: 'smooth', cp: false, inDx: -85, inDy: 0, outDx: 75, outDy: 0 },
                    { x: 210, y: 160, type: 'corner', cp: false, inDx: 35, inDy: -5, outDx: 5, outDy: -45 },
                    { x: 165, y: 165, type: 'symmetric', cp: false, inDx: -5, inDy: -40, outDx: 5, outDy: 40 },
                    { x: 285, y: 180, type: 'corner', cp: false, inDx: -45, inDy: 15, outDx: -45, outDy: 50 },
                    { x: 115, y: 195, type: 'corner', cp: false, inDx: 55, inDy: 5, outDx: -30, outDy: -5 }
                ]
            }),
            makeVectorFigure({
                name: 'Лепесток',
                closed: true,
                scale: .8,
                anchors: [
                    { x: 85, y: 295, type: 'symmetric', cp: false, inDx: 20, inDy: 0, outDx: -20, outDy: 0 },
                    { x: 80, y: 230, type: 'corner', cp: false, inDx: -5, inDy: 25, outDx: -75, outDy: -130 },
                    { x: 190, y: 5, type: 'corner', cp: false, inDx: -20, inDy: 90, outDx: 50, outDy: 60 },
                    { x: 230, y: 140, type: 'smooth', cp: false, inDx: 2.1, inDy: -29.9, outDx: -5, outDy: 70 },
                    { x: 115, y: 245, type: 'corner', cp: false, inDx: 60, inDy: 0, outDx: -10, outDy: -60 },
                    { x: 190, y: 75, type: 'corner', cp: false, inDx: 15, inDy: 50, outDx: -15, outDy: 65 },
                    { x: 95, y: 230, type: 'corner', cp: false, inDx: 0, inDy: -65, outDx: -3.3, outDy: 21.7 }
                ]
            }),

            makeVectorFigure({
                name: 'Бантик',
                closed: true,
                scale: .9,
                anchors: [
                    { x: 95, y: 160, type: 'corner', cp: false, inDx: -75, inDy: 115, outDx: -30, outDy: 10 },
                    { x: 25, y: 100, type: 'symmetric', cp: false, inDx: 0, inDy: 95, outDx: 0, outDy: -95 },
                    { x: 125, y: 90, type: 'corner', cp: false, inDx: -25, inDy: -45, outDx: 15, outDy: -10 },
                    { x: 165, y: 90, type: 'corner', cp: false, inDx: -10, inDy: -5, outDx: 40, outDy: -50 },
                    { x: 265, y: 100, type: 'symmetric', cp: false, inDx: 0, inDy: -95, outDx: 0, outDy: 95 },
                    { x: 205, y: 160, type: 'corner', cp: false, inDx: 10, inDy: 5, outDx: 75, outDy: 115 },
                    { x: 210, y: 235, type: 'symmetric', cp: false, inDx: 20, inDy: -10, outDx: -20, outDy: 10 },
                    { x: 150, y: 150, type: 'corner', cp: false, inDx: 20, inDy: 145, outDx: -20, outDy: 145 },
                    { x: 90, y: 235, type: 'symmetric', cp: false, inDx: 20, inDy: 10, outDx: -20, outDy: -10 }
                ]
            }),

            makeVectorFigure({
                name: 'Летучая мышь',
                closed: true,
                scale: 2,
                anchors: [
                    { x: 85, y: 90, type: 'corner', cp: false, inDx: 15, inDy: 20, outDx: -45, outDy: 20 },
                    { x: 25, y: 165, type: 'corner', cp: false, inDx: 5, inDy: -25, outDx: 55, outDy: -20 },
                    { x: 85, y: 195, type: 'corner', cp: false, inDx: -5, inDy: -10, outDx: 40, outDy: -35 },
                    { x: 155, y: 225, type: 'corner', cp: false, inDx: -10, inDy: -10, outDx: 20, outDy: -40 },
                    { x: 225, y: 195, type: 'corner', cp: false, inDx: -25, inDy: -20, outDx: 5, outDy: -40 },
                    { x: 280, y: 165, type: 'corner', cp: false, inDx: -20, inDy: -10, outDx: 0, outDy: -50 },
                    { x: 220, y: 90, type: 'corner', cp: false, inDx: 20, inDy: 5, outDx: -15, outDy: 20 },
                    { x: 180, y: 135, type: 'corner', cp: false, inDx: 20, inDy: -15, outDx: 5, outDy: -15 },
                    { x: 175, y: 100, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 160, y: 115, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 150, y: 115, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 135, y: 100, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 130, y: 135, type: 'corner', cp: false, inDx: -5, inDy: -15, outDx: -20, outDy: -5 }
                ]
            }),

            makeVectorFigure({
                name: 'Кит',
                closed: true,
                scale: .9,
                anchors: [
                    { x: 200, y: 130, type: 'corner', cp: false, inDx: 0, inDy: 15, outDx: 15, outDy: -5 },
                    { x: 240, y: 145, type: 'corner', cp: false, inDx: -10, inDy: -15, outDx: 20, outDy: -10 },
                    { x: 285, y: 140, type: 'corner', cp: false, inDx: -15, inDy: -5, outDx: -5, outDy: 25 },
                    { x: 250, y: 165, type: 'corner', cp: false, inDx: 10, inDy: -5, outDx: -10, outDy: 55 },
                    { x: 190, y: 250, type: 'corner', cp: false, inDx: 25, inDy: -15, outDx: 35, outDy: 30 },
                    { x: 165, y: 255, type: 'corner', cp: false, inDx: 10, inDy: 10, outDx: -135, outDy: 30 },
                    { x: 50, y: 110, type: 'smooth', cp: false, inDx: -63.8, inDy: 49.3, outDx: 110, outDy: -85 },
                    { x: 230, y: 165, type: 'corner', cp: false, inDx: -60, inDy: 45, outDx: -10, outDy: -11.7 }
                ]
            }),
            makeVectorFigure({
                name: 'Слоник',
                closed: true,
                anchors: [
                    { x: 80, y: 250, type: 'corner', cp: false, inDx: -20, inDy: -65, outDx: -18.3, outDy: 0 },
                    { x: 25, y: 250, type: 'corner', cp: false, inDx: 18.3, inDy: 0, outDx: -15, outDy: -170 },
                    { x: 110, y: 75, type: 'corner', cp: false, inDx: -40, inDy: 0, outDx: -55, outDy: 65 },
                    { x: 140, y: 175, type: 'corner', cp: false, inDx: -30, inDy: -5, outDx: 0, outDy: -30 },
                    { x: 140, y: 75, type: 'corner', cp: false, inDx: 0, inDy: 33.3, outDx: 30, outDy: -50 },
                    { x: 245, y: 110, type: 'corner', cp: false, inDx: 0, inDy: -35, outDx: 0, outDy: 28.3 },
                    { x: 245, y: 195, type: 'corner', cp: false, inDx: 0, inDy: -28.3, outDx: -5, outDy: 20 },
                    { x: 260, y: 185, type: 'corner', cp: false, inDx: 15, inDy: 15, outDx: 0, outDy: -25 },
                    { x: 290, y: 185, type: 'smooth', cp: false, inDx: -3.9, inDy: -19.6, outDx: 10, outDy: 50 },
                    { x: 215, y: 190, type: 'smooth', cp: false, inDx: 0, inDy: 75, outDx: 0, outDy: -20 },
                    { x: 195, y: 190, type: 'corner', cp: false, inDx: -5, inDy: -10, outDx: 0, outDy: 20 },
                    { x: 195, y: 250, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 135, y: 250, type: 'corner', cp: false, inDx: 20, inDy: 0, outDx: 20, outDy: -75 }
                ]
            }),
            makeVectorFigure({
                name: 'Рыба',
                closed: true,
                scale: .9,
                anchors: [
                    { x: 205, y: 120, type: 'corner', cp: false, inDx: -40, inDy: -85, outDx: 70, outDy: -70 },
                    { x: 245, y: 135, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 30, outDy: 90 },
                    { x: 210, y: 165, type: 'corner', cp: false, inDx: 10, inDy: 5, outDx: -15, outDy: 35 },
                    { x: 225, y: 250, type: 'symmetric', cp: false, inDx: -30, inDy: -50, outDx: 30, outDy: 50 },
                    { x: 70, y: 205, type: 'corner', cp: false, inDx: 11.7, inDy: 6.7, outDx: -70, outDy: -35 },
                    { x: 50, y: 135, type: 'smooth', cp: false, inDx: -20.6, inDy: 12.8, outDx: 40, outDy: -25 },
                    { x: 205, y: 15, type: 'corner', cp: false, inDx: -130, inDy: 45, outDx: 70, outDy: -15 }
                ]
            }),
            makeVectorFigure({
                name: 'Котик',
                closed: true,
                scale: .85,
                anchors: [
                    { x: 60, y: 245, type: 'corner', cp: false, inDx: -10, inDy: 30, outDx: -20, outDy: -70 },
                    { x: 140, y: 150, type: 'corner', cp: false, inDx: -20, inDy: 35, outDx: -25, outDy: 0 },
                    { x: 85, y: 115, type: 'corner', cp: false, inDx: 18.3, inDy: 11.7, outDx: 20, outDy: -5 },
                    { x: 110, y: 90, type: 'corner', cp: false, inDx: -8.3, inDy: 8.3, outDx: -20, outDy: -25 },
                    { x: 135, y: 45, type: 'smooth', cp: false, inDx: -80, inDy: -40, outDx: 10, outDy: 5 },
                    { x: 190, y: 35, type: 'corner', cp: false, inDx: -18.3, inDy: 3.3, outDx: 30, outDy: -35 },
                    { x: 220, y: 70, type: 'smooth', cp: false, inDx: 10, inDy: -70, outDx: -1.8, outDy: 12.9 },
                    { x: 245, y: 100, type: 'corner', cp: false, inDx: -15, inDy: -5, outDx: -5, outDy: 30 },
                    { x: 195, y: 160, type: 'corner', cp: false, inDx: 16.7, inDy: -20, outDx: 5, outDy: 35 },
                    { x: 190, y: 255, type: 'smooth', cp: false, inDx: -16.2, inDy: -21.5, outDx: 30, outDy: 40 },
                    { x: 140, y: 285, type: 'smooth', cp: false, inDx: 45, inDy: 0, outDx: -81.4, outDy: 0 }
                ]
            }),
            makeVectorFigure({
                name: 'Мозайка',
                closed: true,
                anchors: [
                    { x: 135, y: 275, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 115, y: 200, type: 'corner', cp: false, inDx: 6.7, inDy: 23.3, outDx: -5, outDy: -20 },
                    { x: 65, y: 185, type: 'symmetric', cp: false, inDx: 10, inDy: 50, outDx: -10, outDy: -50 },
                    { x: 105, y: 150, type: 'corner', cp: false, inDx: 5, inDy: 40, outDx: -3.3, outDy: -10 },
                    { x: 95, y: 115, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 150, y: 105, type: 'corner', cp: false, inDx: -18.3, inDy: 3.3, outDx: 25, outDy: -15 },
                    { x: 160, y: 50, type: 'symmetric', cp: false, inDx: -55, inDy: 10, outDx: 55, outDy: -10 },
                    { x: 200, y: 95, type: 'corner', cp: false, inDx: -35, inDy: 0, outDx: 11.7, outDy: -1.7 },
                    { x: 235, y: 90, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 240, y: 115, type: 'smooth', cp: false, inDx: -1.8, inDy: -8.3, outDx: 10, outDy: 45 },
                    { x: 205, y: 160, type: 'symmetric', cp: false, inDx: -15, inDy: -50, outDx: 15, outDy: 50 },
                    { x: 255, y: 185, type: 'smooth', cp: false, inDx: -10, inDy: -40, outDx: 5, outDy: 20 },
                    { x: 270, y: 245, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 215, y: 255, type: 'smooth', cp: false, inDx: 20.2, inDy: -4, outDx: -25, outDy: 5 },
                    { x: 180, y: 215, type: 'symmetric', cp: false, inDx: 50, inDy: -15, outDx: -50, outDy: 15 },
                    { x: 170, y: 265, type: 'smooth', cp: false, inDx: 30, inDy: -5, outDx: -12, outDy: 2 }
                ]
            })

        ],
        3: [
            makeVectorFigure({
                name: 'Маска',
                closed: true,
                anchors: [
                    { x: 135, y: 235, type: 'corner', cp: false, inDx: 10, inDy: 15, outDx: -75, outDy: 35 },
                    { x: 30, y: 205, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 40, y: 205, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 25, y: 190, type: 'corner', cp: false, inDx: 5, inDy: 5, outDx: 20, outDy: -5 },
                    { x: 45, y: 170, type: 'smooth', cp: false, inDx: 2.6, inDy: 9.1, outDx: -20, outDy: -70 },
                    { x: 45, y: 50, type: 'corner', cp: false, inDx: -10, inDy: 35, outDx: 35, outDy: 15 },
                    { x: 115, y: 105, type: 'corner', cp: false, inDx: -23.3, inDy: -18.3, outDx: 20, outDy: -10 },
                    { x: 185, y: 105, type: 'corner', cp: false, inDx: -15, inDy: -10, outDx: 20, outDy: -30 },
                    { x: 255, y: 50, type: 'corner', cp: false, inDx: -25, inDy: 15, outDx: 20, outDy: 60 },
                    { x: 250, y: 165, type: 'smooth', cp: false, inDx: 10, inDy: -25, outDx: -3.7, outDy: 9.3 },
                    { x: 270, y: 190, type: 'corner', cp: false, inDx: -10, inDy: -5, outDx: 0, outDy: 5 },
                    { x: 260, y: 205, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 270, y: 205, type: 'corner', cp: false, inDx: -3.3, inDy: 0, outDx: -35, outDy: 65 },
                    { x: 165, y: 235, type: 'corner', cp: false, inDx: 20, inDy: 5, outDx: -10, outDy: 15 }
                ]
            }),

            makeVectorFigure({
                name: 'Огонь',
                closed: true,
                anchors: [
                    { x: 145, y: 280, type: 'corner', cp: false, inDx: -55, inDy: -35, outDx: -115, outDy: -30 },
                    { x: 90, y: 120, type: 'corner', cp: false, inDx: 15, inDy: 55, outDx: 20, outDy: 10 },
                    { x: 115, y: 180, type: 'smooth', cp: false, inDx: -14.8, inDy: -2.1, outDx: 35, outDy: 5 },
                    { x: 160, y: 10, type: 'corner', cp: false, inDx: -90, inDy: 50, outDx: -35, outDy: 80 },
                    { x: 165, y: 280, type: 'corner', cp: false, inDx: 135, inDy: -45, outDx: 30, outDy: -25 },
                    { x: 185, y: 225, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 175, y: 235, type: 'corner', cp: false, inDx: 3.3, inDy: -3.3, outDx: 5, outDy: -45 },
                    { x: 145, y: 165, type: 'corner', cp: false, inDx: 15, inDy: 15, outDx: 10, outDy: 40 },
                    { x: 140, y: 230, type: 'symmetric', cp: false, inDx: 15, inDy: 0, outDx: -15, outDy: 0 },
                    { x: 130, y: 200, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 }
                ]
            }),

            makeVectorFigure({
                name: 'Утка',
                closed: true,
                scale: 1.2,
                anchors: [
                    { x: 255, y: 135, type: 'smooth', cp: false, inDx: -1, inDy: -20.1, outDx: 5, outDy: 105 },
                    { x: 160, y: 240, type: 'symmetric', cp: false, inDx: 20, inDy: 0, outDx: -20, outDy: 0 },
                    { x: 65, y: 195, type: 'smooth', cp: false, inDx: 0, inDy: 30, outDx: 0, outDy: -30 },
                    { x: 70, y: 135, type: 'smooth', cp: false, inDx: 45, inDy: -5, outDx: -14.1, outDy: 1.6 },
                    { x: 60, y: 125, type: 'corner', cp: false, inDx: -20, inDy: 10, outDx: -45, outDy: -15 },
                    { x: 70, y: 105, type: 'smooth', cp: false, inDx: -0.4, inDy: 5, outDx: 5, outDy: -70 },
                    { x: 155, y: 85, type: 'smooth', cp: false, inDx: -10, inDy: -20, outDx: 15, outDy: 30 },
                    { x: 135, y: 145, type: 'smooth', cp: false, inDx: -5, inDy: -10, outDx: 3.2, outDy: 6.3 },
                    { x: 220, y: 145, type: 'smooth', cp: false, inDx: -15, inDy: 5, outDx: 10.6, outDy: -3.5 }
                ]
            }),



            makeVectorFigure({
                name: 'Лисичка',
                closed: true,
                anchors: [
                    { x: 155, y: 10, type: 'corner', cp: false, inDx: -10, inDy: 5, outDx: 0, outDy: 20 },
                    { x: 160, y: 45, type: 'corner', cp: false, inDx: 0, inDy: -10, outDx: 5, outDy: -20 },
                    { x: 200, y: 15, type: 'corner', cp: false, inDx: -10, inDy: 0, outDx: -15, outDy: 25 },
                    { x: 185, y: 60, type: 'corner', cp: false, inDx: 5, inDy: -15, outDx: 25, outDy: 25 },
                    { x: 220, y: 105, type: 'corner', cp: false, inDx: -40, inDy: -20, outDx: -15, outDy: 20 },
                    { x: 185, y: 115, type: 'corner', cp: false, inDx: 10, inDy: 0, outDx: -65, outDy: 5 },
                    { x: 235, y: 205, type: 'smooth', cp: false, inDx: 6.9, inDy: -55.5, outDx: -10, outDy: 80 },
                    { x: 95, y: 285, type: 'corner', cp: false, inDx: 10, inDy: -40, outDx: -15, outDy: -95 },
                    { x: 220, y: 180, type: 'corner', cp: false, inDx: -35, inDy: -20, outDx: -40, outDy: -35 },
                    { x: 115, y: 190, type: 'corner', cp: false, inDx: 35, inDy: -15, outDx: -60, outDy: -60 },
                    { x: 100, y: 85, type: 'corner', cp: false, inDx: -10, inDy: 15, outDx: -40, outDy: 5 },
                    { x: 115, y: 65, type: 'corner', cp: false, inDx: -15, inDy: 5, outDx: 10, outDy: -40 }
                ]
            }),

            makeVectorFigure({
                name: 'Лошадь',
                closed: true,
                anchors: [
                    { x: 180, y: 290, type: 'corner', cp: false, inDx: 95, inDy: -60, outDx: -10, outDy: -35 },
                    { x: 95, y: 215, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 120, y: 250, type: 'corner', cp: false, inDx: -8.3, inDy: -11.7, outDx: -90, outDy: -40 },
                    { x: 80, y: 90, type: 'corner', cp: false, inDx: -50, inDy: 45, outDx: -13.3, outDy: 8.3 },
                    { x: 40, y: 115, type: 'corner', cp: false, inDx: 13.3, inDy: -8.3, outDx: 35, outDy: -85 },
                    { x: 130, y: 40, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 115, y: 30, type: 'corner', cp: false, inDx: 5, inDy: 3.3, outDx: 35, outDy: -10 },
                    { x: 170, y: 35, type: 'corner', cp: false, inDx: -10, inDy: -5, outDx: 10, outDy: -10 },
                    { x: 200, y: 20, type: 'corner', cp: false, inDx: -10, inDy: 5, outDx: 0, outDy: 15 },
                    { x: 190, y: 40, type: 'corner', cp: false, inDx: 3.3, inDy: -6.7, outDx: 55, outDy: 40 },
                    { x: 255, y: 140, type: 'smooth', cp: false, inDx: -61.8, inDy: -82.5, outDx: 15, outDy: 20 },
                    { x: 215, y: 155, type: 'smooth', cp: false, inDx: 3.9, inDy: 9.2, outDx: -15, outDy: -35 },
                    { x: 150, y: 105, type: 'corner', cp: false, inDx: 25, inDy: 45, outDx: -35, outDy: 45 }
                ]
            }),
            makeVectorFigure({
                name: 'Птичка',
                closed: true,
                anchors: [
                    { x: 30, y: 220, type: 'corner', cp: false, inDx: 18.3, inDy: 0, outDx: 70, outDy: -15 },
                    { x: 130, y: 175, type: 'corner', cp: false, inDx: -20, inDy: 15, outDx: -25, outDy: -5 },
                    { x: 85, y: 150, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 110, y: 150, type: 'corner', cp: false, inDx: -8.3, inDy: 0, outDx: -45, outDy: -20 },
                    { x: 65, y: 105, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 95, y: 115, type: 'corner', cp: false, inDx: -10, inDy: -3.3, outDx: -35, outDy: -15 },
                    { x: 65, y: 65, type: 'corner', cp: false, inDx: -5, inDy: 10, outDx: 50, outDy: 40 },
                    { x: 190, y: 135, type: 'corner', cp: false, inDx: -10, inDy: -45, outDx: -1.7, outDy: -8.3 },
                    { x: 185, y: 110, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 225, y: 75, type: 'smooth', cp: false, inDx: -30, inDy: 0, outDx: 25, outDy: 0 },
                    { x: 255, y: 95, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 275, y: 110, type: 'corner', cp: false, inDx: -5, inDy: -10, outDx: -35, outDy: -10 },
                    { x: 215, y: 195, type: 'smooth', cp: false, inDx: 24.1, inDy: -21.1, outDx: -40, outDy: 35 },
                    { x: 125, y: 215, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 75, y: 250, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 100, y: 225, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 50, y: 235, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 85, y: 220, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 }
                ]
            }),

            makeVectorFigure({
                name: 'Любовь',
                closed: true,
                anchors: [
                    { x: 155, y: 275, type: 'corner', cp: false, inDx: 25, inDy: -40, outDx: -20, outDy: -45 },
                    { x: 20, y: 125, type: 'smooth', cp: false, inDx: 0, inDy: 105.1, outDx: 0, outDy: -50 },
                    { x: 60, y: 65, type: 'corner', cp: false, inDx: -5, inDy: 0, outDx: 5, outDy: -25 },
                    { x: 95, y: 25, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 95, y: 60, type: 'corner', cp: false, inDx: 0, inDy: -11.7, outDx: 50, outDy: 20 },
                    { x: 155, y: 125, type: 'corner', cp: false, inDx: -45, inDy: -30, outDx: -5, outDy: 25 },
                    { x: 120, y: 140, type: 'smooth', cp: false, inDx: 13.5, inDy: 0, outDx: -55, outDy: 0 },
                    { x: 110, y: 210, type: 'smooth', cp: false, inDx: -20, inDy: -15, outDx: 20, outDy: 15 },
                    { x: 155, y: 255, type: 'corner', cp: false, inDx: -15, inDy: -25, outDx: 5, outDy: -25 },
                    { x: 195, y: 210, type: 'smooth', cp: false, inDx: -10.6, inDy: 9.4, outDx: 45, outDy: -40 },
                    { x: 180, y: 145, type: 'smooth', cp: false, inDx: 35, inDy: -15, outDx: -8.9, outDy: 3.8 },
                    { x: 155, y: 130, type: 'corner', cp: false, inDx: 8.3, inDy: 5, outDx: 40, outDy: -25 },
                    { x: 215, y: 70, type: 'corner', cp: false, inDx: -60, inDy: 15, outDx: -25, outDy: -15 },
                    { x: 235, y: 35, type: 'smooth', cp: false, inDx: -5.9, inDy: -3.9, outDx: 15, outDy: 10 },
                    { x: 240, y: 70, type: 'corner', cp: false, inDx: 0, inDy: -5, outDx: 15, outDy: -20 },
                    { x: 275, y: 65, type: 'smooth', cp: false, inDx: 0, inDy: -10, outDx: 0, outDy: 18 },
                    { x: 265, y: 100, type: 'corner', cp: false, inDx: 5, inDy: -10, outDx: 10, outDy: 15 },
                    { x: 280, y: 150, type: 'smooth', cp: false, inDx: 0, inDy: -17.4, outDx: 0, outDy: 70 }
                ]
            }),
            makeVectorFigure({
                name: 'Собака',
                closed: true,
                anchors: [
                    { x: 90, y: 240, type: 'corner', cp: false, inDx: -15, inDy: -10, outDx: -10, outDy: -65 },
                    { x: 105, y: 180, type: 'corner', cp: false, inDx: -5, inDy: 5, outDx: 0, outDy: -40 },
                    { x: 125, y: 105, type: 'smooth', cp: false, inDx: -5, inDy: 35, outDx: 1.9, outDy: -13.3 },
                    { x: 130, y: 65, type: 'corner', cp: false, inDx: -1.7, inDy: 13.3, outDx: -10, outDy: 35 },
                    { x: 105, y: 100, type: 'smooth', cp: false, inDx: 8.9, inDy: 4.5, outDx: -10, outDy: -5 },
                    { x: 95, y: 55, type: 'smooth', cp: false, inDx: 0, inDy: 15, outDx: 0, outDy: -5 },
                    { x: 140, y: 35, type: 'corner', cp: false, inDx: 0, inDy: -20, outDx: 25, outDy: -15 },
                    { x: 190, y: 35, type: 'corner', cp: false, inDx: -5, inDy: -10, outDx: 15, outDy: -15 },
                    { x: 235, y: 50, type: 'smooth', cp: false, inDx: 0, inDy: 0, outDx: 10, outDy: 25 },
                    { x: 230, y: 100, type: 'smooth', cp: false, inDx: 5, inDy: 0, outDx: -20, outDy: 0 },
                    { x: 205, y: 65, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 205, y: 105, type: 'smooth', cp: false, inDx: -0.7, inDy: -4.9, outDx: 5, outDy: 35 },
                    { x: 225, y: 185, type: 'corner', cp: false, inDx: 0, inDy: -50, outDx: 45, outDy: 10 },
                    { x: 210, y: 265, type: 'smooth', cp: false, inDx: 30, inDy: -5, outDx: -39.8, outDy: 6.6 },
                    { x: 100, y: 270, type: 'smooth', cp: false, inDx: 30, inDy: 0, outDx: -25, outDy: 0 },
                    { x: 55, y: 240, type: 'corner', cp: false, inDx: -20, inDy: 0, outDx: -20, outDy: -25 },
                    { x: 50, y: 205, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 75, y: 175, type: 'corner', cp: false, inDx: -20, inDy: 0, outDx: -15, outDy: 30 }
                ]
            }),
            makeVectorFigure({
                name: 'Олень',
                closed: true,
                scale: .9,
                anchors: [
                    { x: 150, y: 285, type: 'symmetric', cp: false, inDx: 45, inDy: 0, outDx: -45, outDy: 0 },
                    { x: 105, y: 250, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 115, y: 210, type: 'corner', cp: false, inDx: 0, inDy: 15, outDx: 10, outDy: 0 },
                    { x: 145, y: 205, type: 'smooth', cp: false, inDx: 0, inDy: 10, outDx: 0, outDy: -10 },
                    { x: 80, y: 180, type: 'smooth', cp: false, inDx: 0, inDy: 35, outDx: 0, outDy: 0 },
                    { x: 105, y: 160, type: 'corner', cp: false, inDx: -8.3, inDy: 6.7, outDx: -50, outDy: 0 },
                    { x: 50, y: 120, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 110, y: 140, type: 'corner', cp: false, inDx: -20, inDy: -35, outDx: 3.3, outDy: -1.7 },
                    { x: 120, y: 135, type: 'corner', cp: false, inDx: -3.3, inDy: 1.7, outDx: -35, outDy: -40 },
                    { x: 60, y: 25, type: 'smooth', cp: false, inDx: -26.6, inDy: 66.5, outDx: 10, outDy: -25 },
                    { x: 75, y: 80, type: 'corner', cp: false, inDx: -10, inDy: -15, outDx: 3.3, outDy: -10 },
                    { x: 85, y: 50, type: 'smooth', cp: false, inDx: -6.6, inDy: 8.2, outDx: 20, outDy: -25 },
                    { x: 110, y: 100, type: 'corner', cp: false, inDx: -30, inDy: -5, outDx: 6.7, outDy: -5 },
                    { x: 130, y: 85, type: 'smooth', cp: false, inDx: 0, inDy: -25, outDx: 0, outDy: 13.4 },
                    { x: 135, y: 125, type: 'corner', cp: false, inDx: -15, inDy: -15, outDx: 8.3, outDy: 0 },
                    { x: 160, y: 125, type: 'corner', cp: false, inDx: -8.3, inDy: 0, outDx: 15, outDy: -10 },
                    { x: 165, y: 90, type: 'smooth', cp: false, inDx: 2.3, inDy: 11.6, outDx: -5, outDy: -25 },
                    { x: 185, y: 100, type: 'corner', cp: false, inDx: -5, inDy: -20, outDx: 25, outDy: -5 },
                    { x: 210, y: 50, type: 'smooth', cp: false, inDx: -20, inDy: -30, outDx: 5.8, outDy: 8.8 },
                    { x: 220, y: 80, type: 'corner', cp: false, inDx: -3.3, inDy: -10, outDx: 15, outDy: -15 },
                    { x: 235, y: 25, type: 'smooth', cp: false, inDx: -15, inDy: -25, outDx: 41.5, outDy: 69.1 },
                    { x: 175, y: 135, type: 'corner', cp: false, inDx: 15, inDy: -30, outDx: 3.3, outDy: 1.7 },
                    { x: 185, y: 140, type: 'corner', cp: false, inDx: -3.3, inDy: -1.7, outDx: 25, outDy: -30 },
                    { x: 245, y: 120, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 190, y: 160, type: 'corner', cp: false, inDx: 50, inDy: 0, outDx: -10, outDy: 35 },
                    { x: 195, y: 245, type: 'smooth', cp: false, inDx: -10, inDy: -35, outDx: 2.7, outDy: 9.6 }
                ]
            }),
            makeVectorFigure({
                name: 'Лев',
                closed: true,
                anchors: [
                    { x: 75, y: 145, type: 'corner', cp: false, inDx: -10, inDy: 105, outDx: -10, outDy: 25 },
                    { x: 70, y: 230, type: 'corner', cp: false, inDx: -20, inDy: -50, outDx: -70, outDy: -90 },
                    { x: 105, y: 85, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 35, y: 135, type: 'corner', cp: false, inDx: 25, inDy: -45, outDx: 0, outDy: -70 },
                    { x: 110, y: 50, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 65, y: 55, type: 'corner', cp: false, inDx: 25, inDy: -10, outDx: 45, outDy: -45 },
                    { x: 160, y: 35, type: 'corner', cp: false, inDx: 0, inDy: 0, outDx: 0, outDy: 0 },
                    { x: 130, y: 20, type: 'corner', cp: false, inDx: 15, inDy: 0, outDx: 75, outDy: -15 },
                    { x: 210, y: 65, type: 'corner', cp: false, inDx: 0, inDy: -5, outDx: 15, outDy: 5 },
                    { x: 235, y: 95, type: 'corner', cp: false, inDx: -8.3, inDy: -10, outDx: 5, outDy: 15 },
                    { x: 265, y: 130, type: 'corner', cp: false, inDx: -10, inDy: -11.7, outDx: 0, outDy: 10 },
                    { x: 255, y: 145, type: 'corner', cp: false, inDx: 3.3, inDy: -5, outDx: 0, outDy: 10 },
                    { x: 245, y: 165, type: 'corner', cp: false, inDx: 3.3, inDy: -6.7, outDx: -5, outDy: 30 },
                    { x: 220, y: 200, type: 'corner', cp: false, inDx: 10, inDy: -10, outDx: -5, outDy: -10 },
                    { x: 205, y: 185, type: 'corner', cp: false, inDx: 5, inDy: 5, outDx: 10, outDy: 30 },
                    { x: 205, y: 245, type: 'corner', cp: false, inDx: 0, inDy: -20, outDx: 5, outDy: -55 },
                    { x: 145, y: 115, type: 'corner', cp: false, inDx: -15, inDy: 60, outDx: -40, outDy: 90 },
                    { x: 175, y: 290, type: 'corner', cp: false, inDx: 80, inDy: -95, outDx: 45, outDy: -45 },
                    { x: 165, y: 90, type: 'corner', cp: false, inDx: -135, inDy: 80, outDx: -165, outDy: 60 },
                    { x: 150, y: 290, type: 'corner', cp: false, inDx: 50, inDy: -60, outDx: 10, outDy: -55 }
                ]
            })

        ]

    };

    function getVectorFigures(level) { return VECTOR_LEVELS[level] || VECTOR_LEVELS[1] || []; }
    function getVectorFigure() {
        const figs = getVectorFigures(vectorState.level);
        return figs[vectorState.figureIndex] || null;
    }

    let vectorState = {
        level: 1,
        figureIndex: 0,
        userAnchors: [],
        dragging: null,
        passed: false,
        celebrationStart: 0,
        celebrationActive: false,
        advanceTimer: null,
        transitionActive: false,
        transitionPhase: null,
        transitionStart: 0,
        transitionRAF: null,
        view: { factor: 1, offsetX: 0, offsetY: 0 },
        threshold: 6.5,
        refPts: null,
        userPts: null,
        userPtsDirty: false
    };

    /* Центр фигуры (по bbox анкоров) — вокруг него масштабируем. */
    function vectorFigureCenter(anchors) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const a of anchors) {
            if (a.x < minX) minX = a.x;
            if (a.x > maxX) maxX = a.x;
            if (a.y < minY) minY = a.y;
            if (a.y > maxY) maxY = a.y;
        }
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }

    /* Умножаем точку на scale вокруг центра фигуры. */
    function vectorScalePoint(p, center, scale) {
        return {
            x: center.x + (p.x - center.x) * scale,
            y: center.y + (p.y - center.y) * scale
        };
    }

    function vectorSampleSegment(a1, a2) {
        const p0x = a1.x, p0y = a1.y;
        const p1x = a1.x + a1.outDx, p1y = a1.y + a1.outDy;
        const p2x = a2.x + a2.inDx, p2y = a2.y + a2.inDy;
        const p3x = a2.x, p3y = a2.y;
        const approxLen =
            Math.hypot(p1x - p0x, p1y - p0y) +
            Math.hypot(p2x - p1x, p2y - p1y) +
            Math.hypot(p3x - p2x, p3y - p2y);
        const N = Math.max(12, Math.min(96, Math.round(approxLen / 1.5)));
        const out = [];
        for (let i = 1; i <= N; i++) {
            const t = i / N, mt = 1 - t;
            out.push({
                x: mt * mt * mt * p0x + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * p3x,
                y: mt * mt * mt * p0y + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * p3y
            });
        }
        return out;
    }

    /* Сэмплирует путь, применяя scale вокруг центра фигуры.
       Для самого центра использует анкоры, а ручки (in/out) тоже
       умножаются, чтобы кривизна росла пропорционально. */
    function vectorSamplePath(anchors, closed, scale) {
        if (!anchors || anchors.length < 2) return [];
        const s = scale || 1;
        const c = vectorFigureCenter(anchors);

        const pts = [vectorScalePoint(anchors[0], c, s)];
        const n = anchors.length;
        const segCount = closed ? n : n - 1;
        for (let i = 0; i < segCount; i++) {
            const a = anchors[i], b = anchors[(i + 1) % n];
            const aScaled = {
                x: c.x + (a.x - c.x) * s,
                y: c.y + (a.y - c.y) * s,
                inDx: a.inDx * s,
                inDy: a.inDy * s,
                outDx: a.outDx * s,
                outDy: a.outDy * s
            };
            const bScaled = {
                x: c.x + (b.x - c.x) * s,
                y: c.y + (b.y - c.y) * s,
                inDx: b.inDx * s,
                inDy: b.inDy * s,
                outDx: b.outDx * s,
                outDy: b.outDy * s
            };
            const sub = vectorSampleSegment(aScaled, bScaled);
            for (const p of sub) pts.push(p);
        }
        return pts;
    }

    function initVectorUserAnchors() {
        vectorState.refPts = null;
        vectorState.userPts = null;
        vectorState.userPtsDirty = false;
        const fig = getVectorFigure();
        if (!fig) { vectorState.userAnchors = []; return; }

        const n = fig.anchors.length;
        const DEFAULT_LEN = 22;

        vectorState.userAnchors = fig.anchors.map((a, i) => {
            const next = fig.anchors[(i + 1) % n];
            const prev = fig.anchors[(i - 1 + n) % n];

            let outDx = 0, outDy = 0, inDx = 0, inDy = 0;
            const hasOut = fig.closed || i < n - 1;
            const hasIn = fig.closed || i > 0;

            if (hasOut) {
                const dx = next.x - a.x, dy = next.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                outDx = (dx / len) * DEFAULT_LEN;
                outDy = (dy / len) * DEFAULT_LEN;
            }
            if (hasIn) {
                const dx = prev.x - a.x, dy = prev.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                inDx = (dx / len) * DEFAULT_LEN;
                inDy = (dy / len) * DEFAULT_LEN;
            }
            if (a.type === 'symmetric' && hasIn && hasOut) {
                inDx = -outDx;
                inDy = -outDy;
            }

            return {
                x: a.x, y: a.y, type: a.type,
                inDx: +inDx.toFixed(1), inDy: +inDy.toFixed(1),
                outDx: +outDx.toFixed(1), outDy: +outDy.toFixed(1)
            };
        });
    }

    function vectorPointToPolylineDist(p, pts) {
        let best = Infinity;
        for (let i = 1; i < pts.length; i++) {
            const d = pointToSegmentDistance(p, pts[i - 1], pts[i]);
            if (d < best) best = d;
        }
        return best;
    }

    function vectorComputeError() {
        const fig = getVectorFigure();
        if (!fig) return { max: Infinity };
        if (!vectorState.refPts) {
            vectorState.refPts = vectorSamplePath(fig.anchors, fig.closed, fig.scale);
        }
        if (!vectorState.userPts || vectorState.userPtsDirty) {
            vectorState.userPts = vectorSamplePath(vectorState.userAnchors, fig.closed, fig.scale);
            vectorState.userPtsDirty = false;
        }
        const refPts = vectorState.refPts;
        const userPts = vectorState.userPts;
        if (refPts.length === 0 || userPts.length === 0) return { max: Infinity };
        let maxDist = 0;
        for (let i = 0; i < refPts.length; i++) {
            const d = vectorPointToPolylineDist(refPts[i], userPts);
            if (d > maxDist) maxDist = d;
        }
        for (let i = 0; i < userPts.length; i++) {
            const d = vectorPointToPolylineDist(userPts[i], refPts);
            if (d > maxDist) maxDist = d;
        }
        return { max: maxDist };
    }

    function vectorFitView() {
        const w = vectorCanvas.width, h = vectorCanvas.height;
        const DESIGN = 300;

        /* Масштаб сцены. Как раньше — 100% относительно дизайна 300×300. */
        const factor = Math.min(w, h) * 1 / DESIGN;

        /* Центр фигуры в дизайн-координатах (без учёта scale — scale
           применяется в render/error/хит-тесте, а не в view). */
        const fig = getVectorFigure();
        let fx = DESIGN / 2, fy = DESIGN / 2;   // фолбэк — центр сцены
        if (fig && fig.anchors && fig.anchors.length > 0) {
            const c = vectorFigureCenter(fig.anchors);
            fx = c.x;
            fy = c.y;
        }

        /* Смещение так, чтобы центр фигуры лёг точно в центр холста. */
        vectorState.view = {
            factor,
            offsetX: w / 2 - fx * factor,
            offsetY: h / 2 - fy * factor
        };
    }

    function vectorDesignToScreen(p) {
        return {
            x: p.x * vectorState.view.factor + vectorState.view.offsetX,
            y: p.y * vectorState.view.factor + vectorState.view.offsetY
        };
    }

    function vectorScreenToDesign(p) {
        return {
            x: (p.x - vectorState.view.offsetX) / vectorState.view.factor,
            y: (p.y - vectorState.view.offsetY) / vectorState.view.factor
        };
    }

    function vectorGetCanvasPos(e) {
        const rect = vectorCanvas.getBoundingClientRect();
        const sx = rect.width ? vectorCanvas.width / rect.width : 1;
        const sy = rect.height ? vectorCanvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * sx,
            y: (e.clientY - rect.top) * sy
        };
    }

    function vectorComputeThreshold() {
        /* Половина толщины линии эталона в дизайн-единицах,
           переведённая в экранные пиксели через фактор вида. */
        const halfWidthDesign = vectorLineWidth() / 2;
        const factor = vectorState.view.factor || 1.5;
        return Math.max(2, halfWidthDesign / factor * 0.9);
    }

    /* Толщина серой линии-эталона. На уровне 3 — 0.75 от базовой. */
    function vectorLineWidth() {
        const base = 14;
        if (vectorState.level === 3) return base * 0.75;
        return base;
    }

    function vectorUpdateMatchUI() {
        const { max } = vectorComputeError();
        const thMax = vectorState.threshold;
        const matched = max <= thMax;
        let percent;
        if (matched) percent = 100;
        else {
            const ratio = max / thMax;
            percent = Math.max(0, Math.min(99, Math.round(100 / ratio)));
        }
        vectorMatchFill.style.width = percent + '%';
        vectorMatchPercent.textContent = (vectorState.passed ? 'Готово!' : percent + '%');
        const good = vectorState.passed || matched;
        vectorMatchFill.classList.toggle('good', good);
        vectorMatchPercent.classList.toggle('good', good);
        return matched;
    }

    function vectorRender() {
        const w = vectorCanvas.width, h = vectorCanvas.height;
        vectorCtx.setTransform(1, 0, 0, 1, 0, 0);
        vectorCtx.clearRect(0, 0, w, h);
        const fig = getVectorFigure();
        if (!fig) return;

        let scale = 1, alpha = 1;
        if (vectorState.transitionActive) {
            const elapsed = performance.now() - vectorState.transitionStart;
            const t = Math.min(1, elapsed / 650);
            if (vectorState.transitionPhase === 'out') {
                const e = t * t * t;
                scale = 1 - 0.9 * e;
                alpha = 1 - t * t;
            } else {
                const c1 = 1.70158; const c3 = c1 + 1;
                const e = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                scale = 0.1 + 0.9 * e;
                alpha = 1 - (1 - t) * (1 - t);
            }
        }

        vectorCtx.save();
        vectorCtx.globalAlpha = alpha;
        const cx = w / 2, cy = h / 2;
        vectorCtx.translate(cx, cy);
        vectorCtx.scale(scale, scale);
        vectorCtx.translate(-cx, -cy);

        const refPts = vectorSamplePath(fig.anchors, fig.closed, fig.scale);
        if (refPts.length > 0) {
            vectorCtx.beginPath();
            const first = vectorDesignToScreen(refPts[0]);
            vectorCtx.moveTo(first.x, first.y);
            for (let i = 1; i < refPts.length; i++) {
                const p = vectorDesignToScreen(refPts[i]);
                vectorCtx.lineTo(p.x, p.y);
            }
            if (fig.closed) vectorCtx.closePath();
            vectorCtx.strokeStyle = '#444455';
            vectorCtx.lineWidth = vectorLineWidth();
            vectorCtx.lineCap = 'round';
            vectorCtx.lineJoin = 'round';
            vectorCtx.stroke();
        }

        const userPts = vectorSamplePath(vectorState.userAnchors, fig.closed, fig.scale);
        if (userPts.length > 0) {
            vectorCtx.beginPath();
            const first = vectorDesignToScreen(userPts[0]);
            vectorCtx.moveTo(first.x, first.y);
            for (let i = 1; i < userPts.length; i++) {
                const p = vectorDesignToScreen(userPts[i]);
                vectorCtx.lineTo(p.x, p.y);
            }
            if (fig.closed) vectorCtx.closePath();
            if (vectorState.celebrationActive) {
                const eTime = performance.now() - vectorState.celebrationStart;
                const pulse = 0.5 + 0.5 * Math.sin(eTime / 100);
                vectorCtx.shadowColor = 'rgba(107, 207, 127, ' + (0.75 * pulse) + ')';
                vectorCtx.shadowBlur = 22;
            }
            vectorCtx.strokeStyle = vectorState.passed ? '#8ee89f' : '#b6a8ff';
            vectorCtx.lineWidth = 2.5;
            vectorCtx.lineCap = 'round';
            vectorCtx.lineJoin = 'round';
            vectorCtx.stroke();
            vectorCtx.shadowBlur = 0;
        }

        /* ---- Анкоры и ручки: масштабируем координаты вокруг центра фигуры ---- */
        const n = vectorState.userAnchors.length;
        const s = fig.scale || 1;
        const cc = vectorFigureCenter(fig.anchors);

        for (let i = 0; i < n; i++) {
            const a = vectorState.userAnchors[i];
            const col = VECTOR_TYPE_COLORS[a.type] || VECTOR_TYPE_COLORS.corner;

            const anchorScaled = vectorScalePoint(a, cc, s);
            const anchorScreen = vectorDesignToScreen(anchorScaled);

            const hasIn = fig.closed || i > 0;
            const hasOut = fig.closed || i < n - 1;

            const handleDraw = (hx, hy) => {
                vectorCtx.beginPath();
                vectorCtx.moveTo(anchorScreen.x, anchorScreen.y);
                vectorCtx.lineTo(hx, hy);
                vectorCtx.strokeStyle = col;
                vectorCtx.globalAlpha = 0.55;
                vectorCtx.lineWidth = 1.5;
                vectorCtx.setLineDash([5, 4]);
                vectorCtx.stroke();
                vectorCtx.setLineDash([]);
                vectorCtx.globalAlpha = 1;

                vectorCtx.beginPath();
                vectorCtx.arc(hx, hy, 7, 0, Math.PI * 2);
                vectorCtx.fillStyle = col;
                vectorCtx.fill();
                vectorCtx.strokeStyle = '#fff';
                vectorCtx.lineWidth = 1.5;
                vectorCtx.stroke();
            };

            if (hasOut && (Math.abs(a.outDx) > 0.5 || Math.abs(a.outDy) > 0.5)) {
                const hs = vectorDesignToScreen(vectorScalePoint(
                    { x: a.x + a.outDx, y: a.y + a.outDy }, cc, s
                ));
                handleDraw(hs.x, hs.y);
            }
            if (hasIn && (Math.abs(a.inDx) > 0.5 || Math.abs(a.inDy) > 0.5)) {
                const hs = vectorDesignToScreen(vectorScalePoint(
                    { x: a.x + a.inDx, y: a.y + a.inDy }, cc, s
                ));
                handleDraw(hs.x, hs.y);
            }

            vectorCtx.beginPath();
            vectorCtx.arc(anchorScreen.x, anchorScreen.y, 10, 0, Math.PI * 2);
            vectorCtx.fillStyle = col;
            vectorCtx.fill();
            vectorCtx.strokeStyle = '#fff';
            vectorCtx.lineWidth = 2;
            vectorCtx.stroke();

            if (fig.anchors[i] && fig.anchors[i].cp) {
                vectorCtx.beginPath();
                vectorCtx.arc(anchorScreen.x, anchorScreen.y, 14, 0, Math.PI * 2);
                vectorCtx.strokeStyle = 'rgba(255,217,61,0.7)';
                vectorCtx.lineWidth = 2;
                vectorCtx.stroke();
            }
        }

        vectorCtx.restore();
        vectorUpdateMatchUI();
    }

    function resizeVectorCanvas() {
        const padding = 20;
        const cssW = Math.max(240, vectorCanvasContainer.clientWidth - padding);
        const cssH = Math.max(240, vectorCanvasContainer.clientHeight - padding);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        vectorCanvas.style.width = cssW + 'px';
        vectorCanvas.style.height = cssH + 'px';
        vectorCanvas.width = Math.round(cssW * dpr);
        vectorCanvas.height = Math.round(cssH * dpr);
        vectorFitView();
        vectorState.threshold = vectorComputeThreshold();
        vectorRender();
    }

    function saveVectorProgress() {
        try {
            localStorage.setItem(VECTOR_PROGRESS_KEY, JSON.stringify({
                level: vectorState.level,
                figure: vectorState.figureIndex
            }));
        } catch (e) { }
    }

    function loadVectorProgress() {
        try {
            const raw = localStorage.getItem(VECTOR_PROGRESS_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data.level !== 'number' || typeof data.figure !== 'number') return null;
            return data;
        } catch (e) { return null; }
    }

    function clearVectorProgress() {
        try { localStorage.removeItem(VECTOR_PROGRESS_KEY); } catch (e) { }
    }

    function enter() {
        updateVectorStartModal();
    }

    function updateVectorStartModal() {
        vectorModalWin.style.display = 'none';
        vectorModalStart.style.display = 'flex';

        const saved = loadVectorProgress();
        const hasProgress = saved && !(saved.level === 1 && saved.figure === 0);

        if (hasProgress) {
            vectorBtnResume.style.display = 'inline-block';
            vectorBtnResume.textContent = 'Продолжить с ур. ' + saved.level + ', фиг. ' + (saved.figure + 1);
        } else {
            vectorBtnResume.style.display = 'none';
        }

        const freshBtn = vectorModalStart.querySelector('.btn-start');
        if (freshBtn) freshBtn.textContent = hasProgress ? 'Начать заново' : 'Начать';
    }

    function resumeVectorProgress() {
        const saved = loadVectorProgress();
        if (saved) {
            vectorState.level = Math.min(VECTOR_MAX_LEVEL, Math.max(1, saved.level));
            vectorState.figureIndex = Math.min(VECTOR_FIGURES_PER_LEVEL - 1, Math.max(0, saved.figure));
        }
        vectorLevelDisplay.innerText = 'Уровень ' + vectorState.level;
        initVectorGame();
    }

    function startFreshVector() {
        vectorState.level = 1;
        vectorState.figureIndex = 0;
        vectorLevelDisplay.innerText = 'Уровень 1';
        clearVectorProgress();
        initVectorGame();
    }

    function resetVectorLevel() {
        vectorState.level = 1;
        vectorState.figureIndex = 0;
        vectorLevelDisplay.innerText = 'Уровень 1';
        initVectorGame();
    }

    function initVectorGame() {
        vectorModalStart.style.display = 'none';
        vectorModalWin.style.display = 'none';
        vectorState.passed = false;
        vectorState.celebrationActive = false;
        vectorState.dragging = null;
        vectorState.transitionActive = false;
        vectorState.transitionPhase = null;
        if (vectorState.transitionRAF) {
            cancelAnimationFrame(vectorState.transitionRAF);
            vectorState.transitionRAF = null;
        }
        if (vectorState.advanceTimer) {
            clearTimeout(vectorState.advanceTimer);
            vectorState.advanceTimer = null;
        }

        const figs = getVectorFigures(vectorState.level);
        if (!figs.length) return;
        if (vectorState.figureIndex > figs.length - 1) vectorState.figureIndex = 0;

        initVectorUserAnchors();
        vectorFigNumEl.innerText = String(vectorState.figureIndex + 1);
        vectorFigTotalEl.innerText = String(figs.length);
        vectorLevelDisplay.innerText = 'Уровень ' + vectorState.level;

        saveVectorProgress();
        if (!vectorDevPanel.classList.contains('hidden')) buildVectorDevPanel();

        resizeVectorCanvas();
    }

    function vectorHitHandle(pos) {
        const n = vectorState.userAnchors.length;
        const fig = getVectorFigure();
        if (!fig) return null;
        const r = 14 / (vectorState.view.factor || 1);
        const s = fig.scale || 1;
        const cc = vectorFigureCenter(fig.anchors);

        for (let i = n - 1; i >= 0; i--) {
            const a = vectorState.userAnchors[i];
            const hasIn = fig.closed || i > 0;
            const hasOut = fig.closed || i < n - 1;

            if (hasOut && (Math.abs(a.outDx) > 0.5 || Math.abs(a.outDy) > 0.5)) {
                const hp = vectorScalePoint({ x: a.x + a.outDx, y: a.y + a.outDy }, cc, s);
                if (distance(pos, hp) <= r) return { idx: i, which: 'out' };
            }
            if (hasIn && (Math.abs(a.inDx) > 0.5 || Math.abs(a.inDy) > 0.5)) {
                const hp = vectorScalePoint({ x: a.x + a.inDx, y: a.y + a.inDy }, cc, s);
                if (distance(pos, hp) <= r) return { idx: i, which: 'in' };
            }
        }
        return null;
    }

    function vectorSetHandle(anchor, which, dx, dy) {
        vectorState.userPtsDirty = true;
        const thisLen = Math.hypot(dx, dy);
        const otherWhich = which === 'in' ? 'out' : 'in';
        const otherVec = otherWhich === 'in'
            ? { x: anchor.inDx, y: anchor.inDy }
            : { x: anchor.outDx, y: anchor.outDy };
        const otherLen = Math.hypot(otherVec.x, otherVec.y);

        if (anchor.type === 'corner') {
            if (which === 'in') { anchor.inDx = dx; anchor.inDy = dy; }
            else { anchor.outDx = dx; anchor.outDy = dy; }
            return;
        }

        if (thisLen < 0.1) {
            if (which === 'in') { anchor.inDx = 0; anchor.inDy = 0; }
            else { anchor.outDx = 0; anchor.outDy = 0; }
            if (anchor.type === 'symmetric') {
                if (otherWhich === 'in') { anchor.inDx = 0; anchor.inDy = 0; }
                else { anchor.outDx = 0; anchor.outDy = 0; }
            }
            return;
        }

        const ux = dx / thisLen, uy = dy / thisLen;

        if (which === 'in') {
            anchor.inDx = dx; anchor.inDy = dy;
            if (anchor.type === 'symmetric') {
                anchor.outDx = -dx; anchor.outDy = -dy;
            } else {
                anchor.outDx = -ux * otherLen;
                anchor.outDy = -uy * otherLen;
            }
        } else {
            anchor.outDx = dx; anchor.outDy = dy;
            if (anchor.type === 'symmetric') {
                anchor.inDx = -dx; anchor.inDy = -dy;
            } else {
                anchor.inDx = -ux * otherLen;
                anchor.inDy = -uy * otherLen;
            }
        }
    }

    function vectorOnPointerDown(e) {
        if (vectorState.passed || vectorState.transitionActive) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        const pos = vectorScreenToDesign(vectorGetCanvasPos(e));
        const hHit = vectorHitHandle(pos);
        if (!hHit) return;
        vectorState.dragging = { idx: hHit.idx, which: hHit.which };
        try { vectorCanvas.setPointerCapture(e.pointerId); } catch (err) { }
        vectorRender();
    }

    function vectorOnPointerMove(e) {
        if (!vectorState.dragging) return;
        if (vectorState.passed || vectorState.transitionActive) return;
        e.preventDefault();

        const pos = vectorScreenToDesign(vectorGetCanvasPos(e));
        const anchor = vectorState.userAnchors[vectorState.dragging.idx];
        if (!anchor) return;

        /* Переводим позицию курсора обратно в «дизайн-координаты без
           масштабирования», потому что ручки хранятся в них. */
        const fig = getVectorFigure();
        const s = fig.scale || 1;
        const cc = vectorFigureCenter(fig.anchors);
        const unscaled = {
            x: cc.x + (pos.x - cc.x) / s,
            y: cc.y + (pos.y - cc.y) / s
        };

        const dx = +(unscaled.x - anchor.x).toFixed(1);
        const dy = +(unscaled.y - anchor.y).toFixed(1);
        vectorSetHandle(anchor, vectorState.dragging.which, dx, dy);
        vectorRender();

        if (!vectorState.passed) {
            const { max } = vectorComputeError();
            if (max <= vectorState.threshold) vectorOnMatched();
        }
    }

    function vectorOnPointerUp(e) {
        if (vectorState.dragging) {
            try { vectorCanvas.releasePointerCapture(e.pointerId); } catch (err) { }
        }
        vectorState.dragging = null;
        vectorRender();
    }

    vectorCanvas.addEventListener('pointerdown', vectorOnPointerDown);
    vectorCanvas.addEventListener('pointermove', vectorOnPointerMove);
    vectorCanvas.addEventListener('pointerup', vectorOnPointerUp);
    vectorCanvas.addEventListener('pointercancel', vectorOnPointerUp);
    vectorCanvas.addEventListener('contextmenu', e => e.preventDefault());

    function vectorOnMatched() {
        vectorState.passed = true;
        vectorState.celebrationActive = true;
        vectorState.celebrationStart = performance.now();
        vectorState.dragging = null;
        vectorRender();

        vectorState.advanceTimer = setTimeout(() => {
            vectorState.celebrationActive = false;
            vectorState.advanceTimer = null;

            if (vectorState.figureIndex >= VECTOR_FIGURES_PER_LEVEL - 1) {
                if (vectorState.level >= VECTOR_MAX_LEVEL) {
                    vectorWinTitle.textContent = 'Все уровни пройдены!';
                    vectorWinDesc.textContent = 'Вы совместили все фигуры на всех уровнях.';
                    vectorBtnNextLevel.style.display = 'none';
                } else {
                    vectorWinTitle.textContent = 'Уровень пройден!';
                    vectorWinDesc.textContent = 'Вы совместили все ' + VECTOR_FIGURES_PER_LEVEL + ' фигур.';
                    vectorBtnNextLevel.style.display = 'inline-block';
                }
                vectorModalWin.style.display = 'flex';
                vectorState.passed = false;
                return;
            }

            vectorState.transitionActive = true;
            vectorState.transitionPhase = 'out';
            vectorState.transitionStart = performance.now();
            vectorState.transitionRAF = requestAnimationFrame(vectorTransitionLoop);
        }, 900);
    }

    function vectorTransitionLoop() {
        vectorState.transitionRAF = null;
        vectorRender();
        const elapsed = performance.now() - vectorState.transitionStart;
        if (elapsed < 650) {
            vectorState.transitionRAF = requestAnimationFrame(vectorTransitionLoop);
            return;
        }
        if (vectorState.transitionPhase === 'out') {
            vectorState.figureIndex++;
            vectorState.passed = false;
            initVectorUserAnchors();
            vectorFitView();                        // <-- пересчёт центра под новую фигуру
            vectorState.threshold = vectorComputeThreshold();
            vectorFigNumEl.innerText = String(vectorState.figureIndex + 1);
            saveVectorProgress();
            if (!vectorDevPanel.classList.contains('hidden')) buildVectorDevPanel();
            vectorState.transitionPhase = 'in';
            vectorState.transitionStart = performance.now();
            vectorState.transitionRAF = requestAnimationFrame(vectorTransitionLoop);
            return;
        }
        vectorState.transitionActive = false;
        vectorState.transitionPhase = null;
        vectorRender();
    }

    function nextVectorLevel() {
        if (vectorState.level < VECTOR_MAX_LEVEL) {
            vectorState.level++;
            vectorLevelDisplay.innerText = 'Уровень ' + vectorState.level;
        }
        vectorState.figureIndex = 0;
        initVectorGame();
    }

    function toggleVectorDevPanel() {
        if (vectorDevPanel.classList.contains('hidden')) {
            vectorDevPanel.classList.remove('hidden');
            buildVectorDevPanel();
        } else {
            vectorDevPanel.classList.add('hidden');
        }
        setTimeout(resizeVectorCanvas, 50);
    }

    function buildVectorDevPanel() {
        vectorDevContent.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'dev-level-row';
        header.style.marginBottom = '0.6rem';

        const headerLabel = document.createElement('div');
        headerLabel.className = 'dev-level-label';
        headerLabel.textContent = 'Загрузить';
        header.appendChild(headerLabel);

        const loadBtn = document.createElement('button');
        loadBtn.className = 'dev-fig-btn load-btn';
        loadBtn.textContent = '.js';
        loadBtn.title = 'Загрузить векторную фигуру из .js и заменить текущую';
        loadBtn.onclick = () => document.getElementById('vector-file-input').click();
        header.appendChild(loadBtn);

        vectorDevContent.appendChild(header);

        for (let lvl = 1; lvl <= VECTOR_MAX_LEVEL; lvl++) {
            const row = document.createElement('div');
            row.className = 'dev-level-row';
            const label = document.createElement('div');
            label.className = 'dev-level-label';
            label.textContent = 'Уровень ' + lvl;
            row.appendChild(label);
            const levelFigs = getVectorFigures(lvl);
            for (let f = 0; f < levelFigs.length; f++) {
                const btn = document.createElement('button');
                btn.className = 'dev-fig-btn';
                btn.textContent = String(f + 1);
                btn.title = levelFigs[f].name || ('Фигура ' + (f + 1));
                if (lvl === vectorState.level && f === vectorState.figureIndex) btn.classList.add('active');
                btn.onclick = () => jumpToVector(lvl, f);
                row.appendChild(btn);
            }
            vectorDevContent.appendChild(row);
        }
    }

    function jumpToVector(level, figureIndex) {
        vectorState.level = Math.min(VECTOR_MAX_LEVEL, Math.max(1, level));
        vectorState.figureIndex = Math.min(VECTOR_FIGURES_PER_LEVEL - 1, Math.max(0, figureIndex));
        vectorLevelDisplay.innerText = 'Уровень ' + vectorState.level;
        initVectorGame();
    }

    document.getElementById('vector-file-input').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const cleaned = String(reader.result).trim().replace(/;+\s*$/, '');
                const factory = new Function('makeVectorFigure', 'return (' + cleaned + ');');
                const fig = factory(makeVectorFigure);
                if (!fig || !Array.isArray(fig.anchors) || fig.anchors.length < 2) {
                    throw new Error('Не похоже на векторную фигуру. Ожидается вызов makeVectorFigure({...})');
                }
                if (!VECTOR_LEVELS[vectorState.level]) VECTOR_LEVELS[vectorState.level] = [];
                VECTOR_LEVELS[vectorState.level][vectorState.figureIndex] = fig;
                initVectorGame();
                alert('Фигура «' + (fig.name || 'без имени') + '» загружена в текущий слот.');
            } catch (err) {
                alert('Ошибка загрузки: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    return {
        enter,
        resumeVectorProgress,
        startFreshVector,
        nextVectorLevel,
        resetVectorLevel,
        resizeVectorCanvas,
        toggleVectorDevPanel,
        isDevPanelOpen: () => !vectorDevPanel.classList.contains('hidden'),
        isOpen: () => document.getElementById('screen-vector').style.display === 'flex'
    };
})();