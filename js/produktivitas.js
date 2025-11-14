// js/produktivitas.js
(function(){
  // Kunci penyimpanan
  const STORAGE_KEY = "student_productivity_v1";
  
  // Model Data Baru: 'activities' adalah templat, 'completions' adalah log harian
  const appState = {
    activities: [], // Aturan/Templat Kegiatan
    completions: [] // Log Penyelesaian Harian
  };
  
  // Definisikan Poin
  const POINTS_MAP = {
    'wajib': 3,
    'sampingan': 2,
    'tidak wajib': 1
  };
  const LATE_PENALTY = 2; // Penalti jika terlambat

  let productivityChartInstance = null;
  let selectedDate = new Date(); // Tanggal yang sedang dilihat

  // ========== Refs ==========
  const r = {
    // Overview
    overviewPoints: document.getElementById("overview-points-today"),
    overviewDone: document.getElementById("overview-tasks-done"),
    overviewPending: document.getElementById("overview-tasks-pending"),
    
    // Chart
    chartCanvas: document.getElementById("productivity-chart"),
    chartEmptyHint: document.getElementById("chart-empty-hint"),
    
    // Add Form (Aturan Baru)
    addTitle: document.getElementById("prod-title"),
    addType: document.getElementById("prod-type"),
    addRepeat: document.getElementById("prod-repeat"),
    addRepeatDays: document.getElementById("prod-repeat-days"), // Kontainer checkbox
    addLateTime: document.getElementById("prod-late-time"),
    btnAdd: document.getElementById("btn-add-activity"),
    
    // Filters
    filterDate: document.getElementById("filter-date"),
    
    // List
    list: document.getElementById("activity-list"),
    empty: document.getElementById("empty-hint"),
    count: document.getElementById("activity-count")
  };
  
  // ========== Helpers ==========
  function uid(prefix='id'){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }
  
  function isSameDay(dateA, dateB) {
      if (!dateA || !dateB) return false;
      const a = new Date(dateA);
      const b = new Date(dateB);
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth() === b.getMonth() &&
             a.getDate() === b.getDate();
  }
  
  function formatToYYYYMMDD(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
  }

  // ========== Persistence (Load/Save Data Model Baru) ==========
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        // Memuat kedua array
        appState.activities = parsed.activities || [];
        appState.completions = parsed.completions || [];
      }
    } catch(e){
      console.warn('load productivity error', e);
      appState.activities = [];
      appState.completions = [];
    }
  }
  
  function save(){
      try {
        // Menyimpan state lengkap (kedua array)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      } catch(e) {
          console.warn('save productivity failed', e);
      }
  }

  // ========== Render Functions (Logika Baru) ==========
  
  /**
   * Mengambil semua ATURAN aktivitas yang relevan untuk tanggal yang dipilih
   */
  function getActivitiesForDate(date) {
    const dayOfWeek = date.getDay(); // 0 = Minggu, 1 = Senin, ...
    
    return appState.activities.filter(a => {
      // 1. Aturan 'Tidak Ada' (sekali saja)
      if (a.repeat === 'none') {
        // Hanya tampilkan jika dibuat pada hari yang dipilih
        return isSameDay(new Date(a.created_at), date);
      }
      // 2. Aturan 'Setiap Hari'
      if (a.repeat === 'daily') {
        return true;
      }
      // 3. Aturan 'Mingguan'
      if (a.repeat === 'weekly') {
        // Cek apakah 'dayOfWeek' ada di dalam array 'repeatDays'
        return a.repeatDays && a.repeatDays.includes(dayOfWeek);
      }
      return false;
    });
  }
  
  /**
   * Render Overview & Chart HANYA untuk HARI INI
   */
  function renderOverviewAndChart() {
    const today = new Date();
    
    // 1. Dapatkan aturan/templat kegiatan untuk HARI INI
    const todaysActivityRules = getActivitiesForDate(today);
    
    // 2. Dapatkan log penyelesaian (completions) untuk HARI INI
    const doneTodayCompletions = appState.completions.filter(c => 
        isSameDay(new Date(c.date), today) && c.status === 'done'
    );
    
    // 3. Hitung overview
    const pendingTodayCount = todaysActivityRules.length - doneTodayCompletions.length;
    const totalPoints = doneTodayCompletions.reduce((sum, c) => sum + c.points, 0);

    r.overviewPoints.textContent = `${totalPoints} Poin`;
    r.overviewDone.textContent = doneTodayCompletions.length;
    r.overviewPending.textContent = pendingTodayCount > 0 ? pendingTodayCount : 0;
    
    // 4. Data untuk Chart (berdasarkan poin yang didapat HARI INI)
    const pointsByCategory = { 'wajib': 0, 'sampingan': 0, 'tidak wajib': 0 };
    
    doneTodayCompletions.forEach(c => {
        // Cari aturan aslinya untuk tahu tipenya
        const parentActivity = appState.activities.find(a => a.id === c.activity_id);
        if (parentActivity && pointsByCategory.hasOwnProperty(parentActivity.type)) {
            pointsByCategory[parentActivity.type] += c.points;
        }
    });

    const chartData = [
        pointsByCategory['wajib'], 
        pointsByCategory['sampingan'], 
        pointsByCategory['tidak wajib']
    ];
    renderChart(chartData);
  }
  
  function renderChart(data) {
      if (!r.chartCanvas) return;
      const ctx = r.chartCanvas.getContext('2d');
      
      if (productivityChartInstance) {
          productivityChartInstance.destroy();
      }
      
      const totalData = data.reduce((s, v) => s + v, 0);
      
      if (totalData === 0) {
          r.chartEmptyHint.style.display = "block";
          r.chartCanvas.style.display = "none";
          return;
      }
      
      r.chartEmptyHint.style.display = "none";
      r.chartCanvas.style.display = "block";

      productivityChartInstance = new Chart(ctx, {
          type: 'pie',
          data: {
              labels: ['Wajib', 'Sampingan', 'Tidak Wajib'],
              datasets: [{
                  label: 'Poin Produktivitas',
                  data: data,
                  backgroundColor: ['#22c55e', '#3b82f6', '#eab308'],
                  borderColor: '#ffffff',
                  borderWidth: 2
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
          }
      });
  }

  /**
   * Render List Checklist untuk 'selectedDate'
   */
  function renderList() {
    // 1. Dapatkan aturan kegiatan untuk tanggal yang dipilih
    const activitiesForDay = getActivitiesForDate(selectedDate);
    
    // 2. Dapatkan log penyelesaian untuk tanggal yang dipilih
    const completionsForDay = appState.completions.filter(c =>
        isSameDay(new Date(c.date), selectedDate)
    );

    // 3. Tentukan apakah tanggal di masa depan (untuk "lock")
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalisasi hari ini
    const isFutureDate = selectedDate > today;

    r.list.innerHTML = "";
    
    if (activitiesForDay.length === 0) {
      r.empty.style.display = "block";
      r.count.textContent = "0 Kegiatan";
      return;
    }
    
    r.empty.style.display = "none";
    r.count.textContent = `${activitiesForDay.length} Kegiatan`;
    
    activitiesForDay.forEach(a => {
      // Cek apakah ada log penyelesaian untuk aktivitas 'a' pada hari 'selectedDate'
      const completion = completionsForDay.find(c => c.activity_id === a.id);
      
      const isDone = completion && completion.status === 'done';
      
      // LOGIKA LOCK: Checkbox di-lock jika SUDAH SELESAI atau TANGGAL MASA DEPAN
      const isDisabled = isDone || isFutureDate;
      
      const card = document.createElement("div");
      card.className = "task-card"; 
      
      let completedStr = '-';
      let pointsStr = `${POINTS_MAP[a.type] || 0} Poin`;
      let isLate = false;

      if (isDone) {
          completedStr = new Date(completion.completed_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
          
          // Cek apakah terlambat saat pengerjaan
          if (a.lateTime) {
              const completedTime = new Date(completion.completed_at);
              const [hours, minutes] = a.lateTime.split(':');
              const lateDateTime = new Date(completion.date); // Gunakan tanggal penyelesaian
              lateDateTime.setHours(hours, minutes, 0, 0);
              
              if (completedTime > lateDateTime) {
                  isLate = true;
              }
          }
          pointsStr = `${completion.points} Poin ${isLate ? '(Terlambat)' : ''}`;
      }

      card.innerHTML = `
        <div style="display: flex; gap: 12px; flex: 1;">
          <div 
            class="checkbox ${isDone ? 'done' : ''} ${isDisabled ? 'disabled' : ''}" 
            data-id="${a.id}"
          >
            ${isDone ? '✓' : ''}
          </div>
          <div class="details">
            <div class="task-title">${a.title} ${isFutureDate ? '(Mendatang)' : ''}</div>
            <div class="task-dates">
              Selesai: <strong>${completedStr}</strong>
            </div>
          </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div class="tag ${isLate ? 'tag-late' : ''}">${a.type}</div>
          <div class="muted small" style="font-weight: 600;">
            ${pointsStr}
          </div>
          ${a.lateTime ? `<div class="muted small">Batas: ${a.lateTime}</div>` : ''}
          
          ${isDone ? `<button class="btn ghost small btn-undo" data-id="${a.id}">Batalkan</button>` : ''}
        </div>
      `;
      
      // --- Event Listener Dinamis ---
      
      // 1. Tambahkan listener ke checkbox HANYA JIKA TIDAK di-lock
      const checkboxEl = card.querySelector('.checkbox');
      if (!isDisabled) {
        checkboxEl.addEventListener('click', handleCheckActivity);
      }
      
      // 2. Tambahkan listener ke tombol "Batalkan" JIKA ADA
      const undoBtn = card.querySelector('.btn-undo');
      if (undoBtn) {
        // Tidak boleh membatalkan jika tanggalnya di masa depan (seharusnya tidak terjadi, tapi untuk keamanan)
        if (!isFutureDate) {
            undoBtn.addEventListener('click', handleUndoActivity);
        }
      }
      
      r.list.appendChild(card);
    });
  }
  
  function renderAll() {
      // Render list berdasarkan 'selectedDate'
      renderList();
      // Render overview & chart HANYA berdasarkan HARI INI
      renderOverviewAndChart(); 
  }

  // ========== Event Handlers ==========
  
  /**
   * Menambah ATURAN/TEMPLATE aktivitas baru
   */
  function handleAddActivity() {
    const title = r.addTitle.value.trim();
    const type = r.addType.value;
    const repeat = r.addRepeat.value;
    const lateTime = r.addLateTime.value || null;
    
    if (!title) {
        alert("Judul kegiatan wajib diisi!");
        return;
    }
    
    let repeatDays = [];
    if (repeat === 'weekly') {
        r.addRepeatDays.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            repeatDays.push(parseInt(cb.dataset.day));
        });
        if (repeatDays.length === 0) {
            alert("Untuk perulangan 'Hari Tertentu', pilih minimal satu hari.");
            return;
        }
    }
    
    const newActivityRule = {
      id: uid('prod'),
      title: title,
      type: type,
      repeat: repeat,
      repeatDays: repeatDays, // cth: [1, 2, 3]
      lateTime: lateTime,   // cth: "17:00"
      created_at: new Date().toISOString()
    };
    
    appState.activities.push(newActivityRule);
    save();
    
    // Set filter ke hari ini agar user lihat item barunya (jika 'none')
    r.filterDate.value = formatToYYYYMMDD(new Date());
    selectedDate = new Date();
    
    renderAll();
    
    // Kosongkan form
    r.addTitle.value = "";
    r.addLateTime.value = "";
    r.addRepeat.value = "none";
    r.addRepeatDays.style.display = 'none';
    r.addRepeatDays.querySelectorAll('input').forEach(cb => cb.checked = false);
  }
  
  /**
   * Menangani centang (HANYA PENDING -> DONE)
   */
  function handleCheckActivity(e) {
    const activityId = e.target.dataset.id;
    if (!activityId) return;
    
    // 1. Cari aturan (templat) aktivitas
    const activity = appState.activities.find(a => a.id === activityId);
    if (!activity) return;

    // 2. Tentukan tanggal (selalu 'selectedDate') dan format YYYY-MM-DD
    const dateKey = formatToYYYYMMDD(selectedDate);
    
    // 3. Cek apakah sudah ada (seharusnya tidak, karena dicegah listener)
    const isAlreadyDone = appState.completions.some(c =>
        c.activity_id === activityId && c.date === dateKey
    );
    if (isAlreadyDone) return; // Sudah dikerjakan, jangan proses lagi
        
    // 4. Hitung Poin (Cek Keterlambatan)
    let basePoints = POINTS_MAP[activity.type] || 0;
    let penalty = 0;
    const now = new Date(); // Waktu klik!
    
    // Cek jika ada aturan jam terlambat
    if (activity.lateTime) {
        const [hours, minutes] = activity.lateTime.split(':');
        const lateDateTime = new Date(selectedDate); // Ambil tanggal dari kalender
        lateDateTime.setHours(hours, minutes, 0, 0);
        
        // Bandingkan waktu klik dengan jam batas
        if (now > lateDateTime) {
            penalty = LATE_PENALTY; // Terapkan penalti
        }
    }
    
    const finalPoints = Math.max(0, basePoints - penalty); // Pastikan poin tidak minus
    
    // 5. Buat log penyelesaian baru
    const newCompletion = {
        id: uid('c'),
        activity_id: activity.id,
        date: dateKey, // '2025-11-14'
        status: 'done',
        points: finalPoints,
        completed_at: now.toISOString()
    };
    appState.completions.push(newCompletion);
    
    save();
    renderAll(); // Render ulang semua
  }
  
  /**
   * FUNGSI BARU: Menangani "Batalkan" (DONE -> PENDING)
   */
  function handleUndoActivity(e) {
    const activityId = e.target.dataset.id;
    if (!activityId) return;
    
    const dateKey = formatToYYYYMMDD(selectedDate);
    
    // Cari log penyelesaian yang ada untuk hari ini
    const existingCompletionIndex = appState.completions.findIndex(c =>
        c.activity_id === activityId && c.date === dateKey
    );

    if (existingCompletionIndex > -1) {
        // --- SUDAH SELESAI, DIBATALKAN ---
        appState.completions.splice(existingCompletionIndex, 1);
        save();
        renderAll();
    }
  }


  // ========== Event Bindings ==========
  try {
    // Form Tambah
    r.btnAdd.addEventListener('click', handleAddActivity);
    
    // Tampilkan/sembunyikan pilihan hari
    r.addRepeat.addEventListener('change', () => {
        if (r.addRepeat.value === 'weekly') {
            r.addRepeatDays.style.display = 'flex';
        } else {
            r.addRepeatDays.style.display = 'none';
        }
    });
    
    // Filter Tanggal
    r.filterDate.addEventListener('change', () => {
        // Set 'selectedDate' global berdasarkan filter
        const dateVal = r.filterDate.value;
        if (dateVal) {
            // Perlu parsing YYYY-MM-DD secara manual untuk menghindari masalah zona waktu
            const parts = dateVal.split('-');
            selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            selectedDate = new Date(); // Default hari ini
        }
        renderList(); // Hanya render list, JANGAN overview
    });
    
    // Set filter tanggal ke hari ini saat load
    r.filterDate.value = formatToYYYYMMDD(new Date());

  } catch (e) {
    console.error("Error binding events:", e);
  }

  // Logika Navigasi Sidebar (PENTING)
  function setupNavigation() {
    document.querySelectorAll('.menu button[data-view]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const view = button.getAttribute('data-view');
        
        if (view === 'dashboard') { window.location.href = 'index.html'; }
        else if (view === 'jadwal') { window.location.href = 'jadwal.html'; }
        else if (view === 'tasks') { window.location.href = 'task.html'; }
        else if (view === 'finance') { window.location.href = 'keuangan.html'; }
        else if (view === 'productivity') { /* Anda sudah di sini */ }
      });
    });
  }

  // ========== Init ==========
  load();
  selectedDate = new Date(); // Pastikan 'selectedDate' adalah hari ini saat load
  r.filterDate.value = formatToYYYYMMDD(selectedDate);
  renderAll(); 
  setupNavigation();

})();