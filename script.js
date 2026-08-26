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
  updateMonthlyNet();
});

function deleteEntry(index) {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  entries.splice(index, 1);
  localStorage.setItem('entries', JSON.stringify(entries));

  renderEntries();
  updateMonthlyNet();
}

function monthLabel(dateStr) {
  // dateStr looks like "2026-08-25" -- turn it into "August 2026"
  const [year, month] = dateStr.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function renderEntries() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];

  // Keep track of each entry's original position in localStorage,
  // since we need that index for deleteEntry to still work after sorting
  const withIndex = entries.map((e, i) => ({ ...e, originalIndex: i }));

  // Sort newest date first
  withIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

  const listDiv = document.getElementById('entryList');

  let html = '';
  let lastMonth = null;

  withIndex.forEach(e => {
    const label = monthLabel(e.date);

    if (label !== lastMonth) {
      html += `<h3>${label}</h3>`;
      lastMonth = label;
    }

    html += `
      <p>
        ${e.date} — ${e.type === 'income' ? '+' : '-'}$${e.amount.toFixed(2)}
        (${e.category}): ${e.description}
        <button onclick="deleteEntry(${e.originalIndex})" class="delete-btn">✕</button>
      </p>
    `;
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

renderEntries();
updateMonthlyNet();