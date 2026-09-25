// tracker.js — Health tracker logic

const TRACKER_KEY = 'medi_tracker';
const STEPS_GOAL = 10000;

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function loadTracker() {
    try { return JSON.parse(localStorage.getItem(TRACKER_KEY) || '{}'); } catch { return {}; }
}

function saveTracker(data) {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(data));
}

function updateStepsDisplay(steps) {
    const output = document.getElementById('steps-output');
    const progress = document.getElementById('steps-progress');
    const ring = document.getElementById('steps-ring');
    const ringPct = document.getElementById('steps-ring-pct');
    const pct = Math.min(steps / STEPS_GOAL, 1);
    if (output) output.textContent = steps;
    if (progress) progress.style.width = (pct * 100) + '%';
    if (ring) {
        const circ = 2 * Math.PI * 60;
        ring.setAttribute('stroke-dasharray', (circ * pct) + ' ' + circ);
    }
    if (ringPct) ringPct.textContent = Math.round(pct * 100) + '%';
}

function updateSleepDisplay(hours) {
    const output = document.getElementById('sleep-output');
    if (output) output.textContent = hours;
}

let trackerChart = null;

function initTrackerChart(steps, sleep) {
    const canvas = document.getElementById('tracker-chart');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');
    if (trackerChart) trackerChart.destroy();

    trackerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Steps (÷100)', 'Sleep (hrs)'],
            datasets: [{
                label: "Today's Stats",
                data: [Math.round(steps / 100), sleep],
                backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(139,92,246,0.7)'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const today = getTodayKey();
    const data = loadTracker();
    if (!data[today]) data[today] = { steps: 0, sleep: 0 };
    const todayData = data[today];

    updateStepsDisplay(todayData.steps);
    updateSleepDisplay(todayData.sleep);
    initTrackerChart(todayData.steps, todayData.sleep);

    // Steps input
    const stepsInput = document.getElementById('steps-input');
    if (stepsInput) {
        stepsInput.value = todayData.steps || '';
        stepsInput.addEventListener('input', () => {
            const val = parseInt(stepsInput.value) || 0;
            todayData.steps = val;
            saveTracker(data);
            updateStepsDisplay(val);
            initTrackerChart(val, todayData.sleep);
        });
    }

    // Sleep input
    const sleepInput = document.getElementById('sleep-input');
    if (sleepInput) {
        sleepInput.value = todayData.sleep || '';
        sleepInput.addEventListener('input', () => {
            const val = parseFloat(sleepInput.value) || 0;
            todayData.sleep = val;
            saveTracker(data);
            updateSleepDisplay(val);
            initTrackerChart(todayData.steps, val);
        });
    }
});