# MediMind — AI Health Companion (web)

MediMind is a personal health companion web app with an AI health chatbot
(Groq LLM), symptom guidance, blood-report analyzer, diet & hydration log,
medication schedule, appointments, health records and an emergency SOS page.
All personal data is stored in the browser's `localStorage` — no database needed.

## Tech stack

- **Frontend:** plain HTML / CSS / JavaScript (no build step, no framework)
- **Charts:** Chart.js via CDN · **Icons:** Lucide via CDN · **Sanitizer:** DOMPurify via CDN
- **AI backend:** one Vercel serverless function (`api/chat.js`, Node) that proxies
  chat requests to the Groq API, so the API key never touches the browser
- **Storage:** `localStorage` keys prefixed with `medi_` (profile, chat, tracker, diet, meds, records, appointments…)

## Project structure

```
medimind/
├── index.html                  Landing page (entry point)
├── pages/                      One HTML file per screen
│   ├── chat.html               AI chat (voice input, read-aloud, demo mode)
│   ├── dashboard.html          Stats + Chart.js trends
│   ├── tracker.html            Steps / sleep logging
│   ├── blood.html              Hemoglobin & sugar reference-range checker
│   ├── diet.html               Water counter, calories, meal log
│   ├── medications.html        Medicine schedule + daily checklist
│   ├── appointments.html       Doctor appointment manager
│   ├── records.html            Health document organizer
│   ├── emergency.html          Emergency numbers + first-aid basics
│   └── profile.html            Profile, health info, settings
├── assets/
│   ├── css/style.css           Single design system (deduplicated)
│   └── js/
│       ├── core/
│       │   ├── layout.js       Injects shared sidebar/topbar/profile-modal
│       │   └── app.js          Theme, sidebar, active nav, profile
│       └── pages/              One JS module per page (chat.js, diet.js, …)
├── api/
│   └── chat.js                 Vercel serverless → Groq chat completions
├── vercel.json                 Vercel function config
├── .env.example                GROQ_API_KEY template (never commit the real key)
└── .gitignore
```

The sidebar, topbar and profile modal are **not** copy-pasted into every page —
`assets/js/core/layout.js` injects them once, so a nav change is a one-line edit.

## Demo data

On first visit, `assets/js/core/demo-data.js` seeds realistic sample data
(profile, 7 days of tracker history, diet log, blood reports, medications,
appointments, records, sample chat) so every page looks alive. It only fills
empty keys — it never overwrites your data. "Clear All Data" on the Profile
page also resets the demo seed.

## Run locally

No build needed. Serve the folder over HTTP (the chat page needs it for the API;
opening `pages/chat.html` directly as a file works in **demo mode**):

```bash
cd medimind
python -m http.server 8080
# open http://localhost:8080
```

## Deploy (Vercel — free)

1. Push this folder to a GitHub repo.
2. Import the repo in Vercel (no build command, output directory = project root).
3. Add environment variable `GROQ_API_KEY` = your Groq key.
4. Deploy. The chat page calls the relative endpoint `/api/chat`, which now works.

## Notes

- Demo mode: when the page is opened as a plain file (`file://`), the chat answers
  from a built-in offline knowledge base instead of calling the API.
- Emergency numbers on the SOS page (1122 / 115 / 15) are Pakistan-specific —
  change them for other regions.
- Medical disclaimer: the app gives general wellness information only. It does not
  diagnose, and it always advises consulting a qualified doctor.
