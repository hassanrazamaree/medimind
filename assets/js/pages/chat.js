const ICONS = {
    stethoscope: `<svg class="lucide lucide-stethoscope" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>`,
    user: `<svg class="lucide lucide-user" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

const CONFIG = {
    ENDPOINT: '/api/chat',
    MODEL: 'openai/gpt-oss-20b',
    MAX_TOKENS: 600,
    TEMPERATURE: 0.6,
    MAX_HISTORY: 20,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1500,
    DEMO_MODE: window.location.protocol === 'file:' // demo answers when opened as a plain file
};

const SYSTEM_PROMPT = `You are "MediMind" — a professional, friendly AI health companion.

CORE RESPONSIBILITIES:
• Help users understand their symptoms clearly
• Provide general health advice, diet tips, and lifestyle recommendations
• Specialize in blood-related conditions, especially Anemia (iron deficiency, B12 deficiency, thalassemia awareness)
• Guide users on when to urgently see a doctor

STRICT RESTRICTIONS (MANDATORY):
• You MUST ONLY answer questions related to health, medicine, fitness, diet, and human biology.
• If a user asks about ANY non-medical topic, you MUST politely refuse to answer.
• NEVER bypass this rule.

RESPONSE STYLE:
• Keep answers SHORT (3-6 sentences max unless detail is needed)
• Use bullet points and bold for key info
• Be warm, empathetic, and reassuring
• Use simple language anyone can understand
• If user writes in Roman Urdu or Urdu, reply in the same language
• If user writes in English, reply in English

SAFETY RULES:
• NEVER diagnose — only suggest possibilities
• NEVER prescribe specific medications or dosages
• Always end with a short disclaimer reminding to consult a real doctor
• For emergencies (chest pain, breathing difficulty, severe bleeding, stroke symptoms), IMMEDIATELY advise calling emergency services

FORMAT: Use markdown formatting — **bold**, bullet points, numbered lists where helpful.`;

const EMERGENCY_KEYWORDS = ['chest pain', 'heart attack', 'cant breathe', "can't breathe", 'stroke', 'seizure', 'unconscious', 'suicide', 'overdose', 'severe bleeding', 'choking', 'anaphylaxis', 'not breathing', 'saans nahi', 'dil ka dard', 'behosh', 'zehar'];
// 'khoon' alone is too broad (e.g. "khoon ki kami" = anemia, not an emergency) — only bleeding phrases count
const EMERGENCY_PHRASES = ['khoon beh', 'khoon nikal', 'khoon zaya', 'khoon zaaya', 'bleeding', 'blood loss'];

const toastEl = document.getElementById('toast');
let conversation = [{ role: 'system', content: SYSTEM_PROMPT }];
let isProcessing = false;
let recognition = null;
let isRecording = false;
let finalTranscript = '';
let toastTimeout;
let lastBotReply = '';
let isSpeaking = false;

// Theme is handled by assets/js/core/app.js

function showToast(message, iconKey = 'check') {
    if (!toastEl) return;
    toastEl.innerHTML = `<i data-lucide="${iconKey}" aria-hidden="true"></i><span>${escapeHTML(message)}</span>`;
    if (window.lucide) window.lucide.createIcons();
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeHTML(html) {
    if (window.DOMPurify) {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre', 'a', 'span', 'div'],
            ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
        });
    }
    // Fallback: strip script/style/iframe tags but keep safe formatting tags
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<iframe[^>]*>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*\S+/gi, '')
        .replace(/javascript\s*:/gi, '');
}

const MD_CODE_REGEX = /`(.+?)`/g;
const MD_H3_REGEX = /^### (.+)$/gm;
const MD_H2_REGEX = /^## (.+)$/gm;
const MD_H1_REGEX = /^# (.+)$/gm;
const MD_LIST_ITEM_REGEX = /^[-•*]\s/;
const MD_LIST_PREFIX_REGEX = /^[-•*]\s/;
const MD_BOLD_REGEX = /\*\*(.+?)\*\*/g;
const MD_ITALIC_REGEX = /\*(.+?)\*/g;

function renderMarkdown(text) {
    let html = escapeHTML(text);
    html = html.replace(MD_CODE_REGEX, '<code>$1</code>');
    html = html.replace(MD_H3_REGEX, '<h3>$1</h3>');
    html = html.replace(MD_H2_REGEX, '<h2>$1</h2>');
    html = html.replace(MD_H1_REGEX, '<h1>$1</h1>');
    const lines = html.split('\n');
    const result = [];
    let inList = false;

    for (const line of lines) {
        let trimmed = line.trim();
        let isListItem = false;
        if (MD_LIST_ITEM_REGEX.test(trimmed)) {
            isListItem = true;
            trimmed = trimmed.replace(MD_LIST_PREFIX_REGEX, '');
        }
        trimmed = trimmed.replace(MD_BOLD_REGEX, '<strong>$1</strong>');
        trimmed = trimmed.replace(MD_ITALIC_REGEX, '<em>$1</em>');

        if (isListItem) {
            if (!inList) { result.push('<ul>'); inList = true; }
            result.push('<li>' + trimmed + '</li>');
        } else {
            if (inList) { result.push('</ul>'); inList = false; }
            if (trimmed === '') result.push('<br>');
            else if (!trimmed.startsWith('<h')) result.push('<p>' + trimmed + '</p>');
            else result.push(trimmed);
        }
    }

    if (inList) result.push('</ul>');
    return sanitizeHTML(result.join(''));
}

function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    requestAnimationFrame(() => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    });
}

function checkEmergency(text) {
    const lower = text.toLowerCase();
    return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

function checkEmergency(text) {
    const lower = text.toLowerCase();
    if (EMERGENCY_PHRASES.some((p) => lower.includes(p))) return true;
    return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

const GREETING_REGEX = /\b(hello|hi|salam|salaam|assalam|aoa|namaste|hey|adaab|good morning|good evening)\b/i;
const THANKS_REGEX = /\b(thanks|thank you|shukriya|meherbani)\b/i;
// Short keywords matched on word boundaries to avoid false hits (e.g. "tb" inside "football")
const SHORT_HEALTH_KEYWORDS = ['bp', 'hb', 'tb'];

function isHealthRelatedQuery(text) {
    const lower = text.toLowerCase();
    if (GREETING_REGEX.test(lower) || THANKS_REGEX.test(lower)) return true;
    const healthKeywords = [
        // general
        'symptom', 'symptoms', 'pain', 'ache', 'aches', 'sore', 'hurt', 'hurts', 'cramp', 'cramps', 'spasm',
        'swelling', 'swollen', 'numb', 'numbness', 'tingling', 'itch', 'itching', 'itchy', 'rash', 'allergy', 'allergies',
        'wound', 'cut', 'burn', 'bruise', 'fracture', 'sprain', 'strain', 'bite', 'sting',
        // fever / infection
        'fever', 'temperature', 'chill', 'chills', 'shiver', 'sweat', 'sweating', 'flu', 'cold', 'cough', 'sneeze', 'sneezing',
        'phlegm', 'mucus', 'infection', 'virus', 'viral', 'bacteria', 'bacterial', 'germs', 'immunity', 'immune',
        // head / neuro
        'headache', 'migraine', 'dizzy', 'dizziness', 'faint', 'fainted', 'vertigo', 'seizure', 'coma', 'paralysis',
        // heart / blood
        'chest', 'heart', 'cardiac', 'pulse', 'palpitation', 'blood', 'pressure', 'hypertension', 'hypotension',
        'hemoglobin', 'ferritin', 'folate', 'anemia', 'anaemia', 'iron',
        // metabolic
        'sugar', 'diabetes', 'diabetic', 'glucose', 'insulin', 'cholesterol', 'thyroid', 'hormone',
        'kidney', 'liver', 'lung', 'lungs',
        // digestion
        'stomach', 'digestion', 'digestive', 'digest', 'acidity', 'acid', 'ulcer', 'gas', 'bloating', 'constipation',
        'diarrhea', 'diarrhoea', 'nausea', 'vomiting', 'vomit', 'piles', 'hemorrhoid', 'appetite', 'hunger', 'thirst',
        // weight / fitness
        'weight', 'obese', 'obesity', 'overweight', 'underweight', 'slim', 'calories', 'calorie', 'fat', 'fit',
        'fitness', 'exercise', 'workout', 'gym', 'yoga', 'walk', 'walking', 'jogging', 'running', 'sport', 'sports',
        // food / nutrition
        'diet', 'dieting', 'nutrition', 'nutritious', 'nutrient', 'nutrients', 'food', 'foods', 'meal', 'meals',
        'breakfast', 'lunch', 'dinner', 'snack', 'fruit', 'fruits', 'vegetable', 'vegetables', 'salad', 'juice',
        'milk', 'dairy', 'egg', 'eggs', 'meat', 'chicken', 'fish', 'mutton', 'rice', 'wheat', 'bread', 'roti',
        'lentil', 'lentils', 'spinach', 'vitamin', 'vitamins', 'protein', 'fiber', 'fibre', 'mineral', 'minerals',
        'supplement', 'calcium', 'zinc', 'magnesium', 'potassium',
        // water / hydration
        'water', 'drink', 'drinks', 'drinking', 'hydration', 'hydrate', 'hydrated', 'dehydration', 'dehydrated',
        // medicines
        'medicine', 'medicines', 'medication', 'drug', 'drugs', 'tablet', 'tablets', 'capsule', 'capsules', 'syrup',
        'dose', 'dosage', 'injection', 'drip', 'therapy', 'treatment', 'cure', 'remedy', 'herbal', 'vaccination',
        // care system
        'doctor', 'doctors', 'hospital', 'hospitals', 'clinic', 'nurse', 'surgeon', 'surgery', 'operation',
        'checkup', 'check-up', 'test', 'tests', 'scan', 'x-ray', 'xray', 'ultrasound', 'ecg',
        'disease', 'diseases', 'illness', 'sick', 'sickness', 'patient', 'diagnosis', 'diagnose', 'syndrome',
        'disorder', 'chronic', 'acute', 'inflammation', 'cancer', 'tumor', 'tumour', 'asthma', 'epilepsy',
        'hiv', 'aids', 'hepatitis', 'dengue', 'malaria', 'typhoid', 'covid', 'corona',
        // body parts
        'eye', 'eyes', 'vision', 'blurry', 'ear', 'ears', 'hearing', 'nose', 'throat', 'teeth', 'tooth', 'cavity',
        'gums', 'hair', 'hairfall', 'bald', 'nail', 'nails', 'skin', 'pimple', 'pimples', 'acne', 'eczema',
        'bone', 'bones', 'joint', 'joints', 'arthritis', 'muscle', 'muscles', 'back', 'neck', 'shoulder',
        'knee', 'elbow', 'wrist', 'ankle', 'leg', 'legs', 'arm', 'arms', 'hand', 'hands', 'foot', 'feet',
        'brain', 'mind', 'memory', 'period', 'periods', 'menstruation', 'menstrual', 'pregnancy', 'pregnant',
        'delivery', 'baby', 'infant', 'child', 'children', 'kids', 'breastfeed',
        // mental health / sleep
        'stress', 'anxiety', 'anxious', 'depression', 'depressed', 'mood', 'sleep', 'insomnia', 'sleepless',
        'snore', 'snoring', 'rest', 'relax',
        // fatigue
        'tired', 'tiredness', 'fatigue', 'weak', 'weakness', 'energy', 'energetic', 'exhausted', 'exhaustion',
        'lethargy', 'drowsy', 'sleepy', 'lazy',
        // breathing / vitals
        'breathe', 'breathing', 'breath', 'oxygen', 'first aid', 'emergency', 'ambulance',
        // hygiene
        'hygiene', 'sanitary', 'sanitation', 'clean', 'smoking', 'smoke', 'alcohol',
        // ---- Roman Urdu ----
        'sehat', 'tandrust', 'sehatmand', 'bimari', 'beemari', 'marz', 'dard', 'takleef', 'bukhar', 'tap',
        'khansi', 'zukam', 'nazla', 'ulti', 'dast', 'qabz', 'seena', 'seenay', 'dil', 'jigar', 'gurda', 'gurde',
        'phephra', 'phephray', 'haddi', 'haddiyan', 'jor', 'joron', 'pathay', 'patha', 'kamar', 'gardan',
        'kandha', 'ghutna', 'kohni', 'kalai', 'takhna', 'tang', 'tangain', 'bazu', 'hath', 'hathon', 'paon',
        'ungli', 'ungliyan', 'sar', 'aankh', 'aankhein', 'kaan', 'naak', 'gala', 'daant', 'masoorha', 'masoorhe',
        'baal', 'nakhun', 'jild', 'chamri', 'daana', 'daanay', 'pheesi', 'paseena', 'paseenay', 'thand', 'garmi',
        'sardi', 'khushki', 'khushk', 'chakkar', 'behosh', 'ghabrahat', 'bechaini', 'neend', 'khwab', 'thakawat',
        'thakan', 'thaka', 'thaki', 'kamzori', 'kamzor', 'susti', 'sust', 'bhukh', 'pyaas', 'wazan', 'motapa',
        'mota', 'dubla', 'dublapan', 'cheeni', 'namak', 'namkeen', 'ghee', 'doodh', 'dahi', 'makhan',
        'anda', 'anday', 'gosht', 'machli', 'machhi', 'sabzi', 'sabziyan', 'phal', 'naan', 'chawal', 'daal',
        'chana', 'chanay', 'masoor', 'rajma', 'saag', 'methi', 'gajar', 'chukandar', 'kheera', 'tamatar',
        'pyaz', 'lehsan', 'adrak', 'haldi', 'zeera', 'ajwain', 'shahad', 'shehad', 'chai', 'qehwa', 'kehwa',
        'dawai', 'dawa', 'dawaiyan', 'goli', 'goliyan', 'teeka', 'ilaaj', 'ilaj', 'hakeem', 'parhez', 'parhezi',
        'warzish', 'sair', 'paidal', 'khun', 'khoon', 'peshab', 'paikhana', 'mahwari', 'maahwari', 'haiz',
        'hamal', 'peena', 'piyo', 'piyein', 'piya', 'khana', 'khao', 'khayein', 'khaya', 'sona', 'soyein',
        'soya', 'jagna', 'chalna', 'pait', 'meda', 'tilli', 'masana'
    ];
    return healthKeywords.some((keyword) => lower.includes(keyword))
        || SHORT_HEALTH_KEYWORDS.some((k) => new RegExp('\\b' + k + '\\b').test(lower))
        || checkEmergency(text);
}

function getRefusalMessage(text) {
    if (/[ا-ی]/.test(text) || /Urdu/i.test(text)) {
        return 'Main ek Health Assistant hoon aur sirf medical, health, ya fitness se related sawalon ka jawab de sakta hoon. Kya main aapki health ke hawale se koi madad kar sakta hoon?';
    }
    return "I'm a Health Assistant and can only help with medical, health, or fitness-related questions. How can I help with your health concern?";
}

function copyToClipboard(text, callback) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => callback(true)).catch(() => callback(false));
        return;
    }
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    const success = document.execCommand('copy');
    document.body.removeChild(temp);
    callback(success);
}

function appendMessage(role, text, opts = {}) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    // Hide welcome state on first message
    hideWelcomeState();

    const row = document.createElement('div');
    row.className = `msg-row ${role}` + (opts.error ? ' error' : '') + (opts.welcome ? ' welcome-card' : '');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = `<i data-lucide="${role === 'user' ? 'user' : 'bot'}"></i>`;

    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (role === 'bot' || role === 'error') bubble.innerHTML = renderMarkdown(text);
    else bubble.textContent = text;

    const metaRow = document.createElement('div');
    metaRow.className = 'msg-meta';

    const timeEl = document.createElement('span');
    timeEl.className = 'timestamp msg-time';
    timeEl.textContent = getTimestamp();
    metaRow.appendChild(timeEl);

    if (role === 'bot' && !opts.welcome) {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';

        const makeActionBtn = (icon, extraClass, label) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `msg-action-btn ${extraClass}`;
            btn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
            btn.setAttribute('aria-label', label);
            btn.title = label;
            return btn;
        };

        const copyBtn = makeActionBtn('copy', 'copy', 'Copy message');
        copyBtn.addEventListener('click', () => {
            copyToClipboard(text, (success) => {
                if (success) {
                    copyBtn.innerHTML = '<i data-lucide="check" aria-hidden="true"></i>';
                    copyBtn.classList.add('copied');
                    if (window.lucide) window.lucide.createIcons();
                    showToast('Copied to clipboard', 'check');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i data-lucide="copy" aria-hidden="true"></i>';
                        copyBtn.classList.remove('copied');
                        if (window.lucide) window.lucide.createIcons();
                    }, 1500);
                } else {
                    showToast('Copy failed. Please try again.', 'triangle-alert');
                }
            });
        });

        const likeBtn = makeActionBtn('thumbs-up', 'like', 'Good response');
        const dislikeBtn = makeActionBtn('thumbs-down', 'dislike', 'Bad response');
        likeBtn.addEventListener('click', () => {
            const on = likeBtn.classList.toggle('active');
            dislikeBtn.classList.remove('active');
            if (on) showToast('Thanks for your feedback!', 'thumbs-up');
        });
        dislikeBtn.addEventListener('click', () => {
            const on = dislikeBtn.classList.toggle('active');
            likeBtn.classList.remove('active');
            if (on) showToast('Feedback noted — we will improve.', 'thumbs-down');
        });

        actions.appendChild(copyBtn);
        actions.appendChild(likeBtn);
        actions.appendChild(dislikeBtn);
        metaRow.appendChild(actions);
    }

    wrap.appendChild(bubble);
    wrap.appendChild(metaRow);
    row.appendChild(avatar);
    row.appendChild(wrap);
    chatArea.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
    scrollToBottom();
}

function showEmergencyBanner() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    const banner = document.createElement('div');
    banner.className = 'emergency-banner';
    banner.innerHTML = `
        <div class="emergency-title"><i data-lucide="triangle-alert" aria-hidden="true"></i> Emergency Detected!</div>
        <div class="emergency-text">
            Agar yeh emergency hai, toh please <strong>abhi</strong> apne nearest hospital jaaein ya
            <a href="tel:1122">1122 (Rescue)</a> / <a href="tel:115">115 (Edhi)</a> call karein.
            AI health advice emergency ki jagah nahi le sakta.
        </div>`;
    chatArea.appendChild(banner);
    if (window.lucide) window.lucide.createIcons();
    scrollToBottom();
}

function showTyping() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    row.id = 'typingRow';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = '<i data-lucide="bot"></i>';
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';
    const bubble = document.createElement('div');
    bubble.className = 'bubble typing-bubble';
    bubble.setAttribute('aria-label', 'Typing...');
    bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    wrap.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(wrap);
    chatArea.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
    scrollToBottom();
}

function removeTyping() {
    const typingRow = document.getElementById('typingRow');
    if (typingRow) typingRow.remove();
}

function hideWelcomeState() {
    const welcome = document.getElementById('chatWelcome');
    if (welcome) welcome.style.display = 'none';
}

function showWelcome() {
    appendMessage('bot', "Assalam-o-Alaikum! Main aapka **MediMind Assistant** hoon.\n\nApne symptoms batayein ya koi bhi health se related sawaal poochein — main madad ke liye haazir hoon!", { welcome: true });
}

function trimConversation() {
    if (conversation.length > CONFIG.MAX_HISTORY + 1) {
        conversation = [conversation[0], ...conversation.slice(-(CONFIG.MAX_HISTORY))];
    }
}

function getDemoResponse(messages) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || '';
    const isUrdu = /[ا-ی]/.test(lastUserMsg) || /\b(mai|main|mera|mere|aap|kaise|kya|kyun|kaisa|thakawat|bukhar|dard|ghabrahat|khun|kamzori|dawai|sehat|ilaj|diet|khana|pani|vitamin|iron|anemia|b12)\b/i.test(lastUserMsg);

    const responses = {
        greeting: isUrdu
            ? "Wa alaikum assalam! Main aapka **PulseCare Assistant** hoon. Aaj aap kaise feel kar rahe hain? Koi symptoms batayein ya koi sawal poochein."
            : "Hello! I'm your **PulseCare Assistant**. How are you feeling today? Tell me any symptoms or ask a health question.",
        
        fatigue: isUrdu
            ? "**Thakawat (fatigue)** ke common causes:\n- Neend ki kami (7-9 ghante chahiye)\n- Iron/B12 ki kami (anemia)\n- Dehydration\n- Thyroid issues\n- Stress ya depression\n\n**Kya karein:**\n- Roz 7-9 ghante sonein\n- Iron-rich khana khayein (palak, dal, meat)\n- Pani piyein (8 glass din mein)\n- Agar 2+ haftay se thakawat hai, doctor se milen"
            : "**Fatigue** common causes:\n- Poor sleep (need 7-9 hrs)\n- Iron/B12 deficiency (anemia)\n- Dehydration\n- Thyroid issues\n- Stress/depression\n\n**What to do:**\n- Sleep 7-9 hours nightly\n- Eat iron-rich foods (spinach, lentils, meat)\n- Drink 8 glasses water daily\n- If fatigue persists 2+ weeks, see a doctor",
        
        headache: isUrdu
            ? "**Sar dard** ke liye:\n- Pani piyein (dehydration common cause)\n- Neend complete karein\n- Screen break lein (20-20-20 rule)\n- Thandi patti lagayein\n- Agar: sudden severe dard, vision changes, fever ke saath — **turant doctor**\n\n**Red flags:** subah uthte hi dard, cheekhne/seene ke saath dard, behoshi"
            : "**Headache** relief:\n- Drink water (dehydration is common)\n- Get enough sleep\n- Screen breaks (20-20-20 rule)\n- Cold compress\n- **See doctor if:** sudden severe pain, vision changes, fever, morning headaches, pain with coughing/straining",
        
        fever: isUrdu
            ? "**Bukhar (fever)** — 100.4°F (38°C) se upar:\n- Rest karein, pani piyein\n- Paracetamol (dose label pe dekhein)\n- Thande pani ki patti\n- **Doctor kab:** 103°F se upar, 3 din se zyada, bachon mein, saath mein: saans lene mein dikkat, gardan akarna, rash"
            : "**Fever** (>100.4°F/38°C):\n- Rest, hydrate\n- Paracetamol (follow label)\n- Cool compress\n- **See doctor if:** >103°F, lasts 3+ days, in children, with: breathing difficulty, stiff neck, rash",
        
        anemia: isUrdu
            ? "**Anemia (khoon ki kami)** ke signs:\n- Thakawat, peela rang, saans phoolna\n- Sar dard, thand lagna\n- Naakhun tootna, baal jharna\n\n**Tests:** CBC, Iron studies, Ferritin, B12, Folate\n**Khana:** Palak, chukandar, dal, anda, meat, kishmish\n**Doctor se milen** agar symptoms hain"
            : "**Anemia** signs:\n- Fatigue, pale skin, shortness of breath\n- Headache, cold hands/feet\n- Brittle nails, hair loss\n\n**Tests:** CBC, Iron studies, Ferritin, B12, Folate\n**Food:** Spinach, beetroot, lentils, eggs, meat, raisins\n**See doctor** if symptoms present",
        
        diet: isUrdu
            ? "**Iron-rich diet** (vegetarian):\n- **Breakfast:** Palak besan cheela + nimbu\n- **Lunch:** Rajma + chawal + dahi\n- **Snack:** Chana + gud\n- **Dinner:** Dal palak + roti\n\n**Non-veg:** Anda, chicken liver, fish\n**Tip:** Vitamin C (nimbu, amla) ke saath iron better absorb hota hai. Chai/coffee khane ke saath na piyein."
            : "**Iron-rich diet** (veg):\n- **Breakfast:** Spinach besan chilla + lemon\n- **Lunch:** Rajma + rice + curd\n- **Snack:** Roasted chana + jaggery\n- **Dinner:** Dal palak + roti\n\n**Non-veg:** Eggs, chicken liver, fish\n**Tip:** Vitamin C (lemon, amla) helps iron absorption. Avoid tea/coffee with meals.",
        
        water: isUrdu
            ? "**Pani kitna piyein:**\n- Adults: 2.5-3 liter (8-10 glass) din mein\n- Exercise/garmi mein zyada\n- Peshab ka rang halka peela hona chahiye\n- Thirst lagna = already dehydrated"
            : "**How much water:**\n- Adults: 2.5-3L (8-10 glasses)/day\n- More with exercise/heat\n- Urine should be pale yellow\n- Thirst = already dehydrated",

        bp: isUrdu
            ? "**Blood Pressure (BP):**\n- Normal: 120/80 mmHg ke aas paas\n- **High BP:** namak kam karein, wazan control, roz 30 min sair, stress kam, smoking band\n- **Low BP:** pani zyada piyein, khana skip na karein\n- **Doctor kab:** baar baar 140/90 se upar, seene mein dard, chakkar, saans phoolna\n- Ghar par BP machine se regular check karein"
            : "**Blood Pressure (BP):**\n- Normal: around 120/80 mmHg\n- **High BP:** cut salt, control weight, 30-min daily walk, less stress, quit smoking\n- **Low BP:** drink more fluids, don't skip meals\n- **See doctor if:** repeatedly above 140/90, chest pain, dizziness, breathlessness\n- Monitor regularly with a home BP machine",

        diabetes: isUrdu
            ? "**Sugar/Diabetes:**\n- Fasting sugar: 70-100 mg/dL normal; 126+ diabetes ki taraf ishara\n- **Parhez:** meetha kam, roti/chawal limited, sabzi/daal zyada\n- **Warzish:** roz 30 min walk sugar control mein madadgar\n- **Doctor kab:** baar baar zyada pyaas/peshab, wazan girna, zakham der se bharna\n- Sugar machine se fasting + random check karte rahein"
            : "**Sugar/Diabetes:**\n- Fasting sugar: 70-100 mg/dL normal; 126+ suggests diabetes\n- **Diet:** less sweets, limited roti/rice, more vegetables/lentils\n- **Exercise:** 30-min daily walk helps control sugar\n- **See doctor if:** frequent thirst/urination, weight loss, slow-healing wounds\n- Check fasting + random sugar regularly with a glucometer",

        coldflu: isUrdu
            ? "**Zukam/Flu (cold & cough):**\n- Garam pani, steam lein, namak wale pani se gararay\n- Rest karein, pani zyada piyein\n- **Doctor kab:** 3+ din bukhar, saans mein dikkat, seene mein dard, balgham mein khoon"
            : "**Cold & Flu:**\n- Warm fluids, steam inhalation, salt-water gargles\n- Rest and hydrate\n- **See doctor if:** fever 3+ days, breathing difficulty, chest pain, blood in phlegm",

        thanks: isUrdu
            ? "Khush aamdeed! 😊 Apni sehat ka khayal rakhein. Koi aur sawal ho to poochein."
            : "You're welcome! 😊 Take care of your health. Ask anytime you have another question.",
        
        default: isUrdu
            ? "Main samjha nahi. Kya aap **symptoms** bata sakte hain? Jaise: thakawat, sar dard, bukhar, chakkar, saans phoolna — ya koi specific sawal poochein."
            : "I didn't catch that. Could you describe your **symptoms**? Like: fatigue, headache, fever, dizziness, shortness of breath — or ask a specific health question."
    };

    let reply = responses.default;
    if (/\b(hello|hi|salam|assalam|namaste)\b/i.test(lastUserMsg)) reply = responses.greeting;
    else if (/\b(thanks|thank you|shukriya)\b/i.test(lastUserMsg)) reply = responses.thanks;
    else if (/\b(thakawat|fatigue|tired|weakness|kamzori|energy)\b/i.test(lastUserMsg)) reply = responses.fatigue;
    else if (/\b(sar dard|headache|migraine|dard)\b/i.test(lastUserMsg)) reply = responses.headache;
    else if (/\b(bukhar|fever|temperature|tap)\b/i.test(lastUserMsg)) reply = responses.fever;
    else if (/\b(cold|cough|flu|zukam|nazla|khansi)\b/i.test(lastUserMsg)) reply = responses.coldflu;
    else if (/\b(blood pressure|\bbp\b|hypertension|high bp|low bp)\b/i.test(lastUserMsg)) reply = responses.bp;
    else if (/\b(diabetes|sugar|blood sugar|glucose|insulin)\b/i.test(lastUserMsg)) reply = responses.diabetes;
    else if (/\b(anemia|khoon|iron|ferritin|hemoglobin|\bhb\b|b12)\b/i.test(lastUserMsg)) reply = responses.anemia;
    else if (/\b(diet|khana|food|nutrition|iron rich|kya khana)\b/i.test(lastUserMsg)) reply = responses.diet;
    else if (/\b(paani|water|hydration|dehydration|kitna pani)\b/i.test(lastUserMsg)) reply = responses.water;

    reply += "\n\n---\n*Yeh sirf information ke liye hai. Diagnosis ke liye doctor se zaroor milein.*";
    return new Promise(r => setTimeout(() => r(reply), 600));
}

async function callAPI(messages, attempt = 1) {
    if (CONFIG.DEMO_MODE) {
        return getDemoResponse(messages);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
        response = await fetch(CONFIG.ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: CONFIG.MODEL, messages, temperature: CONFIG.TEMPERATURE, max_tokens: CONFIG.MAX_TOKENS }),
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('Request timed out');
        throw new Error('Unable to reach the chat server');
    } finally {
        clearTimeout(timeout);
    }
    if (!response.ok) {
        if (response.status === 429 && attempt <= CONFIG.RETRY_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY * attempt));
            return callAPI(messages, attempt + 1);
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const reply = data?.reply?.trim();
    if (!reply) throw new Error('Empty response from API');
    return reply;
}

async function sendMessage(prefilledText) {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!userInput || !sendBtn) return;

    const text = (prefilledText ?? userInput.value).trim();
    if (!text || isProcessing) return;

    isProcessing = true;
    sendBtn.disabled = true;
    appendMessage('user', text);
    conversation.push({ role: 'user', content: text });
    if (!prefilledText) userInput.value = '';

    if (checkEmergency(text)) showEmergencyBanner();

    if (!isHealthRelatedQuery(text)) {
        const refusal = getRefusalMessage(text);
        removeTyping();
        appendMessage('bot', refusal);
        conversation.push({ role: 'assistant', content: refusal });
        lastBotReply = refusal;
        isProcessing = false;
        sendBtn.disabled = false;
        userInput.focus();
        return;
    }

    trimConversation();
    showTyping();

    try {
        const reply = await callAPI(conversation);
        removeTyping();
        appendMessage('bot', reply);
        lastBotReply = reply;
        conversation.push({ role: 'assistant', content: reply });
    } catch (err) {
        removeTyping();
        console.error('API Error:', err);
        const message = err.message || '';
        let userMessage = 'Chat response nahi de raha. Please dobara try karein.';
        if (message.includes('429')) userMessage = 'Bohat zyada requests hain. Thoda intezar karke dobara try karein.';
        else if (message.includes('Server configuration error') || message.includes('Invalid API configuration') || message.includes('401') || message.includes('403')) userMessage = 'Server par GROQ_API_KEY set nahi hai ya invalid hai. Vercel settings check karein.';
        else if (message.includes('Unable to reach the chat server')) userMessage = 'Chat server nahi mila. Project ko Vercel par deploy karein taake /api/chat kaam kare.';
        else if (message.includes('timed out')) userMessage = 'AI service ka response slow hai. Please dobara try karein.';
        else if (!navigator.onLine) userMessage = 'Internet connection nahi hai. Check karke dobara try karein.';
        appendMessage('bot', userMessage, { error: true });
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function initVoice() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none';
        showToast('Voice nahi supported', 'mic-off');
        return;
    }

    const getRecognitionLang = () => {
        const userInput = document.getElementById('userInput');
        if (userInput && userInput.value) {
            const text = userInput.value;
            if (/[ا-ی]/.test(text) || /\b(mai|main|mera|mere|aap|kaise|kya|kyun|kaisa)\b/i.test(text)) return 'ur-PK';
            if (/\b(मैं|मेरा|आप|कैसे|क्या|क्यों|कैसा)\b/.test(text)) return 'hi-IN';
        }
        return 'en-US';
    };

    recognition = new SpeechRecognition();
    recognition.lang = getRecognitionLang();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        finalTranscript = '';
        showToast('Sun raha hoon... bolein', 'mic');
    };
    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += t + ' ';
            else interim += t;
        }
        const userInput = document.getElementById('userInput');
        if (userInput) userInput.value = (finalTranscript || interim).trim();
    };
    recognition.onerror = (event) => {
        console.error('Voice error:', event.error);
        let msg = 'Voice mein masla hua';
        if (event.error === 'network') msg = 'Internet issue';
        if (event.error === 'no-speech') msg = 'Kuch suna nahi — dobara try karein';
        if (event.error === 'audio-capture') msg = 'Microphone nahi mil raha';
        if (event.error === 'not-allowed') msg = 'Microphone permission deny';
        if (event.error === 'aborted') return;
        stopRecording();
        showToast(msg, 'mic-off');
    };
    recognition.onend = () => stopRecording();

    voiceBtn.addEventListener('click', () => {
        if (isRecording) stopRecording();
        else { recognition.lang = getRecognitionLang(); startRecording(); }
    });
}

function startRecording() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!recognition || !voiceBtn) return;
    if (isRecording) return;
    try {
        isRecording = true;
        finalTranscript = '';
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i data-lucide="square" aria-hidden="true"></i>';
        if (window.lucide) window.lucide.createIcons();
        recognition.start();
    } catch (e) {
        console.error(e);
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i data-lucide="mic" aria-hidden="true"></i>';
        if (window.lucide) window.lucide.createIcons();
        showToast('Mic start nahi ho raha', 'mic-off');
    }
}

function stopRecording() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;
    isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceBtn.innerHTML = '<i data-lucide="mic" aria-hidden="true"></i>';
    if (window.lucide) window.lucide.createIcons();
    try { if (recognition) recognition.stop(); } catch (e) { console.error(e); }
}

function initReadAloud() {
    const btn = document.getElementById('readAloudBtn');
    if (!btn) return;
    if (!('speechSynthesis' in window)) {
        btn.style.display = 'none';
        return;
    }
    btn.addEventListener('click', () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            btn.classList.remove('active');
            document.getElementById('readAloudLabel').textContent = 'Read aloud';
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        if (!lastBotReply) {
            showToast('No response to read yet', 'info');
            return;
        }
        const utter = new SpeechSynthesisUtterance(lastBotReply.replace(/[*_`#]/g, ''));
        utter.rate = 1;
        utter.pitch = 1;
        utter.onend = () => {
            isSpeaking = false;
            btn.classList.remove('active');
            document.getElementById('readAloudLabel').textContent = 'Read aloud';
            if (window.lucide) window.lucide.createIcons();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        isSpeaking = true;
        btn.classList.add('active');
        document.getElementById('readAloudLabel').textContent = 'Stop';
        if (window.lucide) window.lucide.createIcons();
    });
}

function initSignIn() {
    const btn = document.querySelector('[data-action="signin"]');
    if (!btn) return;
    btn.addEventListener('click', () => {
        showToast('Sign-in is a demo. Coming soon!', 'info');
    });
}

function initChatMenu() {
    const btn = document.getElementById('chatMenuBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        resetChat();
    });
}

function resetChat() {
    const chatArea = document.getElementById('chatArea');
    if (chatArea) chatArea.innerHTML = '';
    conversation = [{ role: 'system', content: SYSTEM_PROMPT }];
    lastBotReply = '';
    showWelcome();
    showToast('Chat reset', 'check');
}

function initClearChat() {
    const btn = document.getElementById('clearChatBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (conversation.length <= 2) {
            showToast('Chat pehle se khali hai', 'check');
            return;
        }
        const chatArea = document.getElementById('chatArea');
        if (chatArea) chatArea.innerHTML = '';
        conversation = [{ role: 'system', content: SYSTEM_PROMPT }];
        lastBotReply = '';
        showWelcome();
        showToast('Chat clear ho gaya', 'check');
    });
}

function initStarters() {
    const starters = document.querySelectorAll('.starter[data-suggestion]');
    const tryLinks = document.querySelectorAll('.composer-try a[data-suggestion]');
    const handleClick = (e) => {
        e.preventDefault();
        sendMessage(e.currentTarget.dataset.suggestion);
    };
    starters.forEach((el) => el.addEventListener('click', handleClick));
    tryLinks.forEach((el) => el.addEventListener('click', handleClick));
    const welcomeChips = document.querySelectorAll('.welcome-chip[data-suggestion]');
    welcomeChips.forEach((el) => el.addEventListener('click', handleClick));
}

function initStartersToggle() {
    const toggle = document.getElementById('starters-toggle-mobile');
    const card = document.getElementById('starters-card');
    if (!toggle || !card) return;
    toggle.addEventListener('click', () => {
        card.classList.toggle('mobile-open');
    });
}

function initChatPage() {
    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!chatArea || !userInput || !sendBtn) return;

    sendBtn.addEventListener('click', () => sendMessage());
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    initVoice();
    initStarters();
    initReadAloud();
    initSignIn();
    initChatMenu();
    initClearChat();
    initStartersToggle();
    showWelcome();
    userInput.focus();
}

// Theme handled by app.js

window.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    // Theme is handled by app.js
    const page = document.body.dataset.page || 'chat';
    if (page === 'chat') initChatPage();
});
