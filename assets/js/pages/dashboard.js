// dashboard.js — Dashboard charts and stats

const STATS_KEY = 'medi_health_stats';

function getStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch { return {}; }
}

function loadStats() {
    const stats = getStats();
    const stepsEl = document.querySelector('[data-stat="steps"]');
    const hrEl = document.querySelector('[data-stat="heartRate"]');
    const sleepEl = document.querySelector('[data-stat="sleep"]');
    if (stepsEl) stepsEl.textContent = stats.steps ?? 0;
    if (hrEl) hrEl.textContent = stats.heartRate ? stats.heartRate + ' bpm' : '-- bpm';
    if (sleepEl) sleepEl.textContent = stats.sleep ? stats.sleep + ' hrs' : '-- hrs';
    try {
        const p = JSON.parse(localStorage.getItem('medi_profile') || '{}');
        const g = document.querySelector('[data-greeting-name]');
        if (g && p.name) g.textContent = p.name.split(' ')[0];
    } catch (e) {}
}

function generateData(days, base, spread) {
    return Array.from({ length: days }, () =>
        Math.round(base + (Math.random() - 0.5) * spread)
    );
}

function getLabels(days) {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    }
    return labels;
}

let chart = null;

function initChart(days) {
    const canvas = document.getElementById('health-chart');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLabels(days),
            datasets: [
                {
                    label: 'Steps (÷100)',
                    data: generateData(days, 65, 30),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Sleep (hrs)',
                    data: generateData(days, 7, 3),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    initChart(7);

    // Period selector
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('btn-primary'));
            btn.classList.add('btn-primary');
            const days = parseInt(btn.dataset.period);
            initChart(days);
        });
    });
});