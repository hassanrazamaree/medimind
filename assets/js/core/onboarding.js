/* MediMind onboarding tutorial — 4-slide intro overlay, shown once on first visit.
   Replay anytime via window.replayOnboarding() (Profile > Settings). */
(function () {
    'use strict';

    const DONE_KEY = 'medi_onboarding_done';

    const SLIDES = [
        {
            icon: 'heart-pulse',
            grad: 'linear-gradient(135deg,#10b981,#34d399)',
            title: 'Khush Aamdeed! 👋',
            text: 'MediMind aapka personal <strong>AI health companion</strong> hai — chat, health tracker, diet, dawaiyan aur emergency, sab kuch ek hi jagah.'
        },
        {
            icon: 'bot',
            grad: 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
            title: 'AI Sehat Assistant',
            text: 'Apne <strong>symptoms batayein</strong> ya diet, neend, BP koi bhi sawal poochein — AI Urdu aur English dono mein jawab dega. <strong>Voice input</strong> bhi available hai!'
        },
        {
            icon: 'activity',
            grad: 'linear-gradient(135deg,#10b981,#8b5cf6)',
            title: 'Sehat ka Hisaab',
            text: '<strong>Health Tracker</strong> mein steps, neend aur BP note karein, <strong>Blood Analyzer</strong> se reports samjhein, <strong>Diet</strong> aur <strong>Medications</strong> se routine banayein.'
        },
        {
            icon: 'siren',
            grad: 'linear-gradient(135deg,#ef4444,#f97316)',
            title: 'Emergency SOS',
            text: 'Emergency mein ghabrayein nahi — <strong>Emergency SOS</strong> screen se ek tap par <strong>1122</strong> ya <strong>115</strong> par foran call karein.'
        }
    ];

    let idx = 0;
    let overlay = null;

    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function render() {
        const s = SLIDES[idx];
        const body = overlay.querySelector('.onboarding-body');
        body.innerHTML = '';
        const slide = el('div', 'onboarding-slide');
        slide.appendChild(el('div', 'onboarding-icon', '<i data-lucide="' + s.icon + '" aria-hidden="true"></i>'));
        slide.querySelector('.onboarding-icon').style.background = s.grad;
        slide.appendChild(el('div', 'onboarding-title', s.title));
        slide.appendChild(el('div', 'onboarding-text', s.text));
        body.appendChild(slide);

        const dots = overlay.querySelector('.onboarding-dots');
        dots.innerHTML = '';
        SLIDES.forEach((_, i) => {
            const d = el('button', 'onboarding-dot' + (i === idx ? ' active' : ''), '');
            d.type = 'button';
            d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            d.addEventListener('click', () => { idx = i; render(); });
            dots.appendChild(d);
        });

        const nav = overlay.querySelector('.onboarding-nav');
        nav.innerHTML = '';
        const isLast = idx === SLIDES.length - 1;
        if (idx > 0) {
            const back = el('button', 'btn btn-soft', 'Back');
            back.type = 'button';
            back.addEventListener('click', () => { idx -= 1; render(); });
            nav.appendChild(back);
        }
        const next = el('button', 'btn btn-primary', isLast ? 'Get Started' : 'Next');
        next.type = 'button';
        next.addEventListener('click', () => {
            if (isLast) finish(true);
            else { idx += 1; render(); }
        });
        nav.appendChild(next);

        if (window.lucide) window.lucide.createIcons();
    }

    function finish(markDone) {
        if (markDone) {
            try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {}
        }
        if (!overlay) return;
        overlay.classList.remove('show');
        setTimeout(() => { if (overlay) { overlay.remove(); overlay = null; } }, 300);
    }

    function show() {
        if (overlay) return;
        overlay = el('div', 'onboarding-overlay');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'MediMind tutorial');
        const card = el('div', 'onboarding-card');
        const skip = el('button', 'onboarding-skip', 'Skip');
        skip.type = 'button';
        skip.addEventListener('click', () => finish(true));
        card.appendChild(skip);
        card.appendChild(el('div', 'onboarding-body'));
        card.appendChild(el('div', 'onboarding-dots'));
        card.appendChild(el('div', 'onboarding-nav'));
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        render();
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
        const esc = (e) => { if (e.key === 'Escape') { finish(true); document.removeEventListener('keydown', esc); } };
        document.addEventListener('keydown', esc);
    }

    function initOnboarding() {
        try {
            if (localStorage.getItem(DONE_KEY) === '1') return;
        } catch (e) { return; }
        // Let the app shell paint first, then slide in
        setTimeout(show, 700);
    }

    window.initOnboarding = initOnboarding;
    window.replayOnboarding = function () {
        try { localStorage.removeItem(DONE_KEY); } catch (e) {}
        idx = 0;
        show();
    };
})();
