// demo-data.js — Seeds realistic sample data on first visit so every page
// looks alive for demos. Runs BEFORE app.js and page scripts (deferred order).
// It NEVER overwrites existing data: each key is filled only if empty/missing.
// Clearing data on the Profile page also clears the seed flag, so the demo
// data comes back fresh on next load.

(function () {
  'use strict';

  var SEED_FLAG = 'medi_demo_seeded';

  function dayOffset(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  function read(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) return v.length ? v : null;
      if (typeof v === 'object') return Object.keys(v).length ? v : null;
      return v;
    } catch (e) { return null; }
  }

  function seed(key, value) {
    if (read(key) !== null) return; // keep existing user data
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  if (localStorage.getItem(SEED_FLAG)) return;

  var today = dayOffset(0);

  // ---- Profile ----
  seed('medi_profile', {
    name: 'Ahmed Khan',
    phone: '+92 300 1234567',
    dob: '1998-05-14',
    bloodGroup: 'B+',
    gender: 'Male',
    height: 175,
    weight: 70,
    allergies: 'Peanuts',
    conditions: 'Iron deficiency anemia',
    currentMedications: 'Ferrous sulfate 200mg — twice daily'
  });

  // ---- Dashboard headline stats ----
  seed('medi_health_stats', { steps: 7842, heartRate: 72, sleep: 7.2 });

  // ---- Tracker: last 7 days ----
  var tracker = {};
  var stepsHist = [7842, 6230, 9150, 5480, 10230, 7310, 6890];
  var sleepHist = [7.2, 6.5, 7.8, 6.0, 8.1, 7.0, 7.4];
  for (var i = 6; i >= 0; i--) {
    tracker[dayOffset(-i)] = { steps: stepsHist[6 - i], sleep: sleepHist[6 - i] };
  }
  seed('medi_tracker', tracker);

  // ---- Diet: today + yesterday ----
  var diet = {};
  diet[today] = {
    water: 6,
    calories: 1450,
    meals: [
      { name: 'Oatmeal with banana & milk', calories: 380 },
      { name: 'Chicken biryani (1 plate)', calories: 650 },
      { name: 'Apple + handful of almonds', calories: 220 },
      { name: 'Daal + 2 roti', calories: 200 }
    ]
  };
  diet[dayOffset(-1)] = {
    water: 8,
    calories: 1980,
    meals: [
      { name: '2 Anda paratha + chai', calories: 520 },
      { name: 'Rajma chawal', calories: 610 },
      { name: 'Grilled chicken sandwich', calories: 450 },
      { name: '1 glass warm milk', calories: 200 },
      { name: 'Mixed fruit bowl', calories: 200 }
    ]
  };
  seed('medi_diet_log', diet);

  // ---- Blood reports: one low-Hb (anemia story), one older normal ----
  seed('medi_blood_reports', [
    {
      date: new Date(dayOffset(-2)).toLocaleDateString(),
      results: [
        { key: 'hemoglobin', value: 10.8, label: 'Hemoglobin', unit: 'g/dL', status: 'low', text: 'Low — Normal: 12–17 g/dL' },
        { key: 'sugar', value: 92, label: 'Blood Sugar (Fasting)', unit: 'mg/dL', status: 'normal', text: 'Normal — 70–100 mg/dL' }
      ]
    },
    {
      date: new Date(dayOffset(-90)).toLocaleDateString(),
      results: [
        { key: 'hemoglobin', value: 13.4, label: 'Hemoglobin', unit: 'g/dL', status: 'normal', text: 'Normal — 12–17 g/dL' },
        { key: 'sugar', value: 88, label: 'Blood Sugar (Fasting)', unit: 'mg/dL', status: 'normal', text: 'Normal — 70–100 mg/dL' }
      ]
    }
  ]);

  // ---- Medications: 2 active + 1 completed ----
  seed('medi_medications', [
    {
      id: 'demo-med-1', name: 'Ferrous sulfate', dosage: '200mg',
      frequency: 'Twice daily', times: ['09:00', '21:00'],
      startDate: dayOffset(-10), duration: 30, durationUnit: 'Days',
      notes: 'Take after meals with vitamin C', status: 'active'
    },
    {
      id: 'demo-med-2', name: 'Vitamin D3', dosage: '50000 IU',
      frequency: 'Weekly', times: ['10:00'],
      startDate: dayOffset(-5), duration: 8, durationUnit: 'Weeks',
      notes: 'Every Monday morning', status: 'active'
    },
    {
      id: 'demo-med-3', name: 'Paracetamol', dosage: '500mg',
      frequency: 'Three times daily', times: ['08:00', '14:00', '20:00'],
      startDate: dayOffset(-20), duration: 5, durationUnit: 'Days',
      notes: 'For fever — course finished', status: 'completed'
    }
  ]);
  seed('medi_med_log', [
    { date: today, medId: 'demo-med-1', status: 'taken' }
  ]);

  // ---- Appointments: 2 upcoming + 2 past ----
  seed('medi_appointments', [
    {
      id: 'demo-appt-1', doctorName: 'Dr. Ayesha Malik', specialty: 'General Physician',
      date: dayOffset(6), time: '11:30', reason: 'Follow-up for anemia — review latest CBC report'
    },
    {
      id: 'demo-appt-2', doctorName: 'Dr. Bilal Ahmed', specialty: 'Cardiologist',
      date: dayOffset(20), time: '17:00', reason: 'Routine heart checkup'
    },
    {
      id: 'demo-appt-3', doctorName: 'Dr. Ayesha Malik', specialty: 'General Physician',
      date: dayOffset(-30), time: '10:00', reason: 'General weakness and fatigue consultation'
    },
    {
      id: 'demo-appt-4', doctorName: 'Dr. Sana Tariq', specialty: 'Dermatologist',
      date: dayOffset(-65), time: '15:30', reason: 'Skin allergy consultation'
    }
  ]);

  // ---- Health records ----
  seed('medi_records', [
    {
      id: 'demo-rec-1', title: 'CBC Blood Test Report', category: 'lab',
      date: dayOffset(-2), notes: 'Hemoglobin low at 10.8 g/dL. Doctor advised iron supplements.',
      fileName: 'CBC_Report.pdf'
    },
    {
      id: 'demo-rec-2', title: 'Iron Supplement Prescription', category: 'prescription',
      date: dayOffset(-10), notes: 'Ferrous sulfate 200mg twice daily for 30 days.',
      fileName: 'Prescription.jpg'
    },
    {
      id: 'demo-rec-3', title: 'COVID-19 Vaccination Certificate', category: 'vaccination',
      date: dayOffset(-400), notes: 'Booster dose received at Civil Hospital.'
    }
  ]);

  // ---- Chat: a short sample conversation ----
  seed('medi_chat_history', [
    { role: 'user', content: 'I feel tired and weak all the time. What could be wrong?' },
    { role: 'assistant', content: '**Thakawat (fatigue)** ke common causes:\n- Neend ki kami (7-9 ghante chahiye)\n- Iron/B12 ki kami (anemia)\n- Dehydration\n\nAapka recent Hb 10.8 tha jo low hai — iron-rich diet (palak, dal, anda) aur doctor ki di hui supplements jari rakhein. Agar 2+ haftay se thakawat hai to follow-up visit zaroor karein.\n\n*Yeh sirf information hai — diagnosis ke liye doctor se milein.*' },
    { role: 'user', content: 'What foods are good for anemia?' },
    { role: 'assistant', content: '**Iron-rich foods:**\n- Palak, chukandar, dal, rajma\n- Anda, chicken, fish\n- Kishmish, khajoor, gud\n\n**Tip:** Vitamin C (nimbu, amla) ke saath iron zyada absorb hota hai. Chai/coffee khane ke foran baad na piyein.\n\n*Yeh sirf information hai — diagnosis ke liye doctor se milein.*' }
  ]);

  try { localStorage.setItem(SEED_FLAG, 'v1'); } catch (e) {}
})();
