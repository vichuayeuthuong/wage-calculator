/**
 * Wage Calculator Application
 * Manages wage transactions for Hoàng Anh Group, Nam Định.
 * Features: Transaction entry (newest first), filtering with date range, total sum for filtered worker, hiding non-filtered workers, formatted wage display, transaction deletion, and sharing results.
 */

// State Management
const state = {
  wages: [], // Stored transactions
  pendingWages: [], // Unsaved transactions
  filteredWages: [], // Filtered transactions
  warehouses: [], // List of warehouses
  categories: ['Bốc xếp'], // List of categories
  workers: [], // List of workers
  currentWageInput: null,
  currentWageIndex: null,
  currentWageIsPending: false,
  calculatorValue: ''
};

// Utility Functions
const $ = (id) => document.getElementById(id);
const formatCurrency = (value) => value.toLocaleString('vi-VN') + 'đ';
const isValidInput = (value) => value !== undefined && value !== null && value !== '';

// Local Storage Management
const Storage = {
  save() {
    localStorage.setItem('wageData', JSON.stringify({
      wages: state.wages,
      categories: state.categories,
      workers: state.workers,
      warehouses: state.warehouses
    }));
  },
  load() {
    const data = JSON.parse(localStorage.getItem('wageData')) || {};
    state.wages = data.wages || [];
    state.categories = data.categories || ['Bốc xếp'];
    state.workers = data.workers || [];
    state.warehouses = data.warehouses || [];
  }
};

// DOM Manipulation
const DOM = {
  renderList(containerId, items, onDelete) {
    const list = $(containerId);
    list.innerHTML = '';
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.textContent = item;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Xóa';
      deleteBtn.onclick = () => onDelete(index);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },
  renderFilterOptions() {
    const transactionFilter = $('transactionFilter');
    transactionFilter.innerHTML = '<option value="">Tất cả</option>' + 
      state.warehouses
        .filter(isValidInput)
        .map(w => `<option value="${w}">${w}</option>`)
        .join('');

    const categoryFilter = $('categoryFilter');
    categoryFilter.innerHTML = '<option value="">Tất cả</option>' + 
      state.categories
        .filter(isValidInput)
        .map(c => `<option value="${c}">${c}</option>`)
        .join('');

    const workerFilter = $('workerFilter');
    workerFilter.innerHTML = '<option value="">Tất cả</option>' + 
      state.workers
        .filter(isValidInput)
        .map(w => `<option value="${w}">${w}</option>`)
        .join('');
  },
  renderTable(data = state.wages, isFiltered = false) {
    const tbodyId = isFiltered ? 'filteredWageTableBody' : 'wageTableBody';
    const tbody = $(tbodyId);
    tbody.innerHTML = '';

    const workerFilter = $('workerFilter').value;
    const transactions = isFiltered ? data : [...data, ...state.pendingWages];
    transactions.forEach((entry, index) => {
      const row = document.createElement('tr');
      if (!entry.isPending) row.classList.add('saved');

      // Trong tab Kết quả lọc, chỉ hiển thị công nhân được lọc
      const displayedWorkers = isFiltered && workerFilter 
        ? entry.workers.split(',').filter(w => w.trim() === workerFilter).join(',')
        : entry.workers;

      const workerOptions = state.workers
        .map(w => `<option value="${w}" ${entry.workers.includes(w) ? 'selected' : ''}>${w}</option>`)
        .join('');

      row.innerHTML = `
        <td><input type="date" value="${entry.date}" ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'date', this.value, ${entry.isPending})"></td>
        <td><input type="text" value="${entry.transaction || ''}" list="warehouseListData" ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'transaction', this.value, ${entry.isPending})"></td>
        <td><input type="text" value="${entry.category || ''}" list="categoryListData" ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'category', this.value, ${entry.isPending})"></td>
        <td><input type="number" value="${entry.tonnage || ''}" ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'tonnage', this.value, ${entry.isPending})"></td>
        <td><input type="text" value="${entry.wagePerPerson ? formatCurrency(entry.wagePerPerson) : ''}" class="${entry.wagePerPerson < 0 ? 'negative' : ''}" ${entry.isPending ? '' : 'disabled'} onclick="openCalculator(this, ${index}, ${entry.isPending})" readonly></td>
        <td>
          <select multiple ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'workers', Array.from(this.selectedOptions).map(opt => opt.value).join(','), ${entry.isPending})">
            ${workerOptions}
          </select>
        </td>
        <td><input type="text" value="${entry.note || ''}" ${entry.isPending ? '' : 'disabled'} onchange="updateEntry(${index}, 'note', this.value, ${entry.isPending})"></td>
        ${isFiltered ? '' : `
          <td>
            ${entry.isPending ? `<button class="save-btn" onclick="saveTransaction(${index})">Lưu</button>` : ''}
            <button class="delete-btn" onclick="deleteTransaction(${index}, ${entry.isPending})">Xóa</button>
          </td>
        `}
      `;
      tbody.appendChild(row);
    });

    // Cập nhật danh sách gợi ý trong bảng
    $('warehouseListData').innerHTML = state.warehouses
      .filter(isValidInput)
      .map(w => `<option value="${w}">`)
      .join('');

    $('categoryListData').innerHTML = state.categories
      .filter(isValidInput)
      .map(c => `<option value="${c}">`)
      .join('');

    // Cập nhật tổng tiền công trong tab Kết quả lọc
    if (isFiltered) {
      const workerFilter = $('workerFilter').value;
      const total = state.filteredWages.reduce((sum, entry) => {
        if (entry.workers && (!workerFilter || entry.workers.includes(workerFilter))) {
          // Chỉ tính tiền công cho công nhân được lọc
          return sum + (entry.wagePerPerson || 0);
        }
        return sum;
      }, 0);
      $('filteredTotalAmount').textContent = formatCurrency(total);
    }
  },
  renderWageSummary() {
    const workerWages = {};
    state.wages.forEach(entry => {
      if (entry.workers) {
        entry.workers.split(',').map(w => w.trim()).forEach(worker => {
          if (worker) {
            workerWages[worker] = (workerWages[worker] || 0) + (parseFloat(entry.wagePerPerson) || 0);
          }
        });
      }
    });

    const list = $('workerWages');
    list.innerHTML = Object.entries(workerWages)
      .map(([worker, wage]) => `<li>${worker}: ${formatCurrency(wage)}</li>`)
      .join('');
  }
};

// Share Results
function shareResults() {
  const workerFilter = $('workerFilter').value;
  const total = $('filteredTotalAmount').textContent;
  let shareText = `Kết quả lương - Hoàng Anh Group\nTổng tiền công: ${total}\n\n`;
  
  state.filteredWages.forEach(entry => {
    const displayedWorkers = workerFilter 
      ? entry.workers.split(',').filter(w => w.trim() === workerFilter).join(',')
      : entry.workers;
    shareText += `Ngày: ${entry.date}\nKho: ${entry.transaction || ''}\nDanh mục: ${entry.category || ''}\nTấn hàng: ${entry.tonnage || ''}\nTiền công/người: ${formatCurrency(entry.wagePerPerson)}\nCông nhân: ${displayedWorkers}\nGhi chú: ${entry.note || ''}\n\n`;
  });

  // Thử sử dụng Web Share API
  if (navigator.share) {
    navigator.share({
      title: 'Kết quả lương - Hoàng Anh Group',
      text: shareText
    }).catch(err => {
      console.error('Lỗi khi chia sẻ:', err);
      alert('Không thể chia sẻ. Vui lòng sao chép kết quả thủ công:\n\n' + shareText);
    });
  } else {
    // Nếu Web Share API không được hỗ trợ, mở giao diện in
    window.print();
  }
}

// Transaction Management
const Transactions = {
  add() {
    const newEntry = {
      date: new Date().toISOString().split('T')[0],
      transaction: '',
      category: 'Bốc xếp',
      tonnage: 0,
      wagePerPerson: 0,
      workers: '',
      note: '',
      isPending: true
    };
    state.pendingWages.unshift(newEntry); // Thêm vào đầu danh sách
    DOM.renderTable();
  },
  save(index) {
    const entry = state.pendingWages[index];
    if (entry) {
      entry.isPending = false;
      state.wages.unshift(entry); // Thêm vào đầu danh sách
      state.pendingWages.splice(index, 1);
      if (entry.transaction && !state.warehouses.includes(entry.transaction)) {
        state.warehouses.push(entry.transaction);
      }
      Storage.save();
      DOM.renderTable();
      DOM.renderFilteredTable();
      DOM.renderList('warehouseList', state.warehouses, (idx) => {
        state.warehouses.splice(idx, 1);
        Storage.save();
        DOM.renderList('warehouseList', state.warehouses, (idx) => state.warehouses.splice(idx, 1));
        DOM.renderFilterOptions();
      });
      DOM.renderFilterOptions();
    }
  },
  delete(index, isPending) {
    if (isPending) {
      state.pendingWages.splice(index, 1);
    } else {
      state.wages.splice(index, 1);
      Storage.save();
    }
    DOM.renderTable();
    DOM.renderFilteredTable();
    DOM.renderWageSummary();
  },
  update(index, field, value, isPending) {
    const target = isPending ? state.pendingWages : state.wages;
    target[index][field] = field === 'tonnage' || field === 'wagePerPerson' ? parseFloat(value) || 0 : value;
    if (!isPending) Storage.save();
    DOM.renderTable();
  },
  filter() {
    const startDate = $('startDate').value;
    const endDate = $('endDate').value;
    const transactionFilter = $('transactionFilter').value;
    const categoryFilter = $('categoryFilter').value;
    const workerFilter = $('workerFilter').value;

    state.filteredWages = state.wages;

    if (startDate && endDate) {
      state.filteredWages = state.filteredWages.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
      });
    }

    state.filteredWages = state.filteredWages.filter(entry => {
      return (
        (!transactionFilter || entry.transaction === transactionFilter) &&
        (!categoryFilter || entry.category === categoryFilter) &&
        (!workerFilter || (entry.workers || '').includes(workerFilter))
      );
    });

    DOM.renderFilteredTable();
    showTab('filteredTransactions');
  },
  resetFilters() {
    $('startDate').value = '';
    $('endDate').value = '';
    $('transactionFilter').value = '';
    $('categoryFilter').value = '';
    $('workerFilter').value = '';
    state.filteredWages = state.wages;
    DOM.renderFilteredTable();
    showTab('allTransactions');
  }
};

// Calculator Management
const Calculator = {
  open(input, index, isPending) {
    state.currentWageInput = input;
    state.currentWageIndex = index;
    state.currentWageIsPending = isPending;
    state.calculatorValue = input.value.replace(/[^0-9.-]/g, '') || ''; // Loại bỏ ký hiệu "đ" khi chỉnh sửa
    $('calculatorDisplay').value = state.calculatorValue;
    $('calculatorModal').style.display = 'block';
  },
  close() {
    $('calculatorModal').style.display = 'none';
  },
  input(value) {
    state.calculatorValue += value;
    $('calculatorDisplay').value = state.calculatorValue;
  },
  clear() {
    state.calculatorValue = '';
    $('calculatorDisplay').value = state.calculatorValue;
  },
  evaluate() {
    try {
      state.calculatorValue = eval(state.calculatorValue).toString();
      $('calculatorDisplay').value = state.calculatorValue;
    } catch (e) {
      state.calculatorValue = 'Lỗi';
      $('calculatorDisplay').value = state.calculatorValue;
    }
  },
  apply() {
    if (state.currentWageInput && state.calculatorValue !== 'Lỗi') {
      state.currentWageInput.value = formatCurrency(parseFloat(state.calculatorValue));
      const target = state.currentWageIsPending ? state.pendingWages : state.wages;
      target[state.currentWageIndex].wagePerPerson = parseFloat(state.calculatorValue) || 0;
      if (!state.currentWageIsPending) Storage.save();
      DOM.renderTable();
    }
    this.close();
  }
};

// Tab Management
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  $(tabId).classList.add('active');
  document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Event Handlers
function addWarehouse() {
  const newWarehouse = $('newWarehouse').value.trim();
  if (newWarehouse && !state.warehouses.includes(newWarehouse)) {
    state.warehouses.push(newWarehouse);
    Storage.save();
    DOM.renderList('warehouseList', state.warehouses, (index) => {
      state.warehouses.splice(index, 1);
      Storage.save();
      DOM.renderList('warehouseList', state.warehouses, (index) => state.warehouses.splice(index, 1));
      DOM.renderFilterOptions();
    });
    DOM.renderFilterOptions();
    $('newWarehouse').value = '';
  }
}

function addCategory() {
  const newCategory = $('newCategory').value.trim();
  if (newCategory && !state.categories.includes(newCategory)) {
    state.categories.push(newCategory);
    Storage.save();
    DOM.renderList('categoryList', state.categories, (index) => {
      state.categories.splice(index, 1);
      Storage.save();
      DOM.renderList('categoryList', state.categories, (index) => state.categories.splice(index, 1));
      DOM.renderFilterOptions();
    });
    DOM.renderFilterOptions();
    $('newCategory').value = '';
  }
}

function addWorker() {
  const newWorker = $('newWorker').value.trim();
  if (newWorker && !state.workers.includes(newWorker)) {
    state.workers.push(newWorker);
    Storage.save();
    DOM.renderList('workerList', state.workers, (index) => {
      state.workers.splice(index, 1);
      Storage.save();
      DOM.renderList('workerList', state.workers, (index) => state.workers.splice(index, 1));
      DOM.renderFilterOptions();
    });
    DOM.renderFilterOptions();
    $('newWorker').value = '';
  }
}

function addTransaction() {
  Transactions.add();
}

function saveTransaction(index) {
  Transactions.save(index);
}

function deleteTransaction(index, isPending) {
  Transactions.delete(index, isPending);
}

function updateEntry(index, field, value, isPending) {
  Transactions.update(index, field, value, isPending);
}

function applyFilters() {
  Transactions.filter();
}

function resetFilters() {
  Transactions.resetFilters();
}

function openCalculator(input, index, isPending) {
  Calculator.open(input, index, isPending);
}

function closeCalculator() {
  Calculator.close();
}

function calculatorInput(value) {
  Calculator.input(value);
}

function calculatorClear() {
  Calculator.clear();
}

function calculatorEvaluate() {
  Calculator.evaluate();
}

function applyWage() {
  Calculator.apply();
}

// DOM Rendering Functions
DOM.renderFilteredTable = () => DOM.renderTable(state.filteredWages, true);

// Initialize Application
Storage.load();
DOM.renderTable();
DOM.renderFilteredTable();
DOM.renderFilterOptions();
DOM.renderList('warehouseList', state.warehouses, (index) => {
  state.warehouses.splice(index, 1);
  Storage.save();
  DOM.renderList('warehouseList', state.warehouses, (index) => state.warehouses.splice(index, 1));
  DOM.renderFilterOptions();
});
DOM.renderList('categoryList', state.categories, (index) => {
  state.categories.splice(index, 1);
  Storage.save();
  DOM.renderList('categoryList', state.categories, (index) => state.categories.splice(index, 1));
  DOM.renderFilterOptions();
});
DOM.renderList('workerList', state.workers, (index) => {
  state.workers.splice(index, 1);
  Storage.save();
  DOM.renderList('workerList', state.workers, (index) => state.workers.splice(index, 1));
  DOM.renderFilterOptions();
});
DOM.renderWageSummary();