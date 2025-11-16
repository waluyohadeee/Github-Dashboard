// js/nav.js (REVISI PENUH)
// Memperbaiki tautan agar sesuai dengan nama file baru Anda (keuangan.html dan produktivitas.html)

document.addEventListener('DOMContentLoaded', () => {
  // Temukan semua tombol di menu sidebar yang memiliki atribut data-view
  const navButtons = document.querySelectorAll('.menu button[data-view]');
  
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const view = button.getAttribute('data-view');
      
      switch (view) {
        case 'dashboard':
          window.location.href = 'index.html';
          break;
        case 'jadwal':
          window.location.href = 'jadwal.html';
          break;
        case 'tasks':
          window.location.href = 'task.html';
          break;
        case 'finance':
          // PERBAIKAN: Mengarah ke file baru Anda
          window.location.href = 'keuangan.html'; 
          break;
        case 'productivity':
           // PERBAIKAN: Mengarah ke file baru Anda
          window.location.href = 'produktivitas.html';
          break;
      }
    });
  });
});