// nlu.js
// Modul NLU (Natural Language Understanding) & AI Configuration

const STORAGE_KEY = 'nlu_db';

// === 1. Konfigurasi Slash Commands ===
const SLASH_COMMANDS = [
  { command: '/help', description: 'Tampilkan pesan bantuan' },
  { command: '/saldo', description: 'Lihat sisa saldo Anda' },
  { command: '/jadwal', description: 'Lihat tugas & jadwal hari ini' },
  { command: '/jadwal besok', description: 'Lihat tugas & jadwal besok' },
];

// === 2. Konfigurasi Kamus Respons (Personalisasi Jawaban) ===
const RESPONSE_TEMPLATES = {
  greeting_initial: [
    "Halo! Saya asisten AI Anda. Ketik '/' untuk melihat perintah, atau ketik 'Bantuan'."
  ],
  greeting: [
    "👋 Halo! Ada yang bisa saya bantu?",
    "Hai! Siap membantu.",
    "Halo! Mau dibantu apa hari ini?"
  ],
  help: [
    "🤖 Tentu! Saya bisa membantu Anda:\n" +
    "1. Menambah pengeluaran (cth: \"beli kuota 50rb\")\n" +
    "2. Menambah pemasukan (cth: \"dapat uang 100rb\")\n" +
    "3. Menambah tugas (cth: \"tambah tugas fisika kumpul besok\")\n" +
    "4. Menyelesaikan tugas (cth: \"selesaikan tugas fisika\")\n" +
    "5. Mengecek saldo (cth: \"/saldo\" atau \"cek saldo\")\n" +
    "6. Mengecek tugas & jadwal (cth: \"/jadwal\" atau \"cek tugas 15 november\")\n" +
    "Ketik \"/\" untuk daftar perintah lengkap."
  ],
  check_balance: [
    "ℹ️ Saldo Anda saat ini adalah {BALANCE}.",
    "Kamu mau cek saldo? Baik! Sisa saldo kamu {BALANCE}.",
    "Boleh, ini saldo kamu: {BALANCE}.",
    "Aku cek dulu ya... sudah muncul! Saldonya {BALANCE}."
  ],
  check_tasks_none: [
    "ℹ️ Aman! Tidak ada tugas atau jadwal untuk {WHEN}.",
    "Semua beres! Tidak ada agenda atau tugas untuk {WHEN}.",
    "Kerja bagus! Tidak ada catatan untuk {WHEN}."
  ],
  check_tasks_found: [
    "ℹ️ Untuk {WHEN}, Anda punya {TASKS} tugas dan {SCHEDULES} jadwal.",
    "Tercatat ada {TASKS} tugas dan {SCHEDULES} jadwal untuk {WHEN}.",
    "Siap! Untuk {WHEN} ada {TASKS} tugas dan {SCHEDULES} jadwal."
  ],
  add_expense: [
    "✅ Tercatat: pengeluaran {CATEGORY} {AMOUNT}. Saldo sekarang {BALANCE}.",
    "Oke, pengeluaran {CATEGORY} {AMOUNT} sudah dicatat. Sisa saldo {BALANCE}.",
    "Sip, sudah masuk. Pengeluaran {AMOUNT} untuk {CATEGORY}. Saldo akhir {BALANCE}."
  ],
  add_income: [
    "✅ Oke, saldo ditambahkan {AMOUNT}. Saldo sekarang {BALANCE}.",
    "Sip, {AMOUNT} sudah masuk. Saldo kamu sekarang {BALANCE}.",
    "Uang masuk {AMOUNT} tercatat. Saldo terbaru {BALANCE}."
  ],
  add_task: [
    "✅ Tugas ditambahkan: \"{TITLE}\"",
    "Oke, tugas \"{TITLE}\" sudah dicatat.",
    "Sip, \"{TITLE}\" masuk ke daftar tugas."
  ],
  add_task_with_date: [
    "✅ Tugas \"{TITLE}\" dicatat dengan deadline {WHEN}.",
    "Oke, \"{TITLE}\" masuk ke daftar tugas, dikumpulkan {WHEN}.",
  ],
  complete_task_none: [
    "ℹ️ Tidak ada tugas pending untuk ditandai selesai.",
    "Semua tugas sudah beres!",
    "Tidak ada tugas untuk diselesaikan."
  ],
  complete_task_one: [
    "✅ Tugas \"{TITLE}\" ditandai selesai.",
    "Bagus! Tugas \"{TITLE}\" sudah beres.",
    "Mantap! \"{TITLE}\" telah selesai."
  ],
  complete_task_not_found: [
    "Hmm, saya tidak menemukan tugas \"{TITLE}\" {WHEN} yang masih pending.",
    "Maaf, tugas \"{TITLE}\" {WHEN} tidak ada di daftar."
  ],
  fallback: [
    "Maaf, saya tidak mengerti perintah itu.",
    "Hmm, aku belum paham maksudmu.",
    "Maaf, bisa ulangi dengan perintah lain? Coba ketik /help"
  ],
  command_unknown: [
    "Maaf, command \"{COMMAND}\" tidak saya kenali.",
    "Perintah \"{COMMAND}\" tidak ada. Ketik /help untuk bantuan."
  ]
};

// === 3. Konfigurasi NLU Bawaan (Pola Kalimat) ===
// REVISI: Urutan diubah agar lebih spesifik (add_task) didahulukan
const builtin_nlu = [
  // Intent Pengeluaran
  {
    id: 'builtin_expense',
    name: 'builtin-expense',
    intent: 'add_expense',
    type: 'regex',
    pattern: /(beli|bayar|jajan|pengeluaran|keluar|ongkos|catat)\s*(.*?)\s*(?:dengan harga|seharga|sebesar)?[^\d]*?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?|\d+)(\s*(rb|ribu|k|k?))?/i,
    examples: ['saya membeli kuota dengan harga 50rb', 'beli makan 20k', 'catat pengeluaran 15k']
  },
  
  // REVISI BESAR PADA OTAK AI (add_task)
  {
    id: 'builtin_task',
    name: 'builtin-task',
    intent: 'add_task',
    type: 'regex', 
    // Pola: (tambah/catat/ADA/MEMPUNYAI/DAPAT) (WAJIB: tugas/pr) (JUDUL TUGAS) (OPSIONAL: TANGGAL)
    pattern: /(tambah|buat|tambahkan|ingatkan|catat|ada|mempunyai|dapat)\s+(tugas|pekerjaan|PR|project|todolist|to do|agenda)\s+(.*?)(?:\s+(?:dikumpulkan|kumpul|tanggal|due|pada|di|selesai|di\s+selesaikan)\s+(.+))?$/i,
    examples: ['tambah tugas kerjakan PR', 'mempunyai tugas matematika di hari rabu', 'ada tugas teknik komputer kumpul 15 november']
  },
  
  // Intent Pemasukan (Regex diperkuat agar tidak konflik)
  {
    id: 'builtin_income',
    name: 'builtin-income',
    intent: 'add_income',
    type: 'regex',
    // Pola: (dapat/tambah uang/tambah saldo/dll) (DESKRIPSI) (ANGKA)
    pattern: /(dapat|dapet|masuk|terima|dikasih|nabung|isi|tambah\s+(?:uang|saldo|duit))\s*(.*?)\s*(?:sebesar)?[^\d]*?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?|\d+)(\s*(rb|ribu|k|k?))?/i,
    examples: ['tambah saldo 50rb', 'dapat uang dari orang tua sebesar 100rb', 'isi saldo 20k']
  },
  
  // REVISI BESAR PADA OTAK AI (complete_task)
  {
    id: 'builtin_done',
    name: 'builtin-done',
    intent: 'complete_task',
    type: 'regex',
    // Pola: (opsional: tugas) (NAMA TUGAS) (opsional: TANGGAL) (SELESAI)
    pattern: /(?:tugas|pekerjaan|PR)?\s*([a-zA-Z0-9\s]+?)\s*(?:(?:di|pada|tanggal|kumpul|hari)\s+(.*?))?\s*(?:saya)?\s*(sudah\s+selesai|selesai|beres|kelar|done|teah selesai)/i,
    examples: ['tugas pr saya sudah selesai', 'tugas matematika selesai', 'matematika beres', 'tugas bahasa inggris di hari rabu sudah selesai']
  },
  
  // REVISI: Tambahkan intent baru
  {
    id: 'builtin_schedule',
    name: 'builtin-schedule',
    intent: 'add_schedule',
    type: 'regex',
    // Pola: (tambah/buat) (jadwal/event) (JUDUL) (di/tanggal/pada) (TANGGAL)
    pattern: /(tambah|buat|atur|set)\s+(jadwal|event|acara|rapat)\s+(.*?)\s+(?:di|pada|tanggal|jam)\s+(.+)/i,
    examples: ['tambah jadwal rapat osis besok jam 2', 'atur event belajar bareng hari jumat']
  },
  {
    id: 'builtin_reminder',
    name: 'builtin-reminder',
    intent: 'add_reminder',
    type: 'regex',
    // Pola: (ingatkan) (JUDUL) (di/tanggal/pada) (TANGGAL)
    pattern: /(ingatkan|ingetin|setel pengingat)\s+(.*?)\s+(?:di|pada|tanggal|jam)\s+(.+)/i,
    examples: ['ingatkan saya bayar ukt hari jumat', 'ingetin aku ada zoom jam 3 sore']
  },
  
  // Intent Cek Saldo
  {
    id: 'builtin_check_balance',
    name: 'builtin-check-balance',
    intent: 'check_balance',
    type: 'regex',
    pattern: /(berapa|cek|lihat).*(saldo|uang|duit|balance)/i,
    examples: ['cek saldo', 'sisa uangku berapa?']
  },
  // Intent Cek Jadwal (Menangkap Tanggal)
  {
    id: 'builtin_check_tasks',
    name: 'builtin-check-tasks',
    intent: 'check_tasks',
    type: 'regex',
    // Pola: (apa/cek/dll) (tugas/jadwal) (OPSIONAL: TANGGAL)
    pattern: /(ada|cek|lihat|gimana|apa).*(tugas|PR|pekerjaan|project|agenda|jadwal)\s*(.*)?/i,
    examples: ['cek tugas', 'ada tugas apa aja?', 'lihat tugasku', 'jadwal besok', 'cek tugas 15 november']
  },
  // Intent Sapaan
  {
    id: 'builtin_greeting',
    name: 'builtin-greeting',
    intent: 'greeting',
    type: 'regex',
    pattern: /^(halo|hai|hi|hei|selamat (pagi|siang|sore|malam))/i,
    examples: ['halo', 'hi', 'selamat pagi']
  },
  // Intent Bantuan
  {
    id: 'builtin_help',
    name: 'builtin-help',
    intent: 'help',
    type: 'regex',
    pattern: /(bantuan|help|tolong|bisa.*apa)/i,
    examples: ['bantuan', 'help', 'kamu bisa apa?']
  }
];

// ===== persistence =====
function loadDB(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  } catch(e){
    console.warn('nlu: loadDB error', e);
    return [];
  }
}

function saveDB(db){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch(e){
    console.warn('nlu: saveDB failed', e);
  }
}

// ===== utilities =====
function uid(prefix='nlu'){
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function ensureRegex(p){
  if(!p) return null;
  if(p instanceof RegExp) return p;
  try {
    if(typeof p === 'string' && p.startsWith('/') && p.lastIndexOf('/')>0){
      const last = p.lastIndexOf('/');
      const body = p.slice(1,last);
      const flags = p.slice(last+1);
      return new RegExp(body, flags);
    }
    return new RegExp(p, 'i');
  } catch(e){
    console.warn('nlu: invalid regex pattern', p, e);
    return null;
  }
}

// ===== public API =====

function initNLU(options = { seedBuiltin: true }){
  const existing = loadDB();
  if(existing.length === 0 && options.seedBuiltin){
    const seed = builtin_nlu.map(b => {
      return {
        id: b.id,
        name: b.name,
        intent: b.intent,
        type: b.type,
        pattern: (b.pattern instanceof RegExp) ? b.pattern.toString() : String(b.pattern),
        payloadTemplate: b.payloadTemplate,
        examples: b.examples || []
      };
    });
    saveDB(seed);
    return seed;
  }
  return existing;
}

function listNLUEntries(){ 
  return loadDB(); 
}

function addNLUEntry({ name, intent, type='keyword', pattern, payloadTemplate=null, examples=[] }){
  const db = loadDB();
  const entry = { 
    id: uid('nlu'), 
    name: name || ('nlu_' + intent), // Perbaikan dari kode Anda sebelumnya
    intent: intent, 
    type, 
    pattern: String(pattern), 
    payloadTemplate, 
    examples: examples || [] 
  };
  db.push(entry);
  saveDB(db);
  return entry;
}

function removeNLUEntry(id){
  const db = loadDB();
  const idx = db.findIndex(x=>x.id===id);
  if(idx>-1){ 
    db.splice(idx,1); 
    saveDB(db); 
    return true; 
  }
  return false;
}

function clearNLUDb(){ 
  saveDB([]); 
}

function matchWithDB(message){
  const db = loadDB();
  const text = (message || '').toString();
  for(const e of db){
    if(e.type === 'regex'){
      const rx = ensureRegex(e.pattern);
      if(!rx) continue;
      const m = text.match(rx);
      if(m){ return { entry: e, match: m }; }
    } else { 
      const kw = (e.pattern || '').toLowerCase();
      if(kw && text.toLowerCase().includes(kw)){ return { entry: e, match: null }; }
    }
  }
  return null;
}

function parseAmount(raw, unitPart){
  if(!raw) return 0;
  let s = String(raw).replace(/\s+/g,'').replace(/,/g,'.');
  s = s.replace(/[^0-9.]/g,'');
  const dotCount = (s.match(/\./g)||[]).length;
  if(dotCount > 1){ s = s.replace(/\./g,''); }
  let num = parseFloat(s);
  if(isNaN(num)) num = 0;
  unitPart = (unitPart || '').toLowerCase();
  if(/rb|ribu|k/.test(unitPart) || /rb|ribu|k/.test(raw.toLowerCase())){
    num = num * 1000;
  }
  return Math.round(num);
}

// REVISI: parseUserMessage diperbarui untuk intent baru
function parseUserMessage(message){
  const text = (message || '').toString();
  
  // 1) Cek NLU Bawaan (Sudah diurutkan)
  for(const b of builtin_nlu){
    const rx = (b.pattern instanceof RegExp) ? b.pattern : ensureRegex(b.pattern);
    if(!rx) continue;
    const m = text.match(rx);
    if(m){
      // --- Logika Ekstraksi ---
      
      // Pemasukan & Pengeluaran
      if(b.intent === 'add_expense' || b.intent === 'add_income'){
        const rawAmount = m[3] || ''; // Angka (Grup 3)
        const unit = (m[4] || '').toLowerCase(); // Unit (Grup 4)
        const amount = parseAmount(rawAmount, unit);
        
        let cleanDescription = (m[2] || '').trim().replace(/^(dari|untuk|ke)\s/i, '').trim(); 
        const category = (b.intent === 'add_income' ? 'Pemasukan' : 'Pengeluaran');
        
        if (!cleanDescription || cleanDescription.toLowerCase() === 'uang' || cleanDescription.toLowerCase() === 'saldo') {
            cleanDescription = category; 
        }

        if(amount > 0){
          return { intent: b.intent, payload:{ 
              amount, 
              category: category, 
              description: cleanDescription 
          }, match: m };
        }
      } 
      // Tambah Tugas
      else if(b.intent === 'add_task'){
        const title = m[3] ? m[3].trim() : ''; // Judul di Grup 3
        const dateString = m[5] ? m[5].trim() : null; // Tanggal di Grup 5 (dari grup opsional ke-4)
        return { intent:'add_task', payload:{ title, dateString }, match: m };
      } 
      // Selesai Tugas
      else if (b.intent === 'complete_task') {
        const title = m[1] ? m[1].trim() : ''; // Judul di Grup 1
        const dateString = m[3] ? m[3].trim() : null; // Tanggal di Grup 3 (dari grup opsional ke-2)
        return { intent: 'complete_task', payload: { title, dateString }, match: m };
      }
      // Cek Jadwal
      else if (b.intent === 'check_tasks') {
        const dateString = m[3] ? m[3].trim() : 'hari ini';
        return { intent: 'check_tasks', payload: { dateString }, match: m };
      }
       // Tambah Jadwal
      else if (b.intent === 'add_schedule') {
        const title = m[3] ? m[3].trim() : ''; // Judul di Grup 3
        const dateString = m[4] ? m[4].trim() : ''; // Tanggal di Grup 4
        return { intent: 'add_schedule', payload: { title, dateString }, match: m };
      }
      // Tambah Pengingat
      else if (b.intent === 'add_reminder') {
        const title = m[2] ? m[2].trim() : ''; // Judul di Grup 2
        const dateString = m[3] ? m[3].trim() : ''; // Tanggal di Grup 3
        return { intent: 'add_reminder', payload: { title, dateString }, match: m };
      }
      // Intent Sederhana
      else { 
        return { intent: b.intent, payload: {}, match: m };
      }
      // --- Akhir Logika Ekstraksi ---
    }
  }
  
  // 2) Try DB (Custom)
  const dbMatch = matchWithDB(text);
  if(dbMatch){
     return { intent: dbMatch.entry.intent, payload: { raw: message }, match: dbMatch.match };
  }

  // 3) no match
  return { intent: null, payload: {}, match: null };
}

/**
 * Mengambil respons acak dari kamus dan mengisi data dinamis.
 */
function getResponse(key, data = {}) {
  const templates = RESPONSE_TEMPLATES[key];
  if (!templates) {
      console.warn(`Kunci respons AI tidak ditemukan: ${key}`);
      return "Maaf, terjadi error di respons AI.";
  }
  const template = templates[Math.floor(Math.random() * templates.length)];
  let response = template;
  for (const placeholder in data) {
      response = response.replace(new RegExp(`{${placeholder}}`, 'g'), data[placeholder]);
  }
  return response;
}

/**
 * Mengambil daftar slash command
 */
function getSlashCommands() {
    return SLASH_COMMANDS;
}


// Ekspor semua fungsi publik
export {
  initNLU,
  listNLUEntries,
  addNLUEntry,
  removeNLUEntry,
  clearNLUDb,
  parseUserMessage,
  parseAmount,
  getResponse, 
  getSlashCommands
};