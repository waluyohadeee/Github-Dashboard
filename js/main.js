// app.js
import { 
  initNLU, 
  parseUserMessage, 
  getResponse, 
  getSlashCommands 
} from './nlu.js';

(function(){
  // init NLU DB
  initNLU({ seedBuiltin: true });

  // Ambil daftar command dari nlu.js
  const SLASH_COMMANDS = getSlashCommands();

  // ========== Config & State ==========
  const DASHBOARD_STORAGE_KEY = 'student_dashboard_v1';
  const TASK_STORAGE_KEY = 'student_tasks_v1'; 
  const SCHEDULE_STORAGE_KEY = 'jadwal'; 
  
  const appState = {
    balance: 200000,
    finances: [],
    tasks: [], 
    schedules: [], // Ini akan menyimpan Events dan Reminders
    productivity: 78,
    schedulesToday: 0
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

  function taskUid(){ 
    return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); 
  }
  
  function eventUid(){ 
    return "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); 
  }
  
  // === Helper Tanggal (Logika Kalender) BARU ===
  const DAY_MAP = { 'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6 };
  const MONTH_MAP = { 'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11 };

  function isSameDay(date1, date2) {
      if (!date1 || !date2) return false;
      // Perbandingan tanggal tanpa mempedulikan jam
      const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
      const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
      return d1.getTime() === d2.getTime();
  }
  
  function isToday(dateStr) {
      if (!dateStr) return false;
      let date = new Date(dateStr);
      // Koreksi offset jika string tidak mengandung info Timezone (YYYY-MM-DD)
      if (dateStr.length <= 10) {
         date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      }
      return isSameDay(date, new Date());
  }
  
  function isTomorrow(dateStr) {
      if (!dateStr) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      let date = new Date(dateStr);
      if (dateStr.length <= 10) {
         date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      }
      return isSameDay(date, tomorrow);
  }
  
  /**
   * Mengubah string tanggal (seperti "hari rabu") menjadi format YYYY-MM-DD
   * @param {string} dateString - Teks input (cth: "hari rabu", "besok", "15 november")
   * @returns {{date: string|null, when: string}}
   */
  function parseDateFromText(dateString) {
      const str = (dateString || '').toLowerCase().trim();
      const today = new Date();
      let targetDate = new Date(today); // Salin objek today
      let when = "hari ini";

      if (!str) {
          return { date: null, when: null }; // Tidak ada tanggal
      }

      if (str.includes('hari ini')) {
          when = "hari ini";
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          return { date: todayStr, when }; 
      }
      
      if (str.includes('besok')) {
          targetDate.setDate(today.getDate() + 1);
          when = "besok";
      }
      // Cek nama hari (cth: "hari rabu")
      else if (Object.keys(DAY_MAP).some(day => str.includes(day))) {
          const dayName = Object.keys(DAY_MAP).find(day => str.includes(day));
          const targetDay = DAY_MAP[dayName];
          const currentDay = today.getDay();
          
          let dayDiff = targetDay - currentDay;
          if (dayDiff <= 0) { // Jika hari ini atau sudah lewat, maksudnya minggu depan
              dayDiff += 7;
          }
          targetDate.setDate(today.getDate() + dayDiff);
          when = `hari ${dayName}`;
      }
      // Cek tanggal spesifik (cth: "15 november" atau "tanggal 19")
      else {
          const matchDate = str.match(/(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/);
          const matchDay = str.match(/(?:tanggal)?\s*(\d{1,2})/); // Cth: "tanggal 19"

          if (matchDate) { // "15 november"
            const day = parseInt(matchDate[1]);
            const month = MONTH_MAP[matchDate[2]];
            let year = today.getFullYear(); 
            
            if (month < today.getMonth() || (month === today.getMonth() && day < today.getDate())) {
                year = year + 1; // Asumsi tahun depan jika tanggal sudah lewat
            }
            targetDate = new Date(year, month, day);
            when = `tanggal ${day} ${matchDate[2]}`;
          } else if (matchDay) { // "tanggal 19"
             const day = parseInt(matchDay[1]);
             targetDate.setDate(day); // Asumsi bulan ini
             if (targetDate.getDate() !== day) { // Handle tgl 31 di bulan Feb
                 targetDate.setMonth(targetDate.getMonth() + 1, 0); // Mundur ke hari terakhir bulan lalu
             }
             if (targetDate < today && !(isSameDay(targetDate, today))) { // Jika tanggal 19 sudah lewat
                 targetDate.setMonth(today.getMonth() + 1); // Maksudnya bulan depan
             }
             when = `tanggal ${day}`;
          } else {
             return { date: null, when: null }; // Tidak mengenali format tanggal
          }
      }
      
      // Format ke YYYY-MM-DD
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      
      return { date: `${yyyy}-${mm}-${dd}`, when };
  }
  
  // === AKHIR HELPER BARU ===


  // ========== Persistence (Sinkronisasi Penuh) ==========
  
  function load(){
    // 1. Load data Dashboard
    try {
      const rawDashboard = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if(rawDashboard){
        const parsed = JSON.parse(rawDashboard);
        delete parsed.tasks; 
        delete parsed.schedules;
        Object.assign(appState, parsed);
      } else {
        save(); 
      }
    } catch(e){ console.warn('load error (dashboard)', e); }

    // 2. Load data Tugas
    try {
      const rawTasks = localStorage.getItem(TASK_STORAGE_KEY);
      if(rawTasks){
        appState.tasks = JSON.parse(rawTasks).tasks || [];
      } else {
        appState.tasks = []; 
      }
    } catch(e) { console.warn('load error (tasks)', e); appState.tasks = []; }
    
    // 3. Load data Jadwal (Events & Reminders)
    try {
      const rawSchedules = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if(rawSchedules){
        const data = JSON.parse(rawSchedules);
         if (Array.isArray(data)) { // Migrasi format lama
            appState.schedules = data.map(d => ({...d, type: d.type || 'event'}));
            saveEvents(); // Simpan ulang dalam format baru
        } else if (data.events) {
            appState.schedules = data.events;
        }
      } else {
        appState.schedules = [];
      }
    } catch(e) { console.warn('load error (schedules)', e); appState.schedules = []; }
    
    // Sinkronkan jadwal hari ini
    appState.schedulesToday = appState.schedules.filter(s => isToday(s.start || s.waktu)).length;
  }

  function save(){
    try{
      const stateToSave = { ...appState };
      delete stateToSave.tasks; 
      delete stateToSave.schedules;
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(stateToSave));
    }catch(e){ console.warn('save failed', e); }
  }

  function saveTasks() {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({ tasks: appState.tasks }));
    } catch(e) { console.warn('saveTasks failed', e); }
  }
  
  function saveEvents() {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({ events: appState.schedules }));
    } catch(e) { console.warn('saveEvents failed', e); }
  }


  // ========== UI refs ==========
  const summaryBalance = document.getElementById('summary-balance');
  const summaryTasks = document.getElementById('summary-tasks');
  const summarySchedule = document.getElementById('summary-schedule');
  const summaryProductivity = document.getElementById('summary-productivity');

  const financeList = document.getElementById('finance-list');
  const tasksList = document.getElementById('tasks-list');
  const taskCount = document.getElementById('task-count');
  
  const newTaskInput = document.getElementById('new-task-input');
  const btnAddTask = document.getElementById('btn-add-task');
  const btnCompleteSim = document.getElementById('btn-complete-sim');

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const statusEl = document.getElementById('status');
  const chatSuggestions = document.getElementById('chat-suggestions');


  // ========== Render functions ==========
  function renderSummary(){
    summaryBalance.textContent = formatIDR(appState.balance || 0);
    const pendingTasks = appState.tasks.filter(t=>t.status!=='done').length || 0;
    summaryTasks.textContent = pendingTasks + ' tugas';
    summarySchedule.textContent = (appState.schedulesToday || 0) + ' kegiatan';
    summaryProductivity.textContent = (appState.productivity || 0) + '%';
    taskCount.textContent = pendingTasks;
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
      const isIncome = tx.category === 'Pemasukan';
      const iconClass = isIncome ? 'income' : 'expense';
      const iconSymbol = isIncome ? '↑' : '↓';
      const cleanDescription = tx.description || (isIncome ? 'Pemasukan' : 'Pengeluaran');

      el.innerHTML = `
        <div class="finance-icon ${iconClass}">${iconSymbol}</div>
        <div style="flex:1">
          <div style="font-weight:600">${tx.category}</div>
          <div class="muted small">${cleanDescription}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600; color: ${isIncome ? '#067647' : '#b91c1c'}">
            ${isIncome ? '+' : '-'} ${formatIDR(tx.amount)}
          </div>
          <div class="muted small">${new Date(tx.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>`;
      financeList.appendChild(el);
    });
  }

  function renderTasks(){
    tasksList.innerHTML = '';
    const pendingTasks = appState.tasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
          if (a.important !== b.important) { return a.important ? -1 : 1; }
          const isAHigh = a.priority === 'high';
          const isBHigh = b.priority === 'high';
          if (isAHigh !== isBHigh) { return isAHigh ? -1 : 1; }
          const isAMedium = a.priority === 'medium';
          const isBMedium = b.priority === 'medium';
          if (isAMedium !== isBMedium) { return isAMedium ? -1 : 1; }
          const dueA = a.due || '9999-12-31'; 
          const dueB = b.due || '9999-12-31';
          return dueA.localeCompare(dueB);
      });
    
    if(pendingTasks.length === 0){
      tasksList.innerHTML = '<div class="muted small">Tidak ada tugas.</div>';
      return;
    }
    
    pendingTasks.slice(0, 5).forEach(t=>{ 
      const div = document.createElement('div');
      div.className = 'list-item';
      let priorityLabel = '';
      if (t.important) {
          priorityLabel = '<span class="task-label important">Penting</span>';
      } else if (t.priority === 'high') {
          priorityLabel = '<span class="task-label urgent">Urgent</span>';
      }
      div.innerHTML = `<div style="flex:1">
          <div style="font-weight:600">${t.title}</div>
          <div class="muted small">Due: ${t.due ? new Date(t.due).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${priorityLabel}
          <button class="btn ghost" data-id="${t.id}" data-action="toggle">Selesai</button>
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

  // ========== Actions (Sinkronisasi Penuh) ==========
  
  function addExpense(amount, category, description){
    // category = "Pengeluaran", description = "kuota"
    const tx = { id: uid('tx'), amount: Math.abs(Number(amount)), category, description, date: new Date().toISOString() };
    appState.finances.push(tx);
    appState.balance = (Number(appState.balance) || 0) - tx.amount;
    save(); 
    renderAll();
    const response = getResponse('add_expense', {
      CATEGORY: description || 'Lainnya',
      AMOUNT: formatIDR(tx.amount),
      BALANCE: formatIDR(appState.balance)
    });
    appendChatAI(response);
    statusEl.textContent = 'Pengeluaran ditambahkan';
  }

  function addIncome(amount, description = "Pemasukan") {
      // category = "Pemasukan", description = "uang dari mama"
      const tx = { id: uid('tx'), amount: Math.abs(Number(amount)), category: "Pemasukan", description, date: new Date().toISOString() };
      appState.finances.push(tx); 
      appState.balance = (Number(appState.balance) || 0) + tx.amount;
      save(); 
      renderAll();
      const response = getResponse('add_income', {
          AMOUNT: formatIDR(tx.amount),
          BALANCE: formatIDR(appState.balance)
      });
      appendChatAI(response);
      statusEl.textContent = 'Pemasukan ditambahkan';
  }

  // REVISI BESAR: addTask sekarang mengurai tanggal dari judul
  function addTask(title, dateString = null){
    if (!title || !title.trim()) {
        if (document.activeElement !== newTaskInput) {
            appendChatAI(getResponse('fallback'));
        }
        return;
    }
    
    // AI mengekstrak tanggal dari judul di sini
    const { date: dueDate, when } = parseDateFromText(dateString);
    
    const t = { 
      id: taskUid(), 
      title: title, // Judul bersih (cth: "matematika")
      type: "personal", 
      important: false, 
      start: null, 
      due: dueDate, // Tanggal kumpul (cth: "2025-11-19")
      priority: "medium", 
      status: "pending" 
    };
    
    appState.tasks.push(t);
    saveTasks(); 
    renderAll();
    
    if (document.activeElement !== newTaskInput) {
      if (dueDate) {
        appendChatAI(getResponse('add_task_with_date', { TITLE: t.title, WHEN: when }));
      } else {
        appendChatAI(getResponse('add_task', { TITLE: t.title }));
      }
    }
    statusEl.textContent = 'Tugas dibuat';
  }
  
  // REVISI: Fungsi baru untuk menambah Jadwal & Pengingat
  function addScheduleOrReminder(type, title, dateString) {
      if (!title || !dateString) {
          appendChatAI(getResponse('fallback'));
          return;
      }
      
      const { date, when } = parseDateFromText(dateString);
      
      if (!date) {
          appendChatAI(getResponse('fallback'));
          return;
      }
      
      // AI tidak tahu jam, jadi set default jam 12:00
      const dateTime = `${date}T12:00`;
      
      const newItem = {
          id: eventUid(),
          title: title,
          category: type === 'event' ? 'Acara' : 'Pengingat',
          type: type, // 'event' or 'reminder'
          start: dateTime, // 'start' untuk event/reminder
          end: null
      };
      
      appState.schedules.push(newItem); // Tambah ke state lokal
      saveEvents(); // Simpan ke localStorage
      load(); // Muat ulang semua data agar sinkron
      renderAll();
      
      if (type === 'event') {
          appendChatAI(getResponse('add_schedule', { TITLE: title, WHEN: when }));
      } else {
          appendChatAI(getResponse('add_reminder', { TITLE: title, WHEN: when }));
          // (Anda bisa tambahkan logika notifikasi di sini jika mau)
      }
  }

  // REVISI BESAR: completeTask sekarang mencari berdasarkan nama DAN tanggal
  function completeTask(title = "", dateString = null){
    let taskToMark = null;
    let when = ""; // Untuk pesan respons
    let dateCheckFn = (t) => true; // Default: cek semua tanggal

    // 1. Cek apakah user memberi tanggal
    if (dateString) {
        const parsedDate = parseDateFromText(dateString);
        if(parsedDate.date) {
            const targetDate = new Date(parsedDate.date);
            // Tambah 1 hari ke targetDate karena masalah timezone
            targetDate.setDate(targetDate.getDate() + 1);
            dateCheckFn = (t) => t.due && isSameDay(new Date(t.due), targetDate);
            when = " " + parsedDate.when; // cth: " hari rabu"
        }
    }

    // 2. Filter tugas yang belum selesai
    let candidates = appState.tasks.filter(t => t.status !== 'done');

    if (title && title.toLowerCase() !== 'tugas' && title.toLowerCase() !== 'pr') {
      // 3A. User memberi NAMA TUGAS
      const words = title.toLowerCase().split(' ');
      
      // Filter berdasarkan nama, LALU berdasarkan tanggal
      candidates = candidates
        .filter(t => words.every(w => t.title.toLowerCase().includes(w))) // Filter nama
        .filter(dateCheckFn); // Terapkan filter tanggal
      
      taskToMark = candidates[0]; // Ambil yang pertama cocok
      
      if (!taskToMark) {
        appendChatAI(getResponse('complete_task_not_found', { TITLE: title, WHEN: when }));
        return;
      }
    } else {
      // 3B. User TIDAK memberi nama (cth: "selesaikan tugas")
      // Cari tugas prioritas tertinggi
      candidates.sort((a, b) => {
          if (a.important !== b.important) { return a.important ? -1 : 1; }
          const isAHigh = a.priority === 'high';
          const isBHigh = b.priority === 'high';
          if (isAHigh !== isBHigh) { return isAHigh ? -1 : 1; }
          const isAMedium = a.priority === 'medium';
          const isBMedium = b.priority === 'medium';
          if (isAMedium !== isBMedium) { return isAMedium ? -1 : 1; }
          const dueA = a.due || '9999-12-31'; 
          const dueB = b.due || '9999-12-31';
          return dueA.localeCompare(dueB);
      });

      if (candidates.length === 0) {
        appendChatAI(getResponse('complete_task_none'));
        return;
      }
      taskToMark = candidates[0];
    }
    
    // 4. Tandai tugas yang ditemukan
    taskToMark.status = 'done';
    saveTasks(); 
    renderAll();
    appendChatAI(getResponse('complete_task_one', { TITLE: taskToMark.title }));
    statusEl.textContent = 'Tugas selesai';
  }
  
  function toggleTaskStatus(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
      task.status = task.status === 'done' ? 'pending' : 'done';
      saveTasks();
      renderAll();
    }
  }
  
  function deleteTask(id) {
    if (confirm("Anda yakin ingin menghapus tugas ini?")) {
      appState.tasks = appState.tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    }
  }

  // ========== Chat UI (Logika Inti AI) ==========
  
  function renderSuggestions(suggestions = []) {
    if (!chatSuggestions) return; 
    chatSuggestions.innerHTML = '';
    if (suggestions.length === 0) {
      chatSuggestions.style.display = 'none'; 
      return;
    }
    chatSuggestions.style.display = 'flex'; 
    chatSuggestions.className = 'suggestions'; 
    const suggestionType = typeof suggestions[0];

    if (suggestionType === 'object') {
      chatSuggestions.classList.add('command-palette'); 
      suggestions.forEach(cmd => {
        const btn = document.createElement('button');
        btn.className = 'command-suggestion';
        btn.innerHTML = `<strong>${cmd.command}</strong> <span>${cmd.description}</span>`;
        btn.onclick = () => {
          chatInput.value = cmd.command + ' '; 
          chatInput.focus();
          renderSuggestions([]); 
        };
        chatSuggestions.appendChild(btn);
      });
    } else {
      suggestions.forEach(text => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.onclick = () => {
          chatInput.value = text;
          handleChatSend();
          renderSuggestions([]); 
        };
        chatSuggestions.appendChild(btn);
      });
    }
  }
  
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
    d.innerHTML = text.replace(/\n/g, '<br>');
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  appendChatAI(getResponse('greeting_initial'));

  function handleChatSend(){
    const txt = chatInput.value.trim();
    if(!txt) return;
    appendChatUser(txt);
    chatInput.value = '';
    statusEl.textContent = 'Memproses pesan...';
    renderSuggestions([]); 

    if (txt.startsWith('/')) {
      executeCommand(txt);
    } else {
      executeNLU(txt);
    }
  }
  
  // REVISI: executeCommand sekarang bisa "melihat" kalender
  function executeCommand(command) {
    const parts = command.split(' ');
    const cmdBase = parts[0]; 
    const dateString = parts.length > 1 ? parts.slice(1).join(' ') : 'hari ini';
    
    // Gunakan parser tanggal baru
    const { fn: dateCheckFn, when } = parseDateFromText(dateString);

    if (cmdBase === '/help') {
      appendChatAI(getResponse('help'));
      renderSuggestions(['/saldo', '/jadwal', '/jadwal besok']);
      
    } else if (cmdBase === '/saldo') {
      appendChatAI(getResponse('check_balance', { BALANCE: formatIDR(appState.balance) }));
      renderSuggestions(['/help', '/jadwal', 'Tambah saldo 100rb']);
      
    } else if (cmdBase === '/jadwal' || cmdBase === '/tugas') {
      // AI "Melihat" resource dari js/task.js
      const pendingTasks = appState.tasks.filter(t => 
        t.status !== 'done' && (t.due ? dateCheckFn(t.due) : (when === "hari ini" && !t.due))
      ).length;
      
      // AI "Melihat" resource dari js/jadwal.js
      const pendingSchedules = appState.schedules.filter(s => 
        s.start ? dateCheckFn(s.start) : false // Ganti 'waktu' ke 'start'
      ).length;

      if (pendingTasks === 0 && pendingSchedules === 0) {
        appendChatAI(getResponse('check_tasks_none', { WHEN: when }));
      } else {
        appendChatAI(getResponse('check_tasks_found', { 
          WHEN: when, 
          TASKS: pendingTasks, 
          SCHEDULES: pendingSchedules 
        }));
      }
      renderSuggestions(['/help', '/saldo', (when === "hari ini" ? "/jadwal besok" : "/jadwal")]);
      
    } else {
      appendChatAI(getResponse('command_unknown', { COMMAND: cmdBase }));
      renderSuggestions(['/help', '/saldo', '/jadwal']);
    }
  }
  
  // REVISI: executeNLU sekarang terhubung dengan semua intent baru
  function executeNLU(txt) {
    const parsed = parseUserMessage(txt);

    if(parsed.intent === 'add_expense'){
      addExpense(parsed.payload.amount, parsed.payload.category, parsed.payload.description);
      renderSuggestions(['Beli makan 20rb', 'Cek saldo']); 
    
    } else if(parsed.intent === 'add_income'){
      addIncome(parsed.payload.amount, parsed.payload.description);
      renderSuggestions(['Beli pulsa 20rb', '/saldo']); 
      
    } else if(parsed.intent === 'add_task'){
      // Kirim judul DAN tanggal (jika ada) ke addTask
      addTask(parsed.payload.title, parsed.payload.dateString); 
      const firstWord = parsed.payload.title.split(' ')[0];
      renderSuggestions([`Selesaikan ${firstWord}`, '/jadwal']); 
      
    } 
    // === REVISI: Hubungkan intent baru ===
    else if (parsed.intent === 'add_schedule') {
      addScheduleOrReminder('event', parsed.payload.title, parsed.payload.dateString);
      renderSuggestions(['/jadwal', '/saldo']);
    }
    else if (parsed.intent === 'add_reminder') {
      addScheduleOrReminder('reminder', parsed.payload.title, parsed.payload.dateString);
      renderSuggestions(['/jadwal', '/saldo']);
    }
    // === AKHIR REVISI ===
    else if(parsed.intent === 'complete_task'){
      // Kirim judul DAN tanggal (jika ada) ke completeTask
      completeTask(parsed.payload.title, parsed.payload.dateString);
      renderSuggestions(['/jadwal', '/saldo']); 
      
    } else if (parsed.intent === 'check_balance') {
      executeCommand('/saldo'); 
      
    } else if (parsed.intent === 'check_tasks') {
      // Kirim string tanggal yang ditangkap ke executeCommand
      executeCommand('/jadwal ' + parsed.payload.dateString); 
      
    } else if (parsed.intent === 'greeting') {
      appendChatAI(getResponse('greeting'));
      renderSuggestions(['Bantuan', '/saldo', 'Tambah tugas']);
      
    } else if (parsed.intent === 'help') {
      executeCommand('/help'); 
      
    } else {
      appendChatAI(getResponse('fallback'));
      renderSuggestions(['Bantuan', '/saldo', 'Tambah tugas']); 
    }
  }

  // ========== Event bindings ==========
  chatSend.addEventListener('click', handleChatSend);
  
  chatInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') {
      const commandSuggestions = chatSuggestions.querySelector('.command-suggestion');
      if (commandSuggestions && chatInput.value.startsWith('/')) {
        chatInput.value = commandSuggestions.querySelector('strong').textContent + ' ';
      }
      handleChatSend();
    }
  });
  
  chatInput.addEventListener('input', () => {
    const text = chatInput.value;
    if (text.startsWith('/')) {
      const query = text.toLowerCase();
      const matches = SLASH_COMMANDS.filter(cmd => cmd.command.startsWith(query));
      renderSuggestions(matches);
    } else {
      if (chatSuggestions.classList.contains('command-palette')) {
         renderSuggestions([]);
      }
    }
  });
  
  document.addEventListener('click', (e) => {
    const chatContainer = e.target.closest('.chat');
    if (!chatContainer) {
      renderSuggestions([]);
    }
  });

  if(btnAddTask) {
    btnAddTask.addEventListener('click', () => {
      // REVISI: Kirim ke addTask (yang sekarang bisa parse tanggal)
      addTask(newTaskInput.value);
      newTaskInput.value = ''; 
    });
  }
  
  if(btnCompleteSim) {
    btnCompleteSim.addEventListener('click', () => completeTask('')); // Selesaikan prioritas
  }
  
  if(tasksList) {
    tasksList.addEventListener('click', (e) => {
      const target = e.target.closest('button'); 
      if (!target) return;
      const id = target.getAttribute('data-id');
      const action = target.getAttribute('data-action');
      if (!id || !action) return;
      if (action === 'toggle') {
        toggleTaskStatus(id);
      } else if (action === 'del') {
        deleteTask(id);
      }
    });
  }

  // init
  load();
  renderAll();
  renderSuggestions(['Beli makan 15rb', 'Tambah tugas PR', '/help']);

// GANTI BLOK INI DI js/main.js
document.addEventListener('DOMContentLoaded', () => {
  // cari tombol navigasi
  document.querySelectorAll('.menu button[data-view]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const view = button.getAttribute('data-view');
      
      if (view === 'tasks') {
        window.location.href = 'task.html';
      } else if (view === 'dashboard') {
        window.location.href = 'index.html';
      } else if (view === 'jadwal') {
        window.location.href = 'jadwal.html';
      } else if (view === 'finance') {
        window.location.href = 'keuangan.html'; // TAMBAHKAN INI
        } else if (view === 'productivity') { // TAMBAHKAN INI
  window.location.href = 'produktivitas.html';
}
      
      // Tambahkan else if untuk 'productivity' jika halaman itu ada
    });
  });
});
// ... (sisa kode biarkan apa adanya)
})();
