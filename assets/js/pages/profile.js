(function(){
  'use strict';

  const PROFILE_KEY = 'medi_profile';
  const SETTINGS_KEY = 'medi_settings';
  const ALL_KEYS = [
    'medi_profile','medi_chat_history','medi_health_stats',
    'medi_diet_log','medi_blood_reports','medi_tracker',
    'medi_appointments','medi_medications','medi_med_log',
    'medi_records','medi_settings','medi_demo_seeded','medi_onboarding_done'
  ];

  function readProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {}; } catch { return {}; }
  }
  function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
  function updateName(name) {
    const el = document.querySelector('[data-profile-name]');
    if (el) el.textContent = name || 'User';
  }

  function toastStack() {
    let s = document.getElementById('toast-stack');
    if (!s) {
      s = document.createElement('div');
      s.id = 'toast-stack';
      s.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;display:flex;flex-direction:column;gap:8px';
      document.body.appendChild(s);
    }
    return s;
  }
  function showToast(msg, type) {
    const stack = toastStack();
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'success');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function renderPhoto(profile) {
    const img = document.getElementById('profile-photo');
    const ph  = document.getElementById('profile-photo-placeholder');
    if (profile.photo) {
      img.src = profile.photo;
      img.style.display = 'block';
      ph.style.display = 'none';
    } else {
      img.style.display = 'none';
      ph.style.display = 'flex';
      ph.textContent = (profile.name || 'U').trim().charAt(0).toUpperCase() || '\uDB80\uDC78';
    }
    }

  function syncTopbarAvatar(profile) {
    const avatar = document.querySelector('[data-profile-avatar]');
    if (!avatar) return;
    if (profile.photo) {
      avatar.src = profile.photo;
      avatar.alt = profile.name ? profile.name + "'s profile" : 'User profile';
    }
  }

  function loadProfile() {
    const p = readProfile();
    const id = (id, fallback = '') => { const el = document.getElementById(id); if (el) el.value = p[id] || fallback; };
    id('name-input');
    id('phone-input');
    if (p.dob) { const el = document.getElementById('dob-input'); if (el) el.value = p.dob; }
    id('blood-input');
    id('gender-input');
    id('height-input');
    id('weight-input');
    if (p.allergies) { const el = document.getElementById('allergies-input'); if (el) el.value = p.allergies; }
    if (p.conditions) { const el = document.getElementById('conditions-input'); if (el) el.value = p.conditions; }
    if (p.currentMedications) { const el = document.getElementById('current-med-input'); if (el) el.value = p.currentMedications; }
    renderPhoto(p);
  }

  function saveProfileData() {
    const p = readProfile();
    const n = document.getElementById('name-input'); p.name = n ? n.value.trim() : p.name;
    const ph = document.getElementById('phone-input'); p.phone = ph ? ph.value.trim() : p.phone;
    const d = document.getElementById('dob-input'); p.dob = d && d.value ? d.value : null;
    const b = document.getElementById('blood-input'); p.bloodGroup = b ? b.value : p.bloodGroup;
    const g = document.getElementById('gender-input'); p.gender = g ? g.value : p.gender;
    saveProfile(p);
    updateName(p.name);
    syncTopbarAvatar(p);
    showToast('Profile saved!', 'success');
  }

  function saveHealthData() {
    const p = readProfile();
    const h = document.getElementById('height-input'); p.height = h && h.value ? Number(h.value) : null;
    const w = document.getElementById('weight-input'); p.weight = w && w.value ? Number(w.value) : null;
    const a = document.getElementById('allergies-input'); p.allergies = a ? a.value.trim() : p.allergies;
    const c = document.getElementById('conditions-input'); p.conditions = c ? c.value.trim() : p.conditions;
    const m = document.getElementById('current-med-input'); p.currentMedications = m ? m.value.trim() : p.currentMedications;
    saveProfile(p);
    showToast('Health information saved!', 'success');
  }

  function clearAllData() {
    if (!confirm('\u26A0\uFE0F This will permanently delete ALL your health data across every MediMind page. This cannot be undone. Continue?')) return;
    ALL_KEYS.forEach(k => localStorage.removeItem(k));
    showToast('All data has been cleared.', 'success');
        setTimeout(() => location.href = 'profile.html', 1200);
  }

  // ---- first-visit modal enhancement (adds photo upload) ----
  function enhanceFirstVisitModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    const form = modal.querySelector('form');
    if (!form || form.querySelector('#fv-photo-btn')) return;

    let fvPhoto = null;
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.id = 'fv-photo-input';
    photoInput.accept = 'image/*';
    photoInput.hidden = true;

    const photoBtn = document.createElement('button');
    photoBtn.type = 'button';
    photoBtn.id = 'fv-photo-btn';
    photoBtn.className = 'btn btn-soft';
    photoBtn.textContent = 'Add Photo';

    photoBtn.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) { fvPhoto = ev.target.result; };
      reader.readAsDataURL(file);
    });

    const submitBtn = form.querySelector('button[type="submit"], button.btn-primary');
    if (submitBtn) {
      form.insertBefore(photoInput, submitBtn);
      form.insertBefore(photoBtn, submitBtn);
    }

    // Runs after app.js handler — app.js already saved {name} & hid modal
    form.addEventListener('submit', function() {
      if (fvPhoto) {
        const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        p.photo = fvPhoto;
        localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
        const avatar = document.querySelector('[data-profile-avatar]');
        if (avatar) avatar.src = fvPhoto;
        renderPhoto(p);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    enhanceFirstVisitModal();

    // Profile page photo upload
    var photoInput = document.getElementById('photo-input');
    var photoImg  = document.getElementById('profile-photo');
    var photoPh   = document.getElementById('profile-photo-placeholder');
    var photoLbl  = document.getElementById('profile-photo-label');

    if (photoInput) {
      photoInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var url = ev.target.result;
          var p = readProfile();
          p.photo = url;
          saveProfile(p);
          photoImg.src = url;
          photoImg.style.display = 'block';
          photoPh.style.display = 'none';
          syncTopbarAvatar(p);
          showToast('Profile photo updated!', 'success');
        };
        reader.readAsDataURL(file);
      });
      if (photoImg)  photoImg.addEventListener('click', function() { photoInput.click(); });
      if (photoPh)   photoPh.addEventListener('click',  function() { photoInput.click(); });
      if (photoLbl)  photoLbl.addEventListener('click', function() { photoInput.click(); });
    }

    var saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      saveProfileData();
    });

    var saveHealthBtn = document.getElementById('save-health');
    if (saveHealthBtn) saveHealthBtn.addEventListener('click', function(e) {
      e.preventDefault();
      saveHealthData();
    });

    var clearBtn = document.getElementById('clear-data');
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);
    var replayBtn = document.getElementById('replay-tutorial');
    if (replayBtn) replayBtn.addEventListener('click', function() {
      if (typeof window.replayOnboarding === 'function') window.replayOnboarding();
    });
    var installBtn = document.getElementById('install-app');
    if (installBtn) installBtn.addEventListener('click', function() {
      if (typeof window.installMediMind === 'function') window.installMediMind();
    });
  });
}());
