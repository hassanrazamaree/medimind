(function(){
  'use strict';

  const KEY = 'medi_appointments';
  let editId = null;

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function save(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }
  function fmtDate(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  }

  function card(appt, isUpcoming) {
    var div = document.createElement('div');
    div.className = 'simple-card item-card' + (isUpcoming ? '' : ' card-faded');
    var body = document.createElement('div');
    body.className = 'item-card-body';
    var h3 = document.createElement('h3');
    h3.textContent = appt.doctorName;
    h3.style.fontSize = '0.95rem';
    h3.style.marginBottom = '4px';
    var sp = document.createElement('span');
    sp.className = 'badge badge-purple';
    sp.textContent = appt.specialty;
    var meta1 = document.createElement('div');
    meta1.className = 'item-card-meta';
    meta1.textContent = '🗓 ' + fmtDate(appt.date) + '  ⏰ ' + appt.time;
    var meta2 = document.createElement('div');
    meta2.className = 'item-card-meta';
    meta2.textContent = appt.reason ? ('Reason: ' + appt.reason) : 'No reason provided';
    body.appendChild(h3);
    body.appendChild(sp);
    body.appendChild(meta1);
    body.appendChild(meta2);
    div.appendChild(body);
    if (isUpcoming) {
      var actions = document.createElement('div');
      actions.className = 'item-actions';
      var res = document.createElement('button');
      res.type = 'button';
      res.className = 'btn btn-soft';
      res.textContent = 'Reschedule';
      res.dataset.id = appt.id;
      res.dataset.action = 'reschedule';
      var can = document.createElement('button');
      can.type = 'button';
      can.className = 'btn btn-danger';
      can.textContent = 'Cancel';
      can.dataset.id = appt.id;
      can.dataset.action = 'cancel';
      actions.appendChild(res);
      actions.appendChild(can);
      div.appendChild(actions);
    }
    return div;
  }

  function render() {
    var arr = all();
    var today = todayStr();
    var upcoming = arr.filter(function(a){ return a.date >= today; });
    var past = arr.filter(function(a){ return a.date < today; });
    upcoming.sort(function(a,b){ return a.date > b.date ? 1 : a.date < b.date ? -1 : a.time > b.time ? 1 : -1; });
    past.sort(function(a,b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : a.time < b.time ? 1 : -1; });
    var ul = document.getElementById('upcoming-list');
    if (ul) {
      ul.replaceChildren();
      if (upcoming.length === 0) {
        ul.innerHTML = '<div class="empty-state"><p>No upcoming appointments. Book one!</p></div>';
      } else {
        upcoming.forEach(function(a){ ul.appendChild(card(a, true)); });
      }
    }
    var pl = document.getElementById('past-list');
    if (pl) {
      pl.replaceChildren();
      if (past.length === 0) {
        pl.innerHTML = '<div class="empty-state"><p>No past appointments yet.</p></div>';
      } else {
        past.forEach(function(a){ pl.appendChild(card(a, false)); });
      }
    }
  }

  function cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    var arr = all().filter(function(a){ return a.id !== id; });
    save(arr);
    render();
  }

  function reschedule(id) {
    var arr = all();
    var appt = arr.find(function(a){ return a.id === id; });
    if (!appt) return;
    editId = id;
    document.getElementById('doctor-input').value = appt.doctorName;
    document.getElementById('specialty-input').value = appt.specialty;
    document.getElementById('date-input').value = appt.date;
    document.getElementById('time-input').value = appt.time;
    document.getElementById('reason-input').value = appt.reason || '';
    document.getElementById('date-input').min = todayStr();
    var btn = document.querySelector('#book-form button[type="submit"]');
    if (btn) btn.textContent = 'Update Appointment';
    document.getElementById('book-form').scrollIntoView({behavior:'smooth'});
  }

    function resetForm() {
    editId = null;
    document.getElementById('book-form').reset();
    var btn = document.querySelector('#book-form button[type="submit"]');
    if (btn) btn.textContent = 'Book Appointment';
  }

  document.addEventListener('DOMContentLoaded', function() {
    var dateInput = document.getElementById('date-input');
    if (dateInput) dateInput.min = todayStr();

    var form = document.getElementById('book-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var doctorName = document.getElementById('doctor-input').value.trim();
        var specialty = document.getElementById('specialty-input').value;
        var date = document.getElementById('date-input').value;
        var time = document.getElementById('time-input').value;
        var reason = document.getElementById('reason-input').value.trim();

        if (!doctorName || !specialty || !date || !time) {
          alert('Please fill in all required fields.');
          return;
        }

        var arr = all();
        if (editId) {
          var idx = arr.findIndex(function(a){ return a.id === editId; });
          if (idx >= 0) {
            arr[idx].doctorName = doctorName;
            arr[idx].specialty = specialty;
            arr[idx].date = date;
            arr[idx].time = time;
            arr[idx].reason = reason;
          }
          save(arr);
        } else {
          arr.push({
            id: Date.now().toString(),
            doctorName: doctorName,
            specialty: specialty,
            date: date,
            time: time,
            reason: reason,
            status: 'upcoming'
          });
          save(arr);
        }

        resetForm();
        render();
      });
    }

    document.getElementById('upcoming-list')?.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      var id = btn.dataset.id;
      if (action === 'cancel') cancel(id);
      else if (action === 'reschedule') reschedule(id);
    });

    render();
  });
}());
