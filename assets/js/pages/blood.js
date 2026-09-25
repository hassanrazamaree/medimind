// blood.js — Blood analyzer logic

const BLOOD_KEY = 'medi_blood_reports';

const RANGES = {
    hemoglobin: { min: 12, max: 17, unit: 'g/dL', label: 'Hemoglobin' },
    sugar: { min: 70, max: 100, unit: 'mg/dL', label: 'Blood Sugar (Fasting)' }
};

function getStatus(key, value) {
    const r = RANGES[key];
    if (!r) return null;
    if (value < r.min) return { status: 'low', text: `Low — Normal: ${r.min}–${r.max} ${r.unit}` };
    if (value > r.max) return { status: 'high', text: `High — Normal: ${r.min}–${r.max} ${r.unit}` };
    return { status: 'normal', text: `Normal — ${r.min}–${r.max} ${r.unit}` };
}

function analyze(e) {
    if (e) e.preventDefault();
    const resultEl = document.getElementById('blood-result');
    if (!resultEl) return;

    const fields = ['hemoglobin', 'sugar'];
    const results = [];
    let hasValue = false;

    fields.forEach(key => {
        const input = document.getElementById(key);
        if (!input || !input.value) return;
        const value = parseFloat(input.value);
        if (isNaN(value)) return;
        hasValue = true;
        const s = getStatus(key, value);
        results.push({ key, value, label: RANGES[key].label, unit: RANGES[key].unit, ...s });
    });

    if (!hasValue) {
        resultEl.innerHTML = '<p style="color:var(--text-muted)">Please enter at least one value.</p>';
        return;
    }

    const html = results.map(r => `
    <div class="result-status ${r.status}">
      <strong>${r.label}:</strong> ${r.value} ${r.unit}<br>
      <span>${r.text}</span>
    </div>
  `).join('');

    resultEl.innerHTML = html + '<p style="margin-top:12px;font-size:0.8rem;color:var(--text-muted)">⚠ This is a reference only. Consult a doctor for proper diagnosis.</p>';

    // Save to localStorage
    const reports = JSON.parse(localStorage.getItem(BLOOD_KEY) || '[]');
    reports.unshift({ date: new Date().toLocaleDateString(), results });
    localStorage.setItem(BLOOD_KEY, JSON.stringify(reports.slice(0, 10)));
    renderHistory();
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('blood-form');
    if (form) form.addEventListener('submit', analyze);
    renderHistory();
});

function renderHistory() {
    const el = document.getElementById('blood-history');
    if (!el) return;
    let reports = [];
    try { reports = JSON.parse(localStorage.getItem(BLOOD_KEY) || '[]'); } catch (e) {}
    if (!reports.length) {
        el.innerHTML = '<p class="caption">No saved reports yet. Analyze a value above to start your history.</p>';
        return;
    }
    el.innerHTML = reports.map(function (rep) {
        return rep.results.map(function (r) {
            const badgeClass = r.status === 'low' || r.status === 'high' ? 'badge-error' : 'badge-success';
            const badgeText = r.status === 'normal' ? 'Normal' : r.status.toUpperCase();
            return '<div class="row-between" style="padding:10px 0;border-bottom:1px solid var(--border);">' +
                '<div><div style="font-weight:600;font-size:14px;">' + r.label + '</div>' +
                '<div class="caption">' + rep.date + '</div></div>' +
                '<div style="text-align:right;"><div style="font-weight:600;font-size:14px;">' + r.value + ' ' + r.unit + '</div>' +
                '<span class="badge ' + badgeClass + '" style="margin-top:2px;">' + badgeText + '</span></div></div>';
        }).join('');
    }).join('');
}