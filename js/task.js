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

    switch((r.sortBy && r.sortBy.value) || "due_asc"){
      case "due_asc":   list.sort((a,b)=>(a.due||"").localeCompare(b.due||"")); break;
      case "due_desc":  list.sort((a,b)=>(b.due||"").localeCompare(a.due||"")); break;
      case "start_asc": list.sort((a,b)=>(a.start||"").localeCompare(b.start||"")); break;
      case "start_desc":list.sort((a,b)=>(b.start||"").localeCompare(a.start||"")); break;
      case "priority_desc":
        const pr = v => v==="high"?3:v==="medium"?2:1;
        list.sort((a,b)=>pr(b.priority)-pr(a.priority)); break;
      case "type_asc": list.sort((a,b)=>(a.type||"").localeCompare(b.type||"")); break;
    }

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
      if(t.important){
        const star = document.createElement("span");
        star.className = "important"; star.textContent = "★";
        title.appendChild(star);
      }

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
      right.style.gap = "6px";

      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = `${t.type} • ${t.priority}`;

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

      right.appendChild(tag);
      right.appendChild(btns);

      card.appendChild(left);
      card.appendChild(right);
      r.list.appendChild(card);
    });

    if(r.summary) r.summary.textContent = `${state.tasks.length} tugas`;
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

    t.title = newTitle.trim();
    t.start = newStart.trim() || null;
    t.due = newDue.trim() || null;

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
      {id: uid(), title: "Persiapan presentasi project", type: "project", important: true, start: "2025-11-20", due: "2025-11-25", priority: "high", status: "pending"}
    ];
    save();
  }

  // ----------------------
  // Event bindings (CRITICAL)
  // ----------------------
  // Make sure to bind only if elements exist (keeps compatibility)
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
      if(r.sortBy) r.sortBy.value = "due_asc";
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

  // init
  load();
  if(state.tasks.length === 0) seed();
  render();

  // expose if needed
  window.__tasks = { state, save, load };

})();
