(function(){
  const STORAGE_KEY = "student_tasks_v1";
  const state = { tasks: [] };

  // refs
  const r = {
    list: document.getElementById("tasks-list"),
    empty: document.getElementById("empty-hint"),
    title: document.getElementById("task-title"),
    type: document.getElementById("task-type"),
    important: document.getElementById("task-important"),
    start: document.getElementById("task-start"),
    due: document.getElementById("task-due"),
    priority: document.getElementById("task-priority"),
    add: document.getElementById("btn-add-task"),
    filterText: document.getElementById("filter-text"),
    filterType: document.getElementById("filter-type"),
    filterImportant: document.getElementById("filter-important"),
    sortBy: document.getElementById("sort-by"),
    clearFilters: document.getElementById("btn-clear-filters"),
    summary: document.getElementById("task-summary"),
    resetDemo: document.getElementById("btn-reset-demo"),
    clearLS: document.getElementById("btn-clear-storage"),
    status: document.getElementById("dev-status")
  };

  function uid(){ return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); if(r.status) r.status.textContent="Saved"; }
  function load(){ const raw = localStorage.getItem(STORAGE_KEY); if(raw) Object.assign(state, JSON.parse(raw)); }

  function render(){
    let list = state.tasks.slice();
    const ft = (r.filterText && r.filterText.value || "").toLowerCase();
    const ty = r.filterType ? r.filterType.value : "";
    const im = r.filterImportant ? r.filterImportant.checked : false;

    if(ft) list = list.filter(t=>t.title.toLowerCase().includes(ft) || (t.notes && t.notes.toLowerCase().includes(ft)));
    if(ty) list = list.filter(t=>t.type===ty);
    if(im) list = list.filter(t=>t.important);

    // === REVISI UTAMA: Logika Sorting ===
    const sortByValue = (r.sortBy && r.sortBy.value) || "priority_first"; // Default baru: prioritas
    
    // Default sorting (priority_first) dan due_asc akan menggunakan logika prioritas
    if (sortByValue === "priority_first" || sortByValue === "due_asc") {
        list.sort((a, b) => {
            // 1. Prioritaskan 'important'
            if (a.important !== b.important) return a.important ? -1 : 1;
            // 2. Prioritaskan 'high'
            const isAHigh = a.priority === 'high';
            const isBHigh = b.priority === 'high';
            if (isAHigh !== isBHigh) return isAHigh ? -1 : 1;
            // 3. Prioritaskan 'medium'
            const isAMedium = a.priority === 'medium';
            const isBMedium = b.priority === 'medium';
            if (isAMedium !== isBMedium) return isAMedium ? -1 : 1;
            // 4. Sortir by 'due'
            const dueA = a.due || '9999-12-31';
            const dueB = b.due || '9999-12-31';
            return dueA.localeCompare(dueB);
        });
    } else {
        // Switch untuk opsi sorting lainnya
        switch(sortByValue){
          case "due_desc":  list.sort((a,b)=>(b.due||"9999-12-31").localeCompare(a.due||"9999-12-31")); break;
          case "start_asc": list.sort((a,b)=>(a.start||"9999-12-31").localeCompare(b.start||"9999-12-31")); break;
          case "start_desc":list.sort((a,b)=>(b.start||"9999-12-31").localeCompare(a.start||"9999-12-31")); break;
          case "priority_desc":
            const pr = v => v==="high"?3:v==="medium"?2:v==="low"?1:0;
            list.sort((a,b)=>pr(b.priority)-pr(a.priority)); break;
          case "type_asc": list.sort((a,b)=>(a.type||"").localeCompare(b.type||"")); break;
        }
    }
    // === AKHIR REVISI SORTING ===

    if(!r.list) return;
    r.list.innerHTML = "";
    if(list.length === 0){
      if(r.empty) r.empty.style.display = "block";
    } else {
      if(r.empty) r.empty.style.display = "none";
    }

    list.forEach(t=>{
      const card = document.createElement("div");
      card.className = "task-card";
      // REVISI: Tambahkan border jika penting
      if (t.important) {
        card.style.borderLeft = "4px solid #b91c1c";
      } else if (t.priority === 'high') {
        card.style.borderLeft = "4px solid #b45309";
      }


      const left = document.createElement("div");
      left.style.display = "flex"; left.style.gap = "12px"; left.style.flex = "1";

      const chk = document.createElement("div");
      chk.className = "checkbox" + (t.status === "done" ? " done" : "");
      chk.innerHTML = t.status === "done" ? "✓" : "";
      chk.onclick = () => { t.status = t.status === "done" ? "pending" : "done"; save(); render(); };

      const meta = document.createElement("div");
      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = t.title;
      // REVISI: Pindahkan 'Penting' ke label visual
      // if(t.important){
      //   const star = document.createElement("span");
      //   star.className = "important"; star.textContent = "★";
      //   title.appendChild(star);
      // }

      const dates = document.createElement("div");
      dates.className = "task-dates";
      dates.textContent = `Mulai: ${t.start||"-"} • Deadline: ${t.due||"-"}`;

      meta.appendChild(title);
      meta.appendChild(dates);

      left.appendChild(chk);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.alignItems = "flex-end"; // REVISI: Ratakan ke kanan
      right.style.gap = "6px";

      // === REVISI: Buat kontainer untuk tag dan label prioritas ===
      const tagContainer = document.createElement("div");
      tagContainer.style.display = "flex";
      tagContainer.style.gap = "6px";
      tagContainer.style.alignItems = "center";
      
      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = `${t.type} • ${t.priority}`;
      tagContainer.appendChild(tag); // Masukkan tag lama

      // Masukkan label prioritas baru
      if (t.important) {
          const label = document.createElement("span");
          label.className = "task-label important";
          label.textContent = "Penting";
          tagContainer.appendChild(label);
      } else if (t.priority === 'high') {
          const label = document.createElement("span");
          label.className = "task-label urgent";
          label.textContent = "Urgent";
          tagContainer.appendChild(label);
      }
      
      right.appendChild(tagContainer); // Tambahkan kontainer tag ke sisi kanan
      // === AKHIR REVISI TAG ===

      const btns = document.createElement("div");
      btns.className = "controls-inline";

      const ebtn = document.createElement("button");
      ebtn.className = "btn ghost";
      ebtn.textContent = "Edit";
      ebtn.onclick = () => editTask(t.id);

      const dbtn = document.createElement("button");
      dbtn.className = "btn ghost";
      dbtn.textContent = "Hapus";
      dbtn.onclick = () => { if(confirm("Hapus tugas?")) deleteTask(t.id); };

      btns.appendChild(ebtn);
      btns.appendChild(dbtn);
      
      right.appendChild(btns); // Tambahkan tombol di bawah tag

      card.appendChild(left);
      card.appendChild(right);
      r.list.appendChild(card);
    });

    if(r.summary) r.summary.textContent = `${state.tasks.length} total tugas`;
  }

  function addTask(){
    if(!r.title || !r.title.value.trim()) return alert("Judul wajib diisi");

    state.tasks.push({
      id: uid(),
      title: r.title.value.trim(),
      type: r.type ? r.type.value : "personal",
      important: r.important ? r.important.checked : false,
      start: r.start ? r.start.value : null,
      due: r.due ? r.due.value : null,
      priority: r.priority ? r.priority.value : "medium",
      status: "pending"
    });

    if(r.title) r.title.value = "";
    if(r.important) r.important.checked = false;
    if(r.start) r.start.value = "";
    if(r.due) r.due.value = "";

    save(); render();
  }

  function editTask(id){
    const t = state.tasks.find(x=>x.id===id);
    if(!t) return;

    const newTitle = prompt("Judul:", t.title);
    if(newTitle === null) return;

    const newStart = prompt("Tanggal mulai (YYYY-MM-DD):", t.start || "");
    if(newStart === null) return;

    const newDue = prompt("Deadline (YYYY-MM-DD):", t.due || "");
    if(newDue === null) return;
    
    // REVISI: Izinkan edit prioritas dan status penting
    const newPriority = prompt("Prioritas (low, medium, high):", t.priority || "medium");
    if(newPriority === null) return;
    
    const newImportant = confirm("Tandai sebagai 'Penting'?");

    t.title = newTitle.trim();
    t.start = newStart.trim() || null;
    t.due = newDue.trim() || null;
    t.priority = newPriority.trim().toLowerCase() || "medium";
    t.important = newImportant;

    save(); render();
  }

  function deleteTask(id){
    state.tasks = state.tasks.filter(t=>t.id !== id);
    save(); render();
  }

  function seed(){
    state.tasks = [
      {id: uid(), title: "Kerjakan PR Matematika", type: "assignment", important: true, start: "2025-11-14", due: "2025-11-16", priority: "high", status: "pending"},
      {id: uid(), title: "Baca bab 3 Biologi", type: "study", important: false, start: "2025-11-13", due: "2025-11-15", priority: "medium", status: "pending"},
      {id: uid(), title: "Persiapan presentasi project", type: "project", important: false, start: "2025-11-20", due: "2025-11-25", priority: "high", status: "pending"}
    ];
    save();
  }

  // ----------------------
  // Event bindings (CRITICAL)
  // ----------------------
  try {
    if(r.add) r.add.addEventListener('click', addTask);
    if(r.filterText) r.filterText.addEventListener('input', render);
    if(r.filterType) r.filterType.addEventListener('change', render);
    if(r.filterImportant) r.filterImportant.addEventListener('change', render);
    if(r.sortBy) r.sortBy.addEventListener('change', render);
    if(r.clearFilters) r.clearFilters.addEventListener('click', function(){
      if(r.filterText) r.filterText.value = "";
      if(r.filterType) r.filterType.value = "";
      if(r.filterImportant) r.filterImportant.checked = false;
      if(r.sortBy) r.sortBy.value = "priority_first"; // REVISI: Reset ke default baru
      render();
    });
    if(r.resetDemo) r.resetDemo.addEventListener('click', function(){
      if(confirm("Reset demo?")){ seed(); render(); }
    });
    if(r.clearLS) r.clearLS.addEventListener('click', function(){
      if(confirm("Hapus localStorage?")){ localStorage.removeItem(STORAGE_KEY); state.tasks = []; render(); }
    });
  } catch (e) {
    console.error("Error binding events:", e);
  }
  
  // REVISI: Navigasi JS
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.menu button[data-view]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const view = button.getAttribute('data-view');
        if (view === 'dashboard') {
          window.location.href = 'index.html';
        } else if (view === 'jadwal') {
          window.location.href = 'jadwal.html';
        } 
        // Tidak perlu 'tasks' karena sudah di halaman ini
      });
    });
  });

  // init
  load();
  if(state.tasks.length === 0) seed();
  
  // REVISI: Set default sort di dropdown saat load
  if(r.sortBy && !r.sortBy.value) {
    r.sortBy.value = "priority_first";
  }

  render();

  // expose if needed
  window.__tasks = { state, save, load };
// ... (sebelum baris '})();')

  // Logika Navigasi Sidebar (PENTING)
  document.querySelectorAll('.menu button[data-view]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const view = button.getAttribute('data-view');
      
      if (view === 'tasks') {
        // Sudah di halaman ini
      } else if (view === 'dashboard') {
        window.location.href = 'index.html';
      } else if (view === 'jadwal') {
        window.location.href = 'jadwal.html';
      } else if (view === 'finance') {
        window.location.href = 'keuangan.html';
      } else if (view === 'productivity') { // TAMBAHKAN INI
  window.location.href = 'produktivitas.html';
}
    });
  });

})();