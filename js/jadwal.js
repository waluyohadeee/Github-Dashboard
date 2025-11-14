// js/jadwal.js (Total Rewrite)
// Mengimpor helper kalender
import { getMonthDays, formatToYYYYMMDD, isSameDay } from './calendar.js';

(function(){
  // Kunci penyimpanan
  const SCHEDULE_STORAGE_KEY = "jadwal"; // Untuk Events & Reminders
  const TASK_STORAGE_KEY = "student_tasks_v1"; // Untuk Tugas
  
  // State aplikasi
  const state = { 
    events: [], // Dari SCHEDULE_STORAGE_KEY
    tasks: [],  // Dari TASK_STORAGE_KEY
    currentMonth: new Date(),
    selectedDate: new Date()
  }; 

  // Referensi (refs) ke elemen HTML
  const r = {
    // Navigasi
    btnPrevMonth: document.getElementById("btn-prev-month"),
    btnNextMonth: document.getElementById("btn-next-month"),
    monthYearText: document.getElementById("calendar-month-year"),
    
    // Kalender
    gridBody: document.getElementById("calendar-grid-body"),
    
    // Agenda
    agendaList: document.getElementById("agenda-list"),
    agendaTitle: document.getElementById("agenda-title"),
    agendaEmpty: document.getElementById("agenda-empty"),
    
    // Modal (Desain Google Calendar BARU)
    modalBackdrop: document.getElementById("gcal-modal-backdrop"),
    btnCloseModal: document.getElementById("gcal-close-btn"),
    btnSaveModal: document.getElementById("gcal-save-btn"),
    btnShowModal: document.getElementById("btn-show-modal-add"),
    modalTabs: document.querySelectorAll(".gcal-tab"),
    modalBodies: document.querySelectorAll(".gcal-body-section"),
    modalTitle: document.getElementById("gcal-title"),
    
    // Form Event
    eventStartDate: document.getElementById("gcal-event-start-date"),
    eventStartTime: document.getElementById("gcal-event-start-time"),
    eventEndDate: document.getElementById("gcal-event-end-date"),
    eventEndTime: document.getElementById("gcal-event-end-time"),
    
    // Form Tugas
    taskDue: document.getElementById("gcal-task-due"),
    taskType: document.getElementById("gcal-task-type"),
    taskPriority: document.getElementById("gcal-task-priority"),
    taskImportant: document.getElementById("gcal-task-important"),
    
    // Form Pengingat
    reminderDate: document.getElementById("gcal-reminder-date"),
    reminderTime: document.getElementById("gcal-reminder-time"),
  };

  // Helper unik ID
  function taskUid(){ return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function eventUid(){ return "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  // ========== Save & Load (Sinkronisasi) ==========
  
  function saveTasks() {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({ tasks: state.tasks }));
    } catch(e) { console.warn('saveTasks failed', e); }
  }
  
  function saveEvents() {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({ events: state.events })); // Simpan dengan format baru
    } catch(e) { console.warn('saveEvents failed', e); }
  }
  
  function loadAllData(){ 
    // 1. Load Tugas
    const rawTasks = localStorage.getItem(TASK_STORAGE_KEY); 
    if(rawTasks) {
        try {
           state.tasks = JSON.parse(rawTasks).tasks || [];
        } catch(e) { console.error("Gagal load tugas:", e); state.tasks = []; }
    }
    
    // 2. Load Events & Reminders
    const rawEvents = localStorage.getItem(SCHEDULE_STORAGE_KEY); 
    if(rawEvents) {
        try {
            let data = JSON.parse(rawEvents);
            if (Array.isArray(data)) { // Migrasi format lama
                console.warn('Migrating old schedule format...');
                // Anggap semua data lama adalah 'event' dan memiliki 'waktu'
                state.events = data.map(d => ({
                    id: eventUid(),
                    title: d.judul,
                    type: 'event',
                    category: 'Lainnya',
                    start: d.waktu, // Gunakan properti 'waktu'
                    end: null
                }));
                saveEvents(); // Simpan ulang dalam format baru
            } else if (data.events) {
                state.events = data.events;
            }
        } catch(e) { console.error("Gagal load jadwal:", e); }
    }
  }
  
  // ========== Logika Render Utama ==========

  function renderCalendar() {
    if (!r.gridBody) return;
    
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    
    r.monthYearText.textContent = new Date(year, month).toLocaleString('id-ID', {
      month: 'long', year: 'numeric'
    });
    
    const days = getMonthDays(year, month);
    r.gridBody.innerHTML = "";
    
    const today = new Date();

    days.forEach(dayObj => {
      const dayEl = document.createElement("div");
      dayEl.className = "calendar-day";
      
      const dayNumber = document.createElement("span");
      dayNumber.textContent = dayObj.day;
      dayEl.appendChild(dayNumber);
      
      if (!dayObj.isCurrentMonth) {
        dayEl.classList.add("other-month");
      }
      
      if (dayObj.isCurrentMonth && isSameDay(dayObj.date, today)) {
        dayEl.classList.add("today");
      }
      
      // REVISI: Tambahkan Keterangan Event (bukan cuma titik)
      const itemsContainer = document.createElement("div");
      itemsContainer.className = "day-items-list";
      
      // Cek Tugas
      const tasksOnDay = state.tasks.filter(t => t.due && isSameDay(t.due, dayObj.date) && t.status !== 'done');
      // Cek Events/Reminders
      const eventsOnDay = state.events.filter(e => e.start && isSameDay(e.start, dayObj.date));
      
      tasksOnDay.forEach(task => {
        const itemEl = document.createElement("div");
        itemEl.className = "day-event-item task";
        itemEl.textContent = task.title;
        itemsContainer.appendChild(itemEl);
      });
      
      eventsOnDay.forEach(event => {
        const itemEl = document.createElement("div");
        itemEl.className = `day-event-item ${event.type || 'event'}`;
        itemEl.textContent = event.title;
        itemsContainer.appendChild(itemEl);
      });
      
      dayEl.appendChild(itemsContainer);
      
      // Tambahkan click listener
      dayEl.onclick = () => {
        state.selectedDate = dayObj.date;
        renderAgendaForDay(dayObj.date);
      };
      
      // Tambahkan click listener untuk BUKA MODAL saat klik tanggal
      dayEl.ondblclick = () => {
        state.selectedDate = dayObj.date;
        showModal(dayObj.date);
      };
      
      r.gridBody.appendChild(dayEl);
    });
  }
  
  function renderAgendaForDay(date) {
    if (!r.agendaList) return;
    
    // Set judul agenda
    const dateStr = date.toLocaleString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    r.agendaTitle.textContent = isSameDay(date, new Date()) ? "Agenda Hari Ini" : `Agenda ${dateStr}`;
    
    const tasks = state.tasks.filter(t => t.due && isSameDay(t.due, date) && t.status !== 'done');
    const events = state.events.filter(e => e.start && isSameDay(e.start, date));
    
    const allItems = [...tasks, ...events];
    allItems.sort((a,b) => {
        const timeA = a.start ? new Date(a.start).getTime() : 0; // Tugas (due) tidak punya jam
        const timeB = b.start ? new Date(b.start).getTime() : 0;
        return timeA - timeB;
    });
    
    r.agendaList.innerHTML = "";
    
    if (allItems.length === 0) {
      r.agendaEmpty.style.display = "block";
      return;
    }
    
    r.agendaEmpty.style.display = "none";
    
    allItems.forEach(item => {
      const li = document.createElement("div");
      li.className = "list-item";
      
      let title, timeStr, type;
      
      if (item.id.startsWith('t_')) { // Ini TUGAS
        type = "task";
        title = item.title;
        timeStr = `Deadline ${item.priority || 'medium'}`;
      } else { // Ini EVENT atau PENGINGAT
        type = item.type || 'event';
        title = item.title;
        timeStr = `Mulai: ${new Date(item.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      li.classList.add(type);
      li.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${title}</div>
          <div class="muted small">${timeStr}</div>
        </div>
        <div class="muted small">${type}</div>
      `;
      r.agendaList.appendChild(li);
    });
  }

  // ========== Logika Modal & Form (Desain Google) ==========
  
  function showModal(date = null) {
    if (!r.modalBackdrop) return;
    
    const targetDate = date || state.selectedDate;
    const dateStr = formatToYYYYMMDD(targetDate);
    
    // Reset Form
    r.modalTitle.value = "";
    r.eventStartDate.value = dateStr;
    r.eventEndDate.value = dateStr;
    r.eventStartTime.value = "12:00"; // Default jam 12
    r.eventEndTime.value = "13:00"; // Default 1 jam
    r.taskDue.value = dateStr;
    r.reminderDate.value = dateStr;
    r.reminderTime.value = "12:00";
    
    // Set tab default ke 'event'
    switchTab('event');
    
    r.modalBackdrop.style.display = "flex";
    r.modalTitle.focus();
  }
  
  function closeModal() {
    if (!r.modalBackdrop) return;
    r.modalBackdrop.style.display = "none";
  }
  
  function switchTab(targetTabName) {
    r.modalTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === targetTabName));
    
    // Sembunyikan semua body
    r.modalBodies.forEach(body => body.style.display = 'none');
    
    // Tampilkan body yang relevan
    if(targetTabName === 'event') {
      document.getElementById('gcal-body-event').style.display = 'block';
    } else if (targetTabName === 'task') {
      document.getElementById('gcal-body-task').style.display = 'block';
    } else if (targetTabName === 'reminder') {
      document.getElementById('gcal-body-reminder').style.display = 'block';
    }
  }
  
  function getActiveTab() {
    const activeTab = document.querySelector(".gcal-tab.active");
    return activeTab ? activeTab.dataset.tab : 'event';
  }
  
  function saveFromModal() {
    const type = getActiveTab();
    const title = r.modalTitle.value;
    
    try {
      if (!title) throw new Error("Judul wajib diisi");

      if (type === 'task') {
        state.tasks.push({
          id: taskUid(),
          title: title,
          type: r.taskType.value,
          important: r.taskImportant.checked,
          start: null,
          due: r.taskDue.value || null,
          priority: r.taskPriority.value,
          status: "pending"
        });
        saveTasks();
        r.taskImportant.checked = false;
        
      } else { // Event atau Reminder
        let startDateTime, endDateTime = null;
        let category = 'Acara';
        
        if (type === 'event') {
          if (!r.eventStartDate.value || !r.eventStartTime.value) throw new Error("Tanggal & Waktu Mulai wajib diisi");
          startDateTime = `${r.eventStartDate.value}T${r.eventStartTime.value}`;
          if (r.eventEndDate.value && r.eventEndTime.value) {
            endDateTime = `${r.eventEndDate.value}T${r.eventEndTime.value}`;
          }
        } else { // Reminder
          if (!r.reminderDate.value || !r.reminderTime.value) throw new Error("Tanggal & Waktu Pengingat wajib diisi");
          startDateTime = `${r.reminderDate.value}T${r.reminderTime.value}`;
          category = 'Pengingat';
        }
        
        state.events.push({
          id: eventUid(),
          title: title,
          category: category,
          type: type, // 'event' or 'reminder'
          start: startDateTime,
          end: endDateTime
        });
        saveEvents();
        
        if(type === 'reminder') scheduleNotification(title, new Date(startDateTime));
      }
      
      closeModal();
      renderCalendar();
      renderAgendaForDay(state.selectedDate);
      
    } catch(e) {
      alert(e.message);
    }
  }
  
  // === Logika Sistem Pengingat (Notification API) ===
  function scheduleNotification(title, date) {
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      console.warn(`Waktu pengingat "${title}" sudah lewat.`);
      return;
    }
    
    if (!('Notification' in window)) {
      alert("Browser ini tidak mendukung notifikasi desktop.");
      return;
    }

    if (Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification('Pengingat Dashboard Pelajar', { body: title });
      }, timeDiff);
      alert(`Pengingat untuk "${title}" telah diatur!`);
      
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          scheduleNotification(title, date); // Coba lagi
        } else {
          alert("Izin notifikasi ditolak. Pengingat tidak dapat ditampilkan.");
        }
      });
    } else {
      alert("Izin notifikasi diblokir. Aktifkan di pengaturan browser Anda untuk menggunakan pengingat.");
    }
  }

  // ----------------------
  // Event bindings
  // ----------------------
  try {
    // Navigasi Bulan
    r.btnPrevMonth.onclick = () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
      renderCalendar();
    };
    r.btnNextMonth.onclick = () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      renderCalendar();
    };
    
    // Modal
    r.btnShowModal.onclick = () => showModal(); // Tampilkan modal untuk tanggal terpilih
    r.btnCloseModal.onclick = closeModal;
    r.btnSaveModal.onclick = saveFromModal;
    r.modalTabs.forEach(tab => {
      tab.onclick = () => switchTab(tab.dataset.tab);
    });
    
  } catch (e) {
    console.error("Error binding events:", e);
  }

  // Logika Navigasi Sidebar (PENTING)
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.menu button[data-view]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const view = button.getAttribute('data-view');
        
        if (view === 'tasks') {
          window.location.href = 'task.html';
        } else if (view === 'dashboard') {
          window.location.href = 'index.html';
        }
        // Tambahkan else if untuk 'finance' dan 'productivity' jika halaman itu ada
      });
    });
  });

  // init
  loadAllData();
  renderCalendar();
  renderAgendaForDay(state.selectedDate); // Tampilkan agenda hari ini saat load

})();