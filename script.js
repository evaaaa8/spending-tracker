let currentType = 'expense';

function showForm(type) {
  currentType = type;
  document.getElementById('entryForm').style.display = 'block';
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

function renderEntries() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];

  const withIndex = entries.map((e, i) => ({ ...e, originalIndex: i }));
  withIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group entries by month label first
  const groups = {};
  withIndex.forEach(e => {
    const label = monthLabel(e.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });

  const listDiv = document.getElementById('entryList');
  let html = '';

  // Object.keys(groups) preserves insertion order, which is already
  // newest-to-oldest since withIndex was sorted before grouping
  Object.keys(groups).forEach(label => {
    const monthEntries = groups[label];

    const net = monthEntries.reduce((total, e) => {
      return e.type === 'income' ? total + e.amount : total - e.amount;
    }, 0);

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
  });

  listDiv.innerHTML = html;
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
    if (e.type !== 'expense') return; // only count expenses
    const label = monthLabel(e.date);
    spendingByMonth[label] = (spendingByMonth[label] || 0) + e.amount;
  });

  // Sort chronologically (oldest to newest) for a left-to-right timeline
  const sortedMonths = Object.keys(spendingByMonth).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  const lineData = sortedMonths.map(m => spendingByMonth[m]);

  if (lineChartInstance) lineChartInstance.destroy(); // clear old chart before redrawing

  lineChartInstance = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: sortedMonths,
      datasets: [{
        label: 'Spending per Month',
        data: lineData,
        borderColor: 'red',
        fill: false
      }]
    }
  });

  // ---- PIE CHART: percentage spent per category (this year) ----
  const currentYear = new Date().getFullYear().toString();
  const categoryTotals = {};

  entries.forEach(e => {
    if (e.type !== 'expense') return;
    if (!e.date.startsWith(currentYear)) return; // only this year
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categoryLabels = Object.keys(categoryTotals);
  const categoryData = Object.values(categoryTotals);

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: categoryData,
        backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22']
      }]
    }
  });
}

renderEntries();
renderCharts();