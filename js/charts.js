// ─── CHARTS ────────────────────────────────────────────────────────────────────
let charts = {};

function chartColors() {
    return [
        '--color-chart-1',
        '--color-chart-2',
        '--color-chart-3',
        '--color-chart-4',
        '--color-chart-5'
    ].map(v => getCSSVar(v));
}

function destroyChart(id) {
    if (charts[id]) {
        charts[id].destroy();
        delete charts[id];
    }
}

function chartDefaults() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';

    return {
        color: getCSSVar('--color-text-muted'),
        grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    };
}