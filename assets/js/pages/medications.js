(function(){
  'use strict';

  const MED_KEY = 'medi_medications';
  const LOG_KEY = 'medi_med_log';
  let editId = null;

  function readMeds() {
    try { return JSON.parse(localStorage.getItem(MED_KEY) || '[]'); } catch { return []; }
  }
  function saveMeds(arr) { localStorage.setItem(MED_KEY, JSON.stringify(arr)); }
  function readLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  }
  function saveLog(arr) { localStorage.setItem(LOG_KEY, JSON.stringify(arr)); }

  function todayStr() { return new Date().toISOString().split('T')[0]; }

  function durationDays(med) {
    const d = med.duration, u = med.durationUnit;
    if (u === 'Weeks') return d * 7;
    if (u === 'Months') return d * 30;
    return d;
  }
  function endDate(med) {
    const s = new Date(med.startDate);
    return new Date(s.getTime() + durationDays(med) * 864e5);
  }
  function daysRemaining(med) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end = endDate(med); end.setHours(0,0,0,0);
    return Math.ceil((end - today) / 864e5);
  }
  function isCompleted(med) { return daysRemaining(med) <= 0; }
  function isDueToday(med) {
    const start = new Date(med.startDate); start.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return start <= today && !isCompleted(med);
  }

  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    let hr = parseInt(h), ampm = 'AM';
    if (hr >= 12) ampm = 'PM';
    if (hr > 12) hr -= 12;
    if (hr === 0) hr = 12;
    return hr + ':' + m + ' ' + ampm;
  }
  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
        return dt.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }

  // ---- Today's schedule ----
  function renderSchedule() {
    var today = todayStr();
    var dateEl = document.getElementById('schedule-date');
    if (dateEl) dateEl.textContent = '\uD83D\uDCC5 ' + new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'short', day:'numeric' });
    var meds = readMeds().filter(isDueToday);
    var log = readLog().filter(function(e){ return e.date === today; });
    var container = document.getElementById('schedule-list');
    if (!container) return;
    container.replaceChildren();
    if (meds.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No medications scheduled for today.</p></div>';
      return;
    }
    var frag = document.createDocumentFragment();
    meds.forEach(function(med) {
      med.times.forEach(function(t) {
        var item = document.createElement('div');
        item.className = 'schedule-item';
        var info = document.createElement('div');
        info.className = 'schedule-info';
        var nm = document.createElement('div'); nm.className = 'schedule-name'; nm.textContent = med.name;
        var ds = document.createElement('div'); ds.className = 'schedule-dose'; ds.textContent = med.dosage + ' \u2022 ' + med.frequency;
        info.appendChild(nm); info.appendChild(ds);
        var tm = document.createElement('div'); tm.className = 'schedule-time'; tm.textContent = '\u23F0 ' + fmtTime(t);
        var entry = log.find(function(e){ return e.medId === med.id; });
        var actions = document.createElement('div'); actions.className = 'schedule-actions';
        if (entry && entry.status === 'taken') {
          var b1 = document.createElement('span'); b1.className = 'badge badge-green'; b1.textContent = '\u2713 Taken';
          actions.appendChild(b1);
        } else if (entry && entry.status === 'skipped') {
          var b2 = document.createElement('span'); b2.className = 'badge badge-gray'; b2.textContent = '\u25CB Skipped';
          actions.appendChild(b2);
        } else {
          var tb = document.createElement('button'); tb.type = 'button';
          tb.className = 'btn btn-taken'; tb.textContent = 'Mark as Taken';
          tb.dataset.medid = med.id; tb.dataset.action = 'taken';
          var sb = document.createElement('button'); sb.type = 'button';
          sb.className = 'btn btn-skip'; sb.textContent = 'Skip';
          sb.dataset.medid = med.id; sb.dataset.action = 'skip';
          actions.appendChild(tb); actions.appendChild(sb);
        }
        item.appendChild(info); item.appendChild(tm); item.appendChild(actions);
        frag.appendChild(item);
      });
    });
        container.appendChild(frag);
  }

  // ---- Medication card ----
  function medCard(med) {
    var days = daysRemaining(med);
    var div = document.createElement('div');
    div.className = 'simple-card item-card';
    div.dataset.id = med.id;
    var head = document.createElement('div');
    head.className = 'item-card-head';
    var body = document.createElement('div');
    body.className = 'item-card-body';
    var h3 = document.createElement('h3');
    h3.textContent = med.name;
    h3.style.fontSize = '0.95rem'; h3.style.marginBottom = '4px';
    body.appendChild(h3);
    var meta1 = document.createElement('div'); meta1.className = 'item-card-meta';
    meta1.textContent = med.dosage + ' \u2022 ' + med.frequency; body.appendChild(meta1);
    var meta2 = document.createElement('div'); meta2.className = 'item-card-meta';
    meta2.textContent = 'Started: ' + fmtDate(med.startDate) + ' \u2022 ' + med.duration + ' ' + med.durationUnit.toLowerCase(); body.appendChild(meta2);

    if (days <= 0) {
      var cb = document.createElement('span'); cb.className = 'badge badge-gray'; cb.textContent = 'Course Complete';
      body.appendChild(cb);
    } else if (days <= 3) {
      var wb = document.createElement('span'); wb.className = 'badge badge-warning'; wb.textContent = 'Refill Soon';
      body.appendChild(wb);
    }

    var meta3 = document.createElement('div'); meta3.className = 'item-card-meta';
    meta3.textContent = days <= 0 ? 'Course complete' : (days + ' days remaining');
    body.appendChild(meta3);

    if (med.status === 'completed' || days <= 0) {
      med.status = 'completed';
    }
    head.appendChild(body);

    // Only show edit/delete for active meds
    if (days > 0) {
      var actions = document.createElement('div'); actions.className = 'item-actions';
      var eb = document.createElement('button'); eb.type = 'button';
      eb.className = 'btn btn-soft'; eb.textContent = 'Edit';
      eb.dataset.id = med.id; eb.dataset.action = 'edit';
      var db = document.createElement('button'); db.type = 'button';
      db.className = 'btn btn-danger'; db.textContent = 'Delete';
      db.dataset.id = med.id; db.dataset.action = 'delete';
      actions.appendChild(eb); actions.appendChild(db);
      head.appendChild(actions);
    }
        div.appendChild(head);
    return div;
  }

  function renderMeds() {
    var arr = readMeds();
    arr.forEach(function(med) {
      if (med.status !== 'completed' && isCompleted(med)) {
        med.status = 'completed';
      }
    });
    saveMeds(arr);

    var active = arr.filter(function(m){ return m.status !== 'completed'; });
    var completed = arr.filter(function(m){ return m.status === 'completed'; });

    var ml = document.getElementById('med-list');
    if (ml) {
      ml.replaceChildren();
      if (active.length === 0) {
        ml.innerHTML = '<div class="empty-state"><p>You haven\'t added any medications yet.</p></div>';
      } else {
        active.forEach(function(m){ ml.appendChild(medCard(m)); });
      }
    }

    var hl = document.getElementById('history-list');
    if (hl) {
      hl.replaceChildren();
      if (completed.length > 0) {
        var title = document.createElement('h3');
        title.textContent = 'Medication History';
        title.style.fontSize = '0.9rem';
        title.style.color = 'var(--text)';
        title.style.marginBottom = '8px';
        hl.appendChild(title);
        var list = document.createElement('div');
        list.className = 'item-list';
        completed.forEach(function(m){ list.appendChild(medCard(m)); });
        hl.appendChild(list);
      }
    }
  }

  function getTimes() {
    var inputs = document.querySelectorAll('#times-container input[type="time"]');
    return Array.from(inputs).map(function(i){ return i.value; }).filter(function(v){ return v; });
  }

  function clearTimes() {
    var container = document.getElementById('times-container');
    if (container) {
      container.replaceChildren();
      var first = document.createElement('input');
      first.type = 'time';
      first.className = 'form-control time-input';
      first.required = true;
      container.appendChild(first);
    }
  }

  function populateForm(med) {
    editId = med.id;
    document.getElementById('med-name').value = med.name;
    document.getElementById('dosage').value = med.dosage;
    document.getElementById('frequency').value = med.frequency;
    document.getElementById('start-date').value = med.startDate;
    document.getElementById('duration').value = med.duration;
    document.getElementById('duration-unit').value = med.durationUnit;
    document.getElementById('med-notes').value = med.notes || '';
    clearTimes();
    med.times.forEach(function(t, i) {
      var inputs = document.querySelectorAll('#times-container input[type="time"]');
      var last = inputs[inputs.length - 1];
      if (i === 0) {
        if (last) last.value = t;
      } else {
        var inp = document.createElement('input');
        inp.type = 'time';
        inp.className = 'form-control time-input';
        inp.style.marginTop = '8px';
        inp.value = t;
        document.getElementById('times-container').appendChild(inp);
      }
    });
    var btn = document.getElementById('med-submit');
    if (btn) btn.textContent = 'Update Medication';
  }

    function resetForm() {
    editId = null;
    document.getElementById('med-form').reset();
    clearTimes();
    var btn = document.getElementById('med-submit');
    if (btn) btn.textContent = 'Add Medication';
  }

  function logTaken(medId, status) {
    var today = todayStr();
    var arr = readLog();
    arr = arr.filter(function(e){ return !(e.date === today && e.medId === medId); });
    arr.push({ date: today, medId: medId, status: status });
    saveLog(arr);
    renderSchedule();
  }

  function deleteMed(id) {
    if (!confirm('Delete this medication?')) return;
    var arr = readMeds().filter(function(m){ return m.id !== id; });
    saveMeds(arr);
    renderMeds();
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Add time button
    var addTimeBtn = document.getElementById('add-time');
    if (addTimeBtn) addTimeBtn.addEventListener('click', function() {
      var inp = document.createElement('input');
      inp.type = 'time'; inp.className = 'form-control time-input';
      inp.style.marginTop = '8px';
      document.getElementById('times-container').appendChild(inp);
    });

    // Date min
    var startDateInput = document.getElementById('start-date');
    if (startDateInput) startDateInput.min = todayStr();

    // Form submit
    var form = document.getElementById('med-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('med-name').value.trim();
        var dosage = document.getElementById('dosage').value.trim();
        var frequency = document.getElementById('frequency').value;
        var times = getTimes();
        var startDate = document.getElementById('start-date').value;
        var duration = parseInt(document.getElementById('duration').value);
        var durationUnit = document.getElementById('duration-unit').value;
        var notes = document.getElementById('med-notes').value.trim();

        if (!name || !dosage || !frequency || times.length === 0 || !startDate || !duration) {
          alert('Please fill in all required fields.');
          return;
        }

        var data = {
          id: editId || Date.now().toString(),
          name: name, dosage: dosage, frequency: frequency,
          times: times, startDate: startDate,
          duration: duration, durationUnit: durationUnit,
          notes: notes, status: 'active'
        };

        var arr = readMeds();
        if (editId) {
          var idx = arr.findIndex(function(m){ return m.id === editId; });
          if (idx >= 0) arr[idx] = data;
        } else {
          arr.push(data);
        }
        saveMeds(arr);
        resetForm();
        renderMeds();
        renderSchedule();
      });
    }

    // Event delegation for schedule buttons (taken/skip)
    document.getElementById('schedule-list')?.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var medId = btn.dataset.medid;
      var action = btn.dataset.action;
      if (action === 'taken') logTaken(medId, 'taken');
      else if (action === 'skip') logTaken(medId, 'skipped');
    });

    // Event delegation for med list (edit/delete)
    document.getElementById('med-list')?.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var id = btn.dataset.id;
      var action = btn.dataset.action;
      if (action === 'edit') {
        var arr = readMeds();
        var med = arr.find(function(m){ return m.id === id; });
        if (med) populateForm(med);
        document.getElementById('med-form').scrollIntoView({behavior:'smooth'});
      } else if (action === 'delete') {
        deleteMed(id);
      }
    });

    // Date min for start date
    renderSchedule();
    renderMeds();
  });
}());

