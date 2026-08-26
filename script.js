let currentType = 'expense';

const expenseCategories = ['food', 'shopping', 'school', 'rent', 'other'];
const incomeCategories = ['paycheck', 'gift', 'refund', 'other'];

function showForm(type) {
  currentType = type;
  const form = document.getElementById('entryForm');
  form.style.display = 'block';

  const categorySelect = document.getElementById('category');
  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  // Clear existing options, then rebuild from the right list
  categorySelect.innerHTML = categories
    .map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`)
    .join('');
}

function restrictAmount(input) {
  let value = input.value.replace(/[^\d.]/g, '');

  const parts = value.split('.');
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('');
  }

  if (value.includes('.')) {
    const [whole, decimal] = value.split('.');
    value = whole + '.' + decimal.slice(0, 2);
  }

  input.value = value;
}

document.getElementById('entryForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const amountInput = document.getElementById('amount');
  const amountValue = amountInput.value.trim();
  const errorDiv = document.getElementById('amountError');

  const validAmount = /^\d+(\.\d{1,2})?$/;

  if (!validAmount.test(amountValue)) {
    errorDiv.style.display = 'block';
    return;
  }
  errorDiv.style.display = 'none';

  const entry = {
    type: currentType,
    date: document.getElementById('date').value,
    amount: parseFloat(amountValue),
    description: document.getElementById('description').value,
    category: document.getElementById('category').value
  };

  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  entries.push(entry);
  localStorage.setItem('entries', JSON.stringify(entries));

  document.getElementById('entryForm').reset();
  document.getElementById('entryForm').style.display = 'none';

  renderEntries();
  renderCharts();
  updateMonthlyNet();
});

function deleteEntry(index) {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  entries.splice(index, 1);
  localStorage.setItem('entries', JSON.stringify(entries));

  renderEntries();
  renderCharts();
}

function monthLabel(dateStr) {
  // dateStr looks like "2026-08-25" -- turn it into "August 2026"
  const [year, month] = dateStr.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

let monthChartInstances = [];

function renderEntries() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];

  const withIndex = entries.map((e, i) => ({ ...e, originalIndex: i }));
  withIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

  const groups = {};
  withIndex.forEach(e => {
    const label = monthLabel(e.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });

  const container = document.getElementById('pageContainer');
  let html = '';
  const monthLabels = Object.keys(groups);

  monthLabels.forEach((label, idx) => {
    const monthEntries = groups[label];

    const net = monthEntries.reduce((total, e) => {
      return e.type === 'income' ? total + e.amount : total - e.amount;
    }, 0);

    html += `<div class="month-entries">`;
    html += `<h1>${label}</h1>`;
    html += `<h2>Net: $${net.toFixed(2)}</h2>`;

    monthEntries.forEach(e => {
      html += `
        <p>
          ${e.date} — ${e.type === 'income' ? '+' : '-'}$${e.amount.toFixed(2)}
          (${e.category}): ${e.description}
          <button onclick="deleteEntry(${e.originalIndex})" class="delete-btn">✕</button>
        </p>
      `;
    });

    html += `</div>`;
    html += `<div class="month-chart-cell"><canvas id="monthPie${idx}"></canvas></div>`;
  });

  container.innerHTML = html;

  // Destroy old month charts before drawing new ones, same reasoning as the yearly pie chart
  monthChartInstances.forEach(chart => chart.destroy());
  monthChartInstances = [];

  const pieColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];

  monthLabels.forEach((label, idx) => {
    const monthEntries = groups[label];
    const categoryTotals = {};

    monthEntries.forEach(e => {
      if (e.type !== 'expense') return;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const canvas = document.getElementById(`monthPie${idx}`);
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: Object.keys(categoryTotals),
        datasets: [{
          data: Object.values(categoryTotals),
          backgroundColor: pieColors
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });

    monthChartInstances.push(chart);
  });
}

function updateMonthlyNet() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  const monthEntries = entries.filter(e => e.date.startsWith(currentMonth));

  const net = monthEntries.reduce((total, e) => {
    return e.type === 'income' ? total + e.amount : total - e.amount;
  }, 0);

  document.getElementById('monthlyNet').textContent = `$${net.toFixed(2)}`;
}

let lineChartInstance = null;
let pieChartInstance = null;

function renderCharts() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];

    // ---- LINE CHART: total spending per month ----
  const spendingByMonth = {};

  entries.forEach(e => {
    if (e.type !== 'expense') return;
    const monthKey = e.date.slice(0, 7); // "2026-08" -- reliable for sorting
    spendingByMonth[monthKey] = (spendingByMonth[monthKey] || 0) + e.amount;
  });

  // Sort using the "YYYY-MM" key -- plain string sort works correctly here
  const sortedKeys = Object.keys(spendingByMonth).sort();

  const sortedMonths = sortedKeys.map(key => {
    const [year, month] = key.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  const lineData = sortedKeys.map(key => spendingByMonth[key]);

    // ---- PIE CHART: percentage spent per category (this year) ----
  const currentYear = new Date().getFullYear().toString();
  const categoryTotals = {};

  entries.forEach(e => {
    if (e.type !== 'expense') return;
    if (!e.date.startsWith(currentYear)) return;
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categoryLabels = Object.keys(categoryTotals);
  const categoryData = Object.values(categoryTotals);
  const pieColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: categoryData,
        backgroundColor: pieColors
      }]
    },
    options: {
      plugins: {
        legend: { display: false } // hide Chart.js's built-in legend, we're using our own
      }
    }
  });

  // Build the custom legend
  const total = categoryData.reduce((sum, val) => sum + val, 0);
  const legendDiv = document.getElementById('pieLegend');

  legendDiv.innerHTML = categoryLabels.map((label, i) => {
    const percent = total > 0 ? ((categoryData[i] / total) * 100).toFixed(1) : 0;
    const color = pieColors[i % pieColors.length];
    const displayName = label.charAt(0).toUpperCase() + label.slice(1);

    return `
      <div class="legend-item">
        <div class="legend-color-box" style="background-color: ${color};"></div>
        <span>${displayName}: ${percent}%</span>
      </div>
    `;
  }).join('');
}

renderEntries();
renderCharts();