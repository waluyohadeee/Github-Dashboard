// db.js — Dexie schema wrapper
import Dexie from './lib/dexie.min.js';
export const db = new Dexie('LocalAppDB');
db.version(1).stores({
tasks: '++id,title,due,done,reminderAt,_notified',
quotes: '++id,content,author',
chartSeries: '++id,createdAt,values',
kb: '++id,pattern,response'
});


// seed helper
export async function seedIfEmpty() {
const qCount = await db.quotes.count();
if (!qCount) {
await db.quotes.bulkAdd([
{content: 'Mulailah hari dengan niat.', author: 'Anon'},
{content: 'Satu langkah kecil = satu kemenangan.', author: 'Anon'}
]);
}
const kbCount = await db.kb.count();
if (!kbCount) {
await db.kb.bulkAdd([
{pattern: 'bagaimana menambah tugas', response: 'Klik menu Tugas → Tambah → isi judul.'},
{pattern: 'ingatkan saya', response: 'Kamu bisa menambahkan reminder pada tugas dengan memilih tanggal.'}
]);
}
}