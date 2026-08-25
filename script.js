let currentType = 'expense';

function showForm(type) {
  currentType = type;
  document.getElementById('entryForm').style.display = 'block';
}

document.getElementById('entryForm').addEventListener('submit', function(e) {
  e.preventDefault(); // stops the page from refreshing on submit

  const amountInput = document.getElementById('amount');
  const amountValue = amountInput.value.trim();
  const errorDiv = document.getElementById('amountError');

  // Must be a number with 0, 1, or 2 decimal places
  const validAmount = /^\d+(\.\d{1,2})?$/;

  if (!validAmount.test(amountValue)) {
    errorDiv.style.display = 'block';
    return; // stop here, don't save
  }
  errorDiv.style.display = 'none';

  const entry = {
    type: currentType,
    date: document.getElementById('date').value,
    amount: parseFloat(document.getElementById('amount').value),
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

function renderEntries() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  const listDiv = document.getElementById('entryList');

  listDiv.innerHTML = entries.map(e => `
    <p>${e.date} — ${e.type === 'income' ? '+' : '-'}$${e.amount} 
    (${e.category}): ${e.description}</p>
  `).join('');
}

function deleteEntry(index) {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  entries.splice(index, 1); // removes 1 item at that position
  localStorage.setItem('entries', JSON.stringify(entries));

  renderEntries();
  updateMonthlyNet();
}

function updateMonthlyNet() {
  const entries = JSON.parse(localStorage.getItem('entries')) || [];
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "2026-08"

  const monthEntries = entries.filter(e => e.date.startsWith(currentMonth));

  const net = monthEntries.reduce((total, e) => {
    return e.type === 'income' ? total + e.amount : total - e.amount;
  }, 0);

  document.getElementById('monthlyNet').textContent = `$${net.toFixed(2)}`;
}

// Run these when the page first loads
renderEntries();
updateMonthlyNet();