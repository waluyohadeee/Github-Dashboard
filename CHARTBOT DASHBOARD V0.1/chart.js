import Chart from './lib/chart.min.js';
import { db } from './db.js';


let myChart;
export function initChart() {
const ctx = document.getElementById('chart').getContext('2d');
myChart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'Data', data: [] }] } });
}
export async function refreshChart() {
const rows = await db.chartSeries.orderBy('createdAt').toArray();
if (!rows.length) return;
const last = rows[rows.length-1].values;
myChart.data.labels = last.map((_,i)=>i+1);
myChart.data.datasets[0].data = last;
myChart.update();
}