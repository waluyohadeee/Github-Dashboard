// js/keuangan.js

(function(){
  const STORAGE_KEY = "student_dashboard_v1"; // Kunci yang SAMA dengan main.js
  let appState = {
    balance: 0,
    finances: []
  };
  
  let financeChartInstance = null; // Untuk menyimpan instance chart

  // ========== Refs ==========
  const r = {
    list: document.getElementById("finance-list-detailed"),
    empty: document.getElementById("empty-hint"),
    count: document.getElementById("finance-count"),
    
    // Overview
    overviewIncome: document.getElementById("overview-income"),
    overviewExpense: document.getElementById("overview-expense"),
    overviewBalance: document.getElementById("overview-balance"),
    
    // Chart
    chartCanvas: document.getElementById("finance-chart"),
    
    // Filters
    filterType: document.getElementById("filter-type"),
    filterText: document.getElementById("filter-text"),

    // Controls
    btnClear: document.getElementById("btn-clear-storage")
  };
  
  // ========== Helpers ==========
  function formatIDR(n){
    try {
      return (Number(n) || 0).toLocaleString('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits: 0 });
    } catch(e){
      return 'Rp' + n;
    }
  }

  // ========== Persistence (SINKRONISASI) ==========
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        // Kita hanya butuh 'balance' dan 'finances' dari state utama
        appState.balance = parsed.balance || 0;
        appState.finances = parsed.finances || [];
      }
    } catch(e){
      console.warn('load error', e);
      appState = { balance: 0, finances: [] };
    }
  }
  
  function save(){
      // Fungsi ini BUKAN untuk menyimpan, tapi untuk mengambil state LENGKAP
      // dan menimpa HANYA bagian 'finances'
      try {
        let fullState = {};
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) fullState = JSON.parse(raw);
        
        // Update bagian finances di state lengkap
        fullState.finances = appState.finances;
        fullState.balance = appState.balance; // Pastikan balance juga terupdate
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
      } catch(e) {
          console.warn('save failed', e);
      }
  }

  // ========== Render Functions ==========
  
  function renderOverview(financeList) {
    let totalIncome = 0;
    let totalExpense = 0;
    
    financeList.forEach(tx => {
      if (tx.category === 'Pemasukan') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });
    
    r.overviewIncome.textContent = formatIDR(totalIncome);
    r.overviewExpense.textContent = formatIDR(totalExpense);
    r.overviewBalance.textContent = formatIDR(appState.balance); // Ambil dari state utama
    
    // Kirim data ke chart
    renderChart(totalIncome, totalExpense);
  }
  
  function renderChart(totalIncome, totalExpense) {
      if (!r.chartCanvas) return;
      const ctx = r.chartCanvas.getContext('2d');
      
      // Hancurkan chart lama jika ada (penting untuk re-render)
      if (financeChartInstance) {
          financeChartInstance.destroy();
      }
      
      // Jika tidak ada data, jangan gambar chart
      if (totalIncome === 0 && totalExpense === 0) {
          return;
      }

      financeChartInstance = new Chart(ctx, {
          type: 'doughnut', // Tipe chart: doughnut atau pie
          data: {
              labels: ['Pemasukan', 'Pengeluaran'],
              datasets: [{
                  label: 'Ringkasan Keuangan',
                  data: [totalIncome, totalExpense],
                  backgroundColor: [
                      '#22c55e', // Hijau
                      '#ef4444'  // Merah
                  ],
                  borderColor: '#ffffff',
                  borderWidth: 2
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                  legend: {
                      position: 'bottom',
                  }
              }
          }
      });
  }

  function renderList() {
    const typeFilter = r.filterType.value;
    const textFilter = r.filterText.value.toLowerCase();
    
    let filteredList = appState.finances;
    
    // 1. Filter berdasarkan Tipe
    if (typeFilter !== 'all') {
      filteredList = filteredList.filter(tx => tx.category === typeFilter);
    }
    
    // 2. Filter berdasarkan Teks
    if (textFilter) {
      filteredList = filteredList.filter(tx => 
        (tx.description && tx.description.toLowerCase().includes(textFilter)) ||
        (tx.category && tx.category.toLowerCase().includes(textFilter))
      );
    }
    
    // 3. Urutkan (terbaru dulu)
    filteredList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // --- Render ---
    r.list.innerHTML = "";
    
    if (filteredList.length === 0) {
      r.empty.style.display = "block";
      r.count.textContent = "0 Transaksi";
      return;
    }
    
    r.empty.style.display = "none";
    r.count.textContent = `${filteredList.length} Transaksi`;
    
    filteredList.forEach(tx => {
      const el = document.createElement('div');
      el.className = 'list-item';
      
      const isIncome = tx.category === 'Pemasukan';
      const amountClass = isIncome ? 'text-income' : 'text-expense';
      const amountSign = isIncome ? '+' : '-';
      
      el.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${tx.description || tx.category}</div>
          <div class="muted small">${new Date(tx.date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600" class="${amountClass}">
            ${amountSign} ${formatIDR(tx.amount)}
          </div>
          <div class="muted small">${tx.category}</div>
        </div>
      `;
      r.list.appendChild(el);
    });
  }
  
  function renderAll() {
      // Render list dulu
      renderList();
      // Render overview (berdasarkan data utuh, bukan data filter)
      renderOverview(appState.finances);
  }

  // ========== Event Bindings ==========
  try {
    // Filter
    r.filterType.addEventListener('change', renderList); // Hanya re-render list
    r.filterText.addEventListener('input', renderList); // Hanya re-render list
    
    // Hapus Data
    r.btnClear.addEventListener('click', () => {
        if (confirm('APAKAH ANDA YAKIN? Ini akan menghapus SEMUA data keuangan dan me-reset saldo.')) {
            appState.finances = [];
            appState.balance = 0;
            save(); // Simpan state kosong ke localStorage
            renderAll(); // Render ulang (jadi kosong)
        }
    });

  } catch (e) {
    console.error("Error binding events:", e);
  }

  // Logika Navigasi Sidebar (PENTING)
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
        // Sudah di halaman ini
      } else if (view === 'jadwal') {
  window.location.href = 'jadwal.html';
} else if (view === 'finance') {
  // Sudah di halaman ini
} else if (view === 'productivity') { // TAMBAHKAN INI
  window.location.href = 'produktivitas.html';
}
    });
  });

  // ========== Init ==========
  load();
  renderAll();

})();