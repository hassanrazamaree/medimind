// layout.js — Shared app shell: sidebar, topbar, bottom nav, profile modal.
// Prototype-styled (v6). Loaded (deferred) BEFORE app.js on every page.

(function () {
  'use strict';

  const NAV = [
    { href: 'dashboard.html',    label: 'Dashboard',      icon: 'layout-dashboard' },
    { href: 'chat.html',         label: 'AI Chat',        icon: 'message-circle' },
    { href: 'tracker.html',      label: 'Health Tracker', icon: 'activity' },
    { href: 'blood.html',        label: 'Blood Analyzer', icon: 'droplet' },
    { href: 'diet.html',         label: 'Diet & Water',   icon: 'salad' },
    { href: 'medications.html',  label: 'Medications',    icon: 'pill' },
    { href: 'appointments.html', label: 'Appointments',   icon: 'calendar-days' },
    { href: 'records.html',      label: 'Health Records', icon: 'folder-open' },
    { href: 'emergency.html',    label: 'Emergency SOS',  icon: 'siren' },
    { href: 'profile.html',      label: 'Profile',        icon: 'user' }
  ];

  const BOTTOM_NAV = [
    { href: 'dashboard.html',   label: 'Home',      icon: 'home' },
    { href: 'chat.html',        label: 'AI Chat',   icon: 'message-circle' },
    { href: 'tracker.html',     label: 'Tracker',   icon: 'activity' },
    { href: 'medications.html', label: 'Medicines', icon: 'pill' },
    { href: 'profile.html',     label: 'Profile',   icon: 'user' }
  ];

  const TITLES = {
    dashboard: 'Dashboard', chat: 'AI Chat', tracker: 'Health Tracker',
    blood: 'Blood Analyzer', diet: 'Diet & Water', medications: 'Medications',
    appointments: 'Appointments', records: 'Health Records',
    emergency: 'Emergency SOS', profile: 'Profile'
  };

  const links = NAV.map(function (n) {
    return '<a class="navlink" href="' + n.href + '">' +
      '<i data-lucide="' + n.icon + '" aria-hidden="true"></i>' +
      '<span>' + n.label + '</span></a>';
  }).join('');

  const bottomLinks = BOTTOM_NAV.map(function (n) {
    return '<a class="bn-item" href="' + n.href + '">' +
      '<i data-lucide="' + n.icon + '" aria-hidden="true"></i>' +
      '<span>' + n.label + '</span></a>';
  }).join('');

  const page = (document.body && document.body.dataset && document.body.dataset.page) || '';
  const title = TITLES[page] || 'MediMind';

  const shell =
    '<aside class="sidebar">' +
      '<div class="sidebar-brand">' +
        '<div class="brand-mark"><i data-lucide="heart-pulse" aria-hidden="true"></i></div>' +
        '<span class="brand-name">MediMind</span>' +
      '</div>' +
      '<nav class="stack" style="gap:2px" aria-label="Main navigation">' + links + '</nav>' +
      '<div class="sidebar-footer"><span class="caption">MediMind · AI Health Companion</span></div>' +
    '</aside>' +
    '<div class="sidebar-overlay"></div>' +
    '<header class="topbar">' +
      '<div class="topbar-left">' +
        '<button class="hamburger" data-sidebar-toggle aria-label="Open menu">' +
          '<i data-lucide="menu" aria-hidden="true"></i>' +
        '</button>' +
        '<span class="topbar-title">' + title + '</span>' +
      '</div>' +
      '<div class="row" style="gap:12px">' +
        '<button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode">' +
          '<i data-lucide="moon" aria-hidden="true"></i>' +
        '</button>' +
        '<button class="profile-chip" data-profile-open aria-label="Open profile">' +
          '<span class="avatar"><span data-avatar-fallback>U</span>' +
          '<img data-profile-avatar alt="User profile" style="display:none"></span>' +
          '<span data-profile-name>User</span>' +
        '</button>' +
      '</div>' +
    '</header>' +
    '<nav class="bottomnav" aria-label="Mobile navigation"><div class="bottomnav-inner">' +
      bottomLinks +
    '</div></nav>';

  const modal =
    '<div class="profile-modal" id="profile-modal" hidden role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">' +
      '<form id="profile-form" class="profile-modal__card">' +
        '<h2 id="profile-modal-title">Welcome to MediMind</h2>' +
        '<p class="muted">What should we call you?</p>' +
        '<label for="profile-name-input">Your Name</label>' +
        '<input id="profile-name-input" class="input" placeholder="Enter your name" required autocomplete="name">' +
        '<button class="btn btn-primary btn-block" style="margin-top:16px">Get Started</button>' +
      '</form>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', shell);
  document.body.insertAdjacentHTML('beforeend', modal);
})();
