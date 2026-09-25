(function(){
  'use strict';

  const KEY = 'medi_records';
  const CATEGORIES = {
    lab:        { label: 'Lab Reports',     color: 'badge-blue' },
    prescription: { label: 'Prescriptions', color: 'badge-green' },
    vaccination: { label: 'Vaccinations',   color: 'badge-purple' },
    imaging:    { label: 'Imaging',         color: 'badge-orange' },
    notes:      { label: 'Doctor Notes',    color: 'badge-gray' }
  };

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function save(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }

  function readFileAsBase64(file, cb) {
    var reader = new FileReader();
    reader.onload = function() { cb(reader.result); };
    reader.readAsDataURL(file);
  }

  function isImage(dataUrl) {
    return dataUrl && dataUrl.startsWith('data:image/');
  }
  function isPdf(dataUrl) {
    return dataUrl && dataUrl.startsWith('data:application/pdf');
  }

  function catBadge(category) {
    var c = CATEGORIES[category] || CATEGORIES.notes;
    return '<span class="badge ' + c.color + '">' + c.label + '</span>';
  }

        function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    return dt.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }

  function recordCard(r) {
    var div = document.createElement('div');
    div.className = 'simple-card item-card';
    div.dataset.id = r.id;

    var head = document.createElement('div');
    head.className = 'item-card-head';
    var body = document.createElement('div');
    body.className = 'item-card-body';
    var h3 = document.createElement('h3');
    h3.textContent = r.title;
    h3.style.fontSize = '0.95rem'; h3.style.marginBottom = '4px';
    body.appendChild(h3);

    var badge = document.createElement('span');
    badge.className = 'badge ' + (CATEGORIES[r.category] ? CATEGORIES[r.category].color : 'badge-gray');
    badge.textContent = CATEGORIES[r.category] ? CATEGORIES[r.category].label : r.category;
    body.appendChild(badge);

    var d1 = document.createElement('div'); d1.className = 'item-card-meta';
    d1.textContent = fmtDate(r.date);
    body.appendChild(d1);

    if (r.notes) {
      var d2 = document.createElement('div'); d2.className = 'item-card-meta';
      var preview = r.notes.length > 80 ? r.notes.substring(0, 80) + '…' : r.notes;
      d2.textContent = preview;
      body.appendChild(d2);
    }
    if (r.fileName) {
      var d3 = document.createElement('div'); d3.className = 'item-card-meta';
      d3.textContent = '📎 ' + r.fileName;
      body.appendChild(d3);
    }

    head.appendChild(body);
    var actions = document.createElement('div'); actions.className = 'item-actions';
    var vb = document.createElement('button'); vb.type = 'button';
    vb.className = 'btn btn-soft'; vb.textContent = 'View';
    vb.dataset.id = r.id; vb.dataset.action = 'view';
    var db = document.createElement('button'); db.type = 'button';
    db.className = 'btn btn-danger'; db.textContent = 'Delete';
    db.dataset.id = r.id; db.dataset.action = 'delete';
    actions.appendChild(vb); actions.appendChild(db);
    head.appendChild(actions);
    div.appendChild(head);
    return div;
  }

  function render() {
    var arr = all();
    // Sort by date newest first
    arr.sort(function(a, b) { return b.date > a.date ? 1 : b.date < a.date ? -1 : 0; });

    var activeCat = document.querySelector('.filter-tab.active')?.dataset.category || 'all';
    var searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

    // Filter by category
    if (activeCat !== 'all') {
      arr = arr.filter(function(r) { return r.category === activeCat; });
    }
    // Filter by search
    if (searchTerm) {
      arr = arr.filter(function(r) {
        return (r.title || '').toLowerCase().includes(searchTerm) ||
               (r.notes || '').toLowerCase().includes(searchTerm);
      });
    }

    var count = document.getElementById('records-count');
    if (count) count.textContent = arr.length + ' record(s)';

    var list = document.getElementById('records-list');
    if (list) {
      list.replaceChildren();
      if (arr.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No health records found.</p></div>';
      } else {
        var frag = document.createDocumentFragment();
        arr.forEach(function(r) { frag.appendChild(recordCard(r)); });
                list.appendChild(frag);
      }
    }
  }

  function viewRecord(r) {
    var modal = document.getElementById('record-modal-backdrop');
    var content = document.getElementById('record-modal-content');
    if (!modal || !content) return;
    content.replaceChildren();
    var title = document.createElement('h3');
    title.textContent = r.title;
    title.style.marginBottom = '12px';
    content.appendChild(title);
    var badge = document.createElement('span');
    badge.className = 'badge ' + (CATEGORIES[r.category] ? CATEGORIES[r.category].color : 'badge-gray');
    badge.textContent = CATEGORIES[r.category] ? CATEGORIES[r.category].label : r.category;
    content.appendChild(badge);
    content.appendChild(document.createElement('br')); content.appendChild(document.createElement('br'));
    var dl = document.createElement('div');
    dl.className = 'item-card-meta';
    dl.textContent = '📅 ' + fmtDate(r.date);
    content.appendChild(dl);
    if (r.notes) {
      var p = document.createElement('p');
      p.style.margin = '8px 0';
      p.textContent = r.notes;
      content.appendChild(p);
    }
    if (r.fileData) {
      if (isImage(r.fileData)) {
        var img = document.createElement('img');
        img.src = r.fileData;
        img.alt = r.fileName || 'Record image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = 'var(--radius)';
        img.style.marginTop = '12px';
        content.appendChild(img);
      } else if (isPdf(r.fileData)) {
        var pa = document.createElement('a');
        pa.href = r.fileData;
        pa.download = r.fileName || 'record.pdf';
        pa.style.display = 'inline-flex';
        pa.style.alignItems = 'center';
        pa.style.gap = '8px';
        pa.style.padding = '12px 20px';
        pa.style.background = 'var(--bg-2)';
        pa.style.border = '1px solid var(--border)';
        pa.style.borderRadius = 'var(--radius)';
        pa.style.color = 'var(--text)';
        pa.innerHTML = '📄 ' + (r.fileName || 'Download PDF');
        content.appendChild(pa);
      }
    }
    modal.classList.remove('hidden');
  }

  function closeModal() {
    var m = document.getElementById('record-modal-backdrop');
    if (m) m.classList.add('hidden');
  }

  function deleteRecord(id) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    var arr = all().filter(function(r){ return r.id !== id; });
        save(arr);
    render();
  }

  document.addEventListener('DOMContentLoaded', function() {
    var today = new Date().toISOString().split('T')[0];
    var dateInput = document.getElementById('record-date');
    if (dateInput) dateInput.value = today;

    // File preview
    var fileInput = document.getElementById('record-file');
    var preview = document.getElementById('file-preview');
    if (fileInput && preview) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        preview.replaceChildren();
        if (!file) return;
        if (file.type.startsWith('image/')) {
          readFileAsBase64(file, function(url) {
            var img = document.createElement('img');
            img.src = url;
            img.alt = 'Preview';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '120px';
            img.style.borderRadius = 'var(--radius)';
            img.style.marginTop = '8px';
            preview.appendChild(img);
          });
        } else if (file.type === 'application/pdf') {
          var span = document.createElement('span');
          span.textContent = '📄 ' + file.name;
          span.style.fontSize = '0.85rem';
          span.style.color = 'var(--text-2)';
          preview.appendChild(span);
        }
      });
    }

    // Form submit — save record
    var form = document.getElementById('upload-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var title = document.getElementById('record-title').value.trim();
        var category = document.getElementById('record-category').value;
        var date = document.getElementById('record-date').value;
        var notes = document.getElementById('record-notes').value.trim();
        var file = fileInput ? fileInput.files[0] : null;

        if (!title || !category || !date) {
          alert('Please fill in all required fields.');
          return;
        }

        if (!file) {
          alert('Please select a file to upload.');
          return;
        }

        readFileAsBase64(file, function(dataUrl) {
          var rec = {
            id: Date.now().toString(),
            title: title,
            category: category,
            date: date,
            notes: notes,
            fileData: dataUrl,
            fileType: file.type,
            fileName: file.name
          };
          var arr = all();
          arr.push(rec);
          save(arr);
          form.reset();
          if (preview) preview.replaceChildren();
          dateInput.value = today;
          render();
        });
      });
    }

    // Search — real-time filter
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', render);
    }

    // Category filter tabs
    document.getElementById('category-tabs')?.addEventListener('click', function(e) {
      var tab = e.target.closest('.filter-tab');
      if (!tab) return;
      document.querySelectorAll('.filter-tab').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      render();
    });

    // Record list — view / delete
    document.getElementById('records-list')?.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var id = btn.dataset.id;
      var action = btn.dataset.action;
      if (action === 'view') {
        var arr = all();
        var rec = arr.find(function(r){ return r.id === id; });
        if (rec) viewRecord(rec);
      } else if (action === 'delete') {
        deleteRecord(id);
      }
    });

    // Modal close
    var modal = document.getElementById('record-modal-backdrop');
    var closeBtn = modal?.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });

    render();
  });
}());

