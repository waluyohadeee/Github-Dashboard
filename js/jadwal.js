const formJadwal = document.getElementById('form-jadwal');
const tabelJadwal = document.getElementById('tabel-jadwal');

function loadJadwal() {
  const data = JSON.parse(localStorage.getItem('jadwal')) || [];
  tabelJadwal.innerHTML = '';
  data.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.judul}</td>
      <td>${new Date(item.waktu).toLocaleString('id-ID')}</td>
      <td>
        <button onclick="hapusJadwal(${index})">Hapus</button>
      </td>
    `;
    tabelJadwal.appendChild(row);
  });
}

formJadwal.addEventListener('submit', e => {
  e.preventDefault();
  const judul = document.getElementById('judul').value;
  const waktu = document.getElementById('waktu').value;
  const data = JSON.parse(localStorage.getItem('jadwal')) || [];
  data.push({ judul, waktu });
  localStorage.setItem('jadwal', JSON.stringify(data));
  formJadwal.reset();
  loadJadwal();
});

function hapusJadwal(index) {
  const data = JSON.parse(localStorage.getItem('jadwal')) || [];
  data.splice(index, 1);
  localStorage.setItem('jadwal', JSON.stringify(data));
  loadJadwal();
}

loadJadwal();
