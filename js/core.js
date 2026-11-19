/* Общие утилиты, доступные всем разделам. */

window.Core = (function () {
    'use strict';

    function distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function pointToSegmentDistance(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return distance(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return distance(p, proj);
    }

    const VECTOR_TYPE_COLORS = {
        corner: '#7b6cf6',
        smooth: '#FC8C70',
        symmetric: '#439FE1'
    };

    return {
        distance,
        pointToSegmentDistance,
        VECTOR_TYPE_COLORS
    };
})();

/* Глобальные удобные алиасы, чтобы код модулей читался как раньше. */
const distance = window.Core.distance;
const pointToSegmentDistance = window.Core.pointToSegmentDistance;
const VECTOR_TYPE_COLORS = window.Core.VECTOR_TYPE_COLORS;

