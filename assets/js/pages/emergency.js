// emergency.js — Emergency page logic

document.addEventListener('DOMContentLoaded', () => {
    // Aid toggle panels
    document.querySelectorAll('.aid-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const panel = document.querySelector(targetId);
            if (!panel) return;
            const isOpen = panel.classList.contains('open');
            // Close all panels first
            document.querySelectorAll('.aid-panel').forEach(p => p.classList.remove('open'));
            document.querySelectorAll('.aid-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
            // Toggle clicked panel
            if (!isOpen) {
                panel.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
});