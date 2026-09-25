// diet.js — Diet page logic

const DIET_KEY = 'medi_diet_log';
const CALORIE_GOAL = 2000;

function loadDietData() {
    try { return JSON.parse(localStorage.getItem(DIET_KEY) || '{}'); } catch { return {}; }
}

function saveDietData(data) {
    localStorage.setItem(DIET_KEY, JSON.stringify(data));
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function updateWaterDisplay(count) {
    const el = document.getElementById('water-count');
    if (el) el.textContent = count;
    const glasses = document.getElementById('water-glasses');
    if (glasses) {
        let html = '';
        for (let i = 0; i < 8; i++) {
            const filled = i < count;
            html += '<div style="width:20px;height:26px;border-radius:4px 4px 8px 8px;border:1.5px solid var(--info);background:' +
                (filled ? 'var(--info)' : 'transparent') + ';opacity:' + (filled ? 1 : 0.4) + ';"></div>';
        }
        glasses.innerHTML = html;
    }
}

function updateCalorieDisplay(total) {
    const countEl = document.getElementById('calorie-count');
    const barEl = document.getElementById('calorie-bar');
    if (countEl) countEl.textContent = total;
    if (barEl) {
        const pct = Math.min((total / CALORIE_GOAL) * 100, 100);
        barEl.style.width = pct + '%';
    }
}

function renderMealList(meals) {
    const list = document.getElementById('meal-list');
    if (!list) return;
    if (!meals.length) {
        list.innerHTML = '<li class="caption" style="list-style:none;">No meals logged yet. Add your first meal above.</li>';
        return;
    }
    list.innerHTML = meals.map((m, i) => `
    <li class="row-between" style="padding:12px;background:var(--bg);border-radius:12px;list-style:none;">
      <div class="row" style="gap:12px;">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;color:var(--primary-dark);flex-shrink:0;"><i data-lucide="salad" style="width:16px;height:16px"></i></div>
        <div><div style="font-weight:600;font-size:14px;">${m.name}</div></div>
      </div>
      <span style="display:flex;gap:12px;align-items:center;">
        <strong style="font-size:14px;">${m.calories} kcal</strong>
        <button type="button" onclick="deleteMeal(${i})" aria-label="Delete meal" style="color:var(--error);background:none;border:none;cursor:pointer;font-size:1.1rem;line-height:1;">&times;</button>
      </span>
    </li>
  `).join('');
    if (window.lucide) lucide.createIcons();
}

window.deleteMeal = function (index) {
    const data = loadDietData();
    const today = getTodayKey();
    if (!data[today]) return;
    data[today].meals.splice(index, 1);
    const total = data[today].meals.reduce((s, m) => s + m.calories, 0);
    data[today].calories = total;
    saveDietData(data);
    renderMealList(data[today].meals);
    updateCalorieDisplay(total);
};

document.addEventListener('DOMContentLoaded', () => {
    const today = getTodayKey();
    const data = loadDietData();
    if (!data[today]) data[today] = { water: 0, calories: 0, meals: [] };
    const todayData = data[today];

    updateWaterDisplay(todayData.water);
    updateCalorieDisplay(todayData.calories);
    renderMealList(todayData.meals);

    // Water buttons
    document.getElementById('water-plus')?.addEventListener('click', () => {
        todayData.water++;
        saveDietData(data);
        updateWaterDisplay(todayData.water);
    });

    document.getElementById('water-minus')?.addEventListener('click', () => {
        if (todayData.water <= 0) return;
        todayData.water--;
        saveDietData(data);
        updateWaterDisplay(todayData.water);
    });

    // Meal form
    const mealForm = document.getElementById('meal-form');
    if (mealForm) {
        mealForm.addEventListener('submit', e => {
            e.preventDefault();
            const nameInput = document.getElementById('meal-name');
            const calInput = document.getElementById('meal-calories');
            if (!nameInput || !calInput) return;
            const name = nameInput.value.trim();
            const calories = parseInt(calInput.value);
            if (!name || isNaN(calories) || calories < 1) return;

            todayData.meals.push({ name, calories });
            todayData.calories = todayData.meals.reduce((s, m) => s + m.calories, 0);
            saveDietData(data);
            renderMealList(todayData.meals);
            updateCalorieDisplay(todayData.calories);
            nameInput.value = '';
            calInput.value = '';
            nameInput.focus();
        });
    }
});