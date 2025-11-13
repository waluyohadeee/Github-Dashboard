// app.js
import { initNLU, parseUserMessage, addNLUEntry, listNLUEntries } from './nlu.js';

(function(){
  // init NLU DB (seeds builtin entries if DB kosong)
  initNLU({ seedBuiltin: true });

  // ========== Config & State ==========
  const STORAGE_KEY = 'student_dashboard_v1';
  const appState = {
    balance: 200000,
    finances: [],
    tasks: [],
    productivity: 78,
    schedulesToday: 1
  };

  // ========== Helpers ==========
  function formatIDR(n){
    try {
      return (Number(n) || 0).toLocaleString('id-ID', { style:'currency', currency:'IDR' });
    } catch(e){
      return 'Rp' + n;
    }
  }

  function uid(prefix='id'){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }

  // ========== Persistence ==========
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        Object.assign(appState, parsed);
      } else {
        save();
      }
    } catch(e){
      console.warn('load error', e);
    }
  }

  function save(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }catch(e){
      console.warn('save failed', e);
    }
  }

  // ========== UI refs ==========
  const summaryBalance = document.getElementById('summary-balance');
  const summaryTasks = document.getElementById('summary-tasks');
  const summarySchedule = document.getElementById('summary-schedule');
  const summaryProductivity = document.getElementById('summary-productivity');

  const financeList = document.getElementById('finance-list');
  const tasksList = document.getElementById('tasks-list');
  const taskCount = document.getElementById('task-count');

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const statusEl = document.getElementById('status');

  // ========== Render functions ==========
  function renderSummary(){
    summaryBalance.textContent = formatIDR(appState.balance || 0);
    summaryTasks.textContent = (appState.tasks.filter(t=>t.status!=='done').length || 0) + ' tugas';
    summarySchedule.textContent = (appState.schedulesToday || 0) + ' kegiatan';
    summaryProductivity.textContent = (appState.productivity || 0) + '%';
    taskCount.textContent = (appState.tasks.filter(t=>t.status!=='done').length || 0);
  }

  function renderFinances(){
    financeList.innerHTML = '';
    if(appState.finances.length === 0){
      financeList.innerHTML = '<div class="muted small">Belum ada transaksi.</div>';
      return;
    }
    appState.finances.slice().reverse().forEach(tx=>{
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = `<div style="flex:1">
          <div style="font-weight:600">${tx.category || 'Pengeluaran'}</div>
          <div class="muted small">${tx.description || ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">${formatIDR(tx.amount)}</div>
          <div class="muted small">${new Date(tx.date).toLocaleString()}</div>
        </div>`;
      financeList.appendChild(el);
    });
  }

  function renderTasks(){
    tasksList.innerHTML = '';
    if(appState.tasks.length === 0){
      tasksList.innerHTML = '<div class="muted small">Tidak ada tugas.</div>';
      return;
    }
    appState.tasks.forEach(t=>{
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `<div style="flex:1">
          <div style="font-weight:600">${t.title}</div>
          <div class="muted small">Due: ${t.due? new Date(t.due).toLocaleDateString() : '-'}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ghost" data-id="${t.id}" data-action="toggle">${t.status==='done'?'Undo':'Selesai'}</button>
          <button class="btn" data-id="${t.id}" data-action="del">Hapus</button>
        </div>`;
      tasksList.appendChild(div);
    });
  }

  function renderAll(){
    renderSummary();
    renderFinances();
    renderTasks();
  }

  // ========== Actions ==========
  function addExpense(amount, category, description){
    const tx = { id: uid('tx'), amount: Math.abs(Number(amount)), category, description, date: new Date().toISOString() };
    appState.finances.push(tx);
    appState.balance = (Number(appState.balance) || 0) - tx.amount;
    save(); renderAll();
    appendChatAI(`✅ Tercatat: pengeluaran ${category} ${formatIDR(tx.amount)}. Saldo sekarang ${formatIDR(appState.balance)}.`);
    statusEl.textContent = 'Pengeluaran ditambahkan';
  }

  function addTask(title){
    const t = { id: uid('tsk'), title, due:null, status:'pending', created: new Date().toISOString() };
    appState.tasks.push(t);
    save(); renderAll();
    appendChatAI(`✅ Tugas ditambahkan: "${title}"`);
    statusEl.textContent = 'Tugas dibuat';
  }

  function completeOneTask(){
    const idx = appState.tasks.findIndex(t=>t.status!=='done');
    if(idx === -1){
      appendChatAI('ℹ️ Tidak ada tugas pending untuk ditandai selesai.');
      return;
    }
    appState.tasks[idx].status = 'done';
    save(); renderAll();
    appendChatAI(`✅ Tugas "${appState.tasks[idx].title}" ditandai selesai.`);
    statusEl.textContent = 'Tugas selesai';
  }

  // ========== Chat UI ==========
  function appendChatUser(text){
    const d = document.createElement('div');
    d.className = 'msg user';
    d.textContent = text;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendChatAI(text){
    const d = document.createElement('div');
    d.className = 'msg ai';
    d.textContent = text;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  appendChatAI('Halo! Saya siap bantu — coba ketik: "saya hari ini membeli kuota dengan harga 50rb" atau "tambah tugas kerjakan PR".');

  function handleChatSend(){
    const txt = chatInput.value.trim();
    if(!txt) return;
    appendChatUser(txt);
    chatInput.value = '';
    statusEl.textContent = 'Memproses pesan...';

    // <-- use parseUserMessage from nlu.js now
    const parsed = parseUserMessage(txt);

    if(parsed.intent === 'add_expense'){
      addExpense(parsed.payload.amount, parsed.payload.category, parsed.payload.description);
    } else if(parsed.intent === 'add_task'){
      addTask(parsed.payload.title || txt);
    } else if(parsed.intent === 'complete_task'){
      completeOneTask();
    } else {
      appendChatAI('🤖 (Demo) Saya tidak menemukan perintah otomatis di pesan itu. Saya bisa: menambah pengeluaran atau tugas. Contoh: "membeli kuota 50rb", "tambah tugas kerjakan PR".');
      statusEl.textContent = 'Chat (no-op)';
    }
  }

  // ========== Event bindings ==========
  chatSend.addEventListener('click', handleChatSend);
  chatInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') handleChatSend();
  });

  // the rest of event bindings (btn-add-expense, tasks delegation, menu) stay the same...
  // ... (copy the remaining code from your previous app.js for those handlers) ...

  // init
  load();
  renderAll();
  // tombol tugas
document.addEventListener('DOMContentLoaded', () => {
  // cari tombol tugas
  const tasksBtn = document.querySelector('[data-view="tasks"]');

  if (tasksBtn) {
    tasksBtn.addEventListener('click', (e) => {
      // mencegah perilaku default bila tombol berada di form
      e.preventDefault();
      // langsung buka task.html
      window.location.href = 'task.html';
    });
  }
});
})();
