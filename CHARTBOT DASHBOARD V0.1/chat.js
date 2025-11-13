// chat.js — simple rule-based + Fuse fuzzy search
import Fuse from './lib/fuse.min.js';
import { db } from './db.js';


let fuse;
export async function initChat() {
const kb = await db.kb.toArray();
fuse = new Fuse(kb, { keys: ['pattern'], threshold: 0.4 });
}


export async function getBotResponse(text) {
if (!fuse) await initChat();
const res = fuse.search(text);
if (res.length) return res[0].item.response;
if (/tugas|ingat/i.test(text)) return 'Mau aku tambahkan tugas baru untukmu?';
return "Maaf, aku belum mengerti. Coba kata lain atau tambahkan FAQ baru.";
}