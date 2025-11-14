// js/calendar.js
// Helper untuk logika murni kalender

/**
 * Mendapatkan semua hari yang akan ditampilkan di grid kalender
 * @param {number} year - Tahun (cth: 2025)
 * @param {number} month - Bulan (0-11, 0 = Januari)
 * @returns {Array<Object>} Array berisi objek hari
 */
export function getMonthDays(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  
  // 1. Dapatkan hari pertama di bulan ini
  const firstDayOfWeek = date.getDay(); // 0 (Minggu) - 6 (Sabtu)
  
  // 2. Dapatkan jumlah hari di bulan ini
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // 3. Dapatkan jumlah hari di bulan SEBELUMNYA
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // 4. Tambahkan "padding" hari dari bulan sebelumnya
  for (let i = firstDayOfWeek; i > 0; i--) {
    days.push({
      day: daysInPrevMonth - i + 1,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i + 1)
    });
  }

  // 5. Tambahkan hari di bulan ini
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // 6. Tambahkan "padding" hari dari bulan selanjutnya
  // Grid standar 6x7 = 42
  const currentGridSize = days.length;
  // Fleksibel untuk 5 baris (35) atau 6 baris (42)
  const targetGridSize = currentGridSize > 35 ? 42 : 35; 
  const remainingDays = targetGridSize - currentGridSize;
  
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }
  
  return days;
}

/**
 * Format objek Date menjadi YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatToYYYYMMDD(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Cek apakah dua tanggal berada di hari yang sama
 * @param {Date | string} date1
 * @param {Date | string} date2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Perbandingan tanggal tanpa mempedulikan jam
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}