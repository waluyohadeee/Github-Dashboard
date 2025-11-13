// nlu.js
// Modul NLU sederhana untuk Dashboard Pelajar
// - DB disimpan di localStorage (key: 'nlu_db')
// - Entry shape: { id, name, intent, type: 'regex'|'keyword', pattern, payloadTemplate, examples[] }

const STORAGE_KEY = 'nlu_db';

// Default built-in patterns (fallback)
const builtin = [
  {
    id: 'builtin_expense',
    name: 'builtin-expense',
    intent: 'add_expense',
    type: 'regex',
    // captures: category (group 1) amount (group 3) unit (group 4)
    pattern: /(beli|membeli|bayar|mengeluarkan|pengeluaran|keluar).*?(kuota|pulsa|makanan|makan|transport|tiket|minuman|belanja|lain|uang)?[^\d]*?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?|\d+)(\s*(rb|ribu|k|k?))?/i,
    payloadTemplate: null,
    examples: ['saya membeli kuota 50rb', 'beli makan 20k']
  },
  {
    id: 'builtin_task',
    name: 'builtin-task',
    intent: 'add_task',
    type: 'regex', // simple keyword rule as regex
    pattern: /(tambah|buat|tambahkan|ingatkan).*?(tugas|pekerjaan|PR|tulisan|project|todolist|to do)/i,
    payloadTemplate: null,
    examples: ['tambah tugas kerjakan PR', 'ingatkan saya tugas fisika']
  },
  {
    id: 'builtin_done',
    name: 'builtin-done',
    intent: 'complete_task',
    type: 'regex',
    pattern: /(selesai|sudah selesai|sudah|done).*(tugas)?/i,
    payloadTemplate: null,
    examples: ['sudah selesai tugas', 'tugas done']
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

// Try to build regex safely from string pattern (if pattern is regex object, keep it)
function ensureRegex(p){
  if(!p) return null;
  if(p instanceof RegExp) return p;
  try {
    // allow users to pass '/.../i' style or plain string
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

// Initialize NLU: ensure DB exists, seed defaults if empty
function initNLU(options = { seedBuiltin: true }){
  const existing = loadDB();
  if(existing.length === 0 && options.seedBuiltin){
    // store builtins as DB entries too (so user can view/edit them later)
    const seed = builtin.map(b => {
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

// List entries
function listNLUEntries(){
  return loadDB();
}

// Add entry (returns saved entry)
function addNLUEntry({ name, intent, type='keyword', pattern, payloadTemplate=null, examples=[] }){
  const db = loadDB();
  const entry = {
    id: uid('nlu'),
    name: name || ('nlu_' + intent),
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

// Remove entry by id
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

// Clear DB (dangerous)
function clearNLUDb(){
  saveDB([]);
}

// Try to match message with DB entries (regex or keyword)
function matchWithDB(message){
  const db = loadDB();
  const text = (message || '').toString();
  for(const e of db){
    if(e.type === 'regex'){
      const rx = ensureRegex(e.pattern);
      if(!rx) continue;
      const m = text.match(rx);
      if(m){
        // return match info + captured groups
        return { entry: e, match: m };
      }
    } else { // keyword
      const kw = (e.pattern || '').toLowerCase();
      if(kw && text.toLowerCase().includes(kw)){
        return { entry: e, match: null };
      }
    }
  }
  return null;
}

// parseAmount helper (same logic as original)
function parseAmount(raw, unitPart){
  if(!raw) return 0;
  let s = String(raw).replace(/\s+/g,'').replace(/,/g,'.');
  s = s.replace(/[^0-9.]/g,'');
  const dotCount = (s.match(/\./g)||[]).length;
  if(dotCount > 1){
    s = s.replace(/\./g,'');
  }
  let num = parseFloat(s);
  if(isNaN(num)) num = 0;

  unitPart = (unitPart || '').toLowerCase();
  if(/rb|ribu|k/.test(unitPart) || /rb|ribu|k/.test(raw.toLowerCase())){
    num = num * 1000;
  }
  return Math.round(num);
}

// Main parse function: attempts DB first, then fallback builtin heuristics
function parseUserMessage(message){
  const text = (message || '').toString();
  // 1) Try DB
  const dbMatch = matchWithDB(text);
  if(dbMatch){
    const e = dbMatch.entry;
    // If entry is regex and has match groups, allow basic extraction for common intents
    if(e.intent === 'add_expense' && dbMatch.match){
      // attempt capture similar to builtin: category in group 1 or 2, amount in group 3, unit in group 4
      const m = dbMatch.match;
      const rawAmount = m[3] || m[2] || '';
      const unit = (m[4] || '').toLowerCase();
      const amount = parseAmount(rawAmount, unit);
      const category = m[2] || 'Pengeluaran';
      if(amount>0){
        return { intent:'add_expense', payload:{ amount, category: (category||'Pengeluaran').trim(), description: message } };
      }
    } else if(e.intent === 'add_task'){
      // try to extract title by removing the matched keyword part
      let title = text;
      if(dbMatch.match && dbMatch.match.index !== undefined){
        // remove matched substring
        const matchedText = dbMatch.match[0];
        title = text.replace(matchedText, '').trim() || text;
      } else {
        // keyword entry: remove the keyword
        title = text.replace(e.pattern, '').trim() || text;
      }
      return { intent:'add_task', payload:{ title } };
    } else if(e.intent === 'complete_task'){
      return { intent:'complete_task', payload: {} };
    } else {
      // Generic mapping: return the declared intent with raw payload
      return { intent: e.intent, payload: { raw: message } };
    }
  }

  // 2) DB not matched -> fallback to built-in regex heuristics
  for(const b of builtin){
    const rx = (b.pattern instanceof RegExp) ? b.pattern : ensureRegex(b.pattern);
    if(!rx) continue;
    const m = text.match(rx);
    if(m){
      // reuse the same extraction logic as earlier for common intents
      if(b.intent === 'add_expense'){
        const rawAmount = m[3] || '';
        const unit = (m[4] || '').toLowerCase();
        const amount = parseAmount(rawAmount, unit);
        const category = m[2] || 'Pengeluaran';
        if(amount > 0){
          return { intent:'add_expense', payload:{ amount, category: (category||'Pengeluaran').trim(), description: message } };
        }
      } else if(b.intent === 'add_task'){
        const after = text.split(rx)[2] || '';
        const title = after.trim() || message;
        return { intent:'add_task', payload:{ title } };
      } else if(b.intent === 'complete_task'){
        return { intent:'complete_task', payload: {} };
      }
    }
  }

  // 3) no match
  return { intent: null, payload: {} };
}

// Exported API
export {
  initNLU,
  listNLUEntries,
  addNLUEntry,
  removeNLUEntry,
  clearNLUDb,
  parseUserMessage,
  parseAmount
};
