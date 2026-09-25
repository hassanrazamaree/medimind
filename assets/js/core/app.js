// app.js — Global behaviour: theme, sidebar, active nav, profile.
// Runs after layout.js (script order in <head>), so the injected shell exists.

(function () {
  'use strict';

  const PROFILE_KEY = 'medi_profile';
  const SETTINGS_KEY = 'medi_settings';

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch (e) { return {}; }
  }

  function applyTheme() {
    document.body.classList.toggle('dark', !!readJSON(SETTINGS_KEY).darkMode);
  }

  function initTheme() {
    applyTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const s = readJSON(SETTINGS_KEY);
        s.darkMode = !document.body.classList.contains('dark');
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
        applyTheme();
      });
    });
  }

  function initSidebar() {
    const toggle = document.querySelector('[data-sidebar-toggle]');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
    if (overlay) {
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  function initActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'chat.html';
    document.querySelectorAll('.navlink, .bottomnav a').forEach(function (link) {
      if (link.getAttribute('href') === current) link.classList.add('active');
    });
  }

  function loadProfile() {
    const p = readJSON(PROFILE_KEY);
    const name = p.name || 'User';
    const nameEl = document.querySelector('[data-profile-name]');
    const avatarEl = document.querySelector('[data-profile-avatar]');
    const fallback = document.querySelector('[data-avatar-fallback]');
    if (nameEl) nameEl.textContent = name;
    if (fallback) fallback.textContent = name.charAt(0).toUpperCase();
    if (avatarEl) {
      if (p.photo) {
        avatarEl.src = p.photo;
        avatarEl.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
      } else {
        avatarEl.style.display = 'none';
        if (fallback) fallback.style.display = '';
      }
    }
  }

  function initProfileChip() {
    document.querySelectorAll('[data-profile-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.location.href = 'profile.html';
      });
    });
  }

  function initProfileModal() {
    const modal = document.getElementById('profile-modal');
    const form = document.getElementById('profile-form');
    const nameInput = document.getElementById('profile-name-input');
    if (!modal || !form) return;
    if (!readJSON(PROFILE_KEY).name) modal.removeAttribute('hidden');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) return;
      const existing = readJSON(PROFILE_KEY);
      existing.name = name;
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(existing)); } catch (err) {}
      modal.setAttribute('hidden', '');
      loadProfile();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.lucide) lucide.createIcons();
    initTheme();
    initSidebar();
    initActiveNav();
    loadProfile();
    initProfileChip();
    initProfileModal();
    if (typeof window.initOnboarding === 'function') window.initOnboarding();
  });
})();
