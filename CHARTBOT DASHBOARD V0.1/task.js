import { db } from './db.js';


export async function addTask(task) {
await db.tasks.add(task);
}
export async function getTasks() {
return await db.tasks.orderBy('due').toArray();
}
export async function markNotified(id) {
await db.tasks.update(id, {_notified: true});
}