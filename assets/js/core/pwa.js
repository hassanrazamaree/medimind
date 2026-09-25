/* MediMind PWA: service worker registration + install prompt banner. */
(function () {
    'use strict';

    const DISMISS_KEY = 'medi_pwa_dismissed';
    let deferredPrompt = null;
    let banner = null;

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function dismissed() {
        try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return true; }
    }

    // --- Service worker (http/https only; not on file://) ---
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
        const swUrl = location.pathname.indexOf('/pages/') !== -1 ? '../sw.js' : './sw.js';
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(swUrl).catch(() => {});
        });
    }

    function hideBanner() {
        if (banner) { banner.remove(); banner = null; }
    }

    function showBanner() {
        if (banner || isStandalone() || dismissed()) return;
        banner = document.createElement('div');
        banner.className = 'pwa-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Install MediMind');
        banner.innerHTML =
            '<div class="pwa-icon"><i data-lucide="heart-pulse" aria-hidden="true"></i></div>' +
            '<div class="pwa-text"><strong>Install MediMind</strong>' +
            '<span>Add to your home screen for quick access, just like an app.</span></div>' +
            '<button type="button" class="btn btn-primary btn-sm pwa-install">Install</button>' +
            '<button type="button" class="pwa-dismiss" aria-label="Dismiss">&times;</button>';
        document.body.appendChild(banner);
        if (window.lucide) window.lucide.createIcons();
        requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
        banner.querySelector('.pwa-install').addEventListener('click', installNow);
        banner.querySelector('.pwa-dismiss').addEventListener('click', () => {
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
            hideBanner();
        });
    }

    function installNow() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
                deferredPrompt = null;
                hideBanner();
            });
        } else {
            // Manual path: browser menu -> Add to Home Screen
            toast('Open your browser menu and choose "Add to Home Screen".');
        }
    }

    function toast(msg) {
        let stack = document.getElementById('toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'toast-stack';
            stack.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;display:flex;flex-direction:column;gap:8px';
            document.body.appendChild(stack);
        }
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        stack.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Small delay so it doesn't fight the onboarding overlay
        setTimeout(showBanner, 2500);
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideBanner();
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    });

    // Manual install trigger (e.g. Profile > Settings button)
    window.installMediMind = installNow;
})();
