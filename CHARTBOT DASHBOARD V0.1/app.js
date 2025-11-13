import { db, seedIfEmpty } from './db.js';
import { initChat, getBotResponse } from './chat.js';
import { initChart, refreshChart } from './chart.js';
import { addTask, getTasks } from './tasks.js';


async function init() {
await seedIfEmpty();
await initChat();
initChart();
await loadQuote();
renderTasks();
setInterval(refreshChart, 2000); // polling
setInterval(reminderChecker, 60_000);
setupUI();
}


async function loadQuote() {
const q = await db.quotes.orderBy('id').toArray();
if (q.length) document.getElementById('quote').textContent = q[Math.floor(Math.random()*q.length)].content;
}


function setupUI() {
document.getElementById('chat-send').addEventListener('click', async ()=>{
const t = document.getElementById('chat-input').value;
const resp = await getBotResponse(t);
const log = document.getElementById('chat-log');
log.innerHTML += '<div class="user">'+t+'</div><div class="bot">'+resp+'</div>';
});


document.getElementById('task-form').addEventListener('submit', async (e)=>{
e.preventDefault();
const title = document.getElementById('task-title').value;
const due = document.getElementById('task-due').value || null;
await addTask({ title, due, done: false, reminderAt: due ? new Date(due).getTime(): null, _notified:false });
document.getElementById('task-form').reset();
renderTasks();
});
}


async function renderTasks(){
const list = document.getElementById('task-list');
const tasks = await getTasks();
list.innerHTML = tasks.map(t=>`<li>${t.title} - ${t.due || '-'} </li>`).join('');
}


async function reminderChecker(){
if (Notification.permission !== 'granted') return;
const now = Date.now();
const due = await db.tasks.where('reminderAt').belowOrEqual(now).and(t=>!t._notified).toArray();
for (const t of due) {
new Notification('Pengingat', { body: t.title });
await db.tasks.update(t.id, { _notified: true });
}
}


init();