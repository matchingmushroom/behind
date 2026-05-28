let customers = [], currentCIF = null, currentGroup = "", slicerMeta = null;
window.currentCustomer = { name: '', account: '', renewal: '', primaryPhone: '', secondaryPhone: '' };

window.onload = async () => {
  console.log("Premium App initialization started...");
  await crmDb.init();
  setupSearch();
  await loadInitialCachedLedgers();
  checkSessionOnLoad();
};

async function loadInitialCachedLedgers() {
  const cachedList = await crmDb.getAll('customers');
  if (cachedList.length > 0) {
    customers = cachedList;
    showToast(`Loaded ${customers.length} cached records offline.`, 'success');
    triggerFuzzySearch('');
  }
}

async function syncLedgerDataOnStart() {
  if (!navigator.onLine) return;
  loadCustomerListLegacy();
}

async function loadCustomerListLegacy() {
  try {
    const data = await callBackend('customers');
    customers = data;
    await crmDb.clearStore('customers');
    for(const c of data) {
      await crmDb.put('customers', c);
    }
    showToast(`Loaded ${customers.length} customer ledgers.`, 'success');
    triggerFuzzySearch('');
  } catch(e) {
    showToast('Could not load base ledger right now.', 'error');
  }
}

// ==========================================
// navigation slider
// ==========================================
function navTo(v) {
  if(v === 'group') {
    if(!currentGroup || currentGroup.toUpperCase() === "NO GROUP") {
      showToast("No active group registration exists for this customer.", 'warning');
      return;
    }
  } else if(v !== 'search' && !currentCIF) {
    showToast("Select a customer ledger from Search first.", 'info');
    return;
  }
  
  document.querySelectorAll('.view').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  
  document.getElementById('view-'+v).classList.remove('hidden');
  document.getElementById('n-'+v).classList.add('active');
  
  const indicator = document.getElementById('bottom-indicator');
  const items = ['search', 'detail', 'group', 'insights'];
  const idx = items.indexOf(v);
  if (idx !== -1 && indicator) {
    indicator.style.transform = `translateX(${idx * 100}%)`;
  }
  
  if(v === 'detail') loadDetails();
  if(v === 'group') loadGroupDetails();
  if(v === 'insights') loadInsights();
}

// ==========================================
// RE-DESIGNED DETAIL VIEW & TIMELINE
// ==========================================
let portfolioSortField = 'SCHEME';
let portfolioSortOrder = 'asc';

function sortPortfolio(field) {
  if (portfolioSortField === field) {
    portfolioSortOrder = portfolioSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    portfolioSortField = field;
    portfolioSortOrder = 'asc';
  }
  
  document.querySelectorAll('.sort-icon').forEach(icon => icon.innerText = '↕');
  document.getElementById(`sort-${field}`).innerText = portfolioSortOrder === 'asc' ? '↑' : '↓';
  
  loadLocalDetailPortfolioTable();
}

async function loadLocalDetailPortfolioTable() {
  const m = await crmDb.get('metrics', currentCIF);
  if (!m || !m.accounts) return;
  
  const sorted = [...m.accounts].sort((a, b) => {
    let valA = a[portfolioSortField];
    let valB = b[portfolioSortField];
    
    if (typeof valA === 'string') {
      valA = valA.toUpperCase();
      valB = valB.toUpperCase();
    }
    
    if (valA < valB) return portfolioSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return portfolioSortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  const tbody = document.querySelector("#tbl-loan tbody");
  tbody.innerHTML = sorted.map(a => {
    const rateValue = parseFloat(a.FULL_RATE) || 0;
    const schemeName = (a.SCHEME || '').trim().toUpperCase();
    const netOvd = parseFloat(a.NET_OVD) || 0;
    const isInterestDiscontinued = rateValue === 0 && schemeName !== 'RRGZI' && schemeName !== 'ODPBQ' && schemeName !== 'RGITQ' && schemeName !== 'NEEOD' && Math.abs(netOvd) > 0.0001;
    
    return `
      <tr class="${isInterestDiscontinued ? 'tr-discontinued' : ''}">
        <td>
          <b>${a.SCHEME}</b>
          ${isInterestDiscontinued ? '<br><span class="interest-badge">⚠️ Interest Discontinued</span>' : ''}
          <br><span style="color:var(--theme-text-muted); font-size:11px;">${a.ACCOUNT_NO}</span>
        </td>
        <td>${fAmt(a.OUTSTANDING_LOAN)}</td>
        <td>
          <span style="background:rgba(26,59,92,0.06); padding:4px 10px; border-radius:30px; font-weight:700;">
            ${a.FULL_RATE}%
          </span>
        </td>
        <td style="color:var(--danger); font-weight:700;">${fAmt(a.MIN_BAL_NPA)}</td>
        <td style="color:var(--warning); font-weight:700;">${fAmt(a.MIN_BAL_WL)}</td>
        <td style="font-weight:700;">${fAmt(a.NET_OVD)}</td>
      </tr>`;
  }).join('');
}

// ==========================================
// REALTIME DEBOUNCED FUZZY SEARCH logic
// ==========================================
let searchDebounceTimer = null;
let bulkSelectedCIFs = new Set();

function setupSearch() {
  const inp = document.getElementById('searchInp');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const clearBtn = document.getElementById('clearSearchBtn');
    if (inp.value) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
    
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      triggerFuzzySearch(inp.value);
    }, 250);
  });
  
  renderRecentChipList();
}

function clearSearchInput() {
  const inp = document.getElementById('searchInp');
  inp.value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  triggerFuzzySearch('');
}

async function triggerFuzzySearch(query) {
  const resGrid = document.getElementById('results');
  const recBox = document.getElementById('recentSearchesBox');
  
  if (!query) {
    await renderSearchResultsGrid(customers.slice(0, 15));
    recBox.classList.add('hidden');
    return;
  }
  
  recBox.classList.add('hidden');
  const q = query.trim().toUpperCase();
  
  const scoredList = customers.map(c => {
    let score = 0;
    const name = (c.name || '').toUpperCase();
    const id = (c.id || '').toUpperCase();
    
    if (id === q) score += 100;
    else if (id.startsWith(q)) score += 80;
    else if (id.includes(q)) score += 40;
    
    if (name === q) score += 90;
    else if (name.startsWith(q)) score += 70;
    else {
      const words = name.split(/\s+/);
      let wordMatch = false;
      words.forEach(w => {
        if (w.startsWith(q)) { score += 50; wordMatch = true; }
      });
      if (!wordMatch && name.includes(q)) score += 20;
    }
    return { customer: c, score: score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.customer)
    .slice(0, 15);

  await renderSearchResultsGrid(scoredList);
}

async function renderSearchResultsGrid(list) {
  const grid = document.getElementById('results');
  grid.innerHTML = '';
  
  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:48px 24px; color:var(--theme-text-muted);">
        <i class="material-icons-round" style="font-size:56px; margin-bottom:12px; color:var(--theme-border);">person_search</i>
        <div style="font-size:16px; font-weight:700; color:var(--theme-text-secondary);">No customer matching search queries</div>
        <div style="font-size:13px; margin-top:4px;">Double check spelling or CIF digits</div>
      </div>`;
    return;
  }
  
  for (const c of list) {
    const card = document.createElement('div');
    const m = await crmDb.get('metrics', c.id);
    let cat = 'Pass';
    let netOvdVal = 'रु 0.00';
    let maxOvdDaysVal = 0;
    
    if (m) {
      cat = m.CATEGORY_ACTUAL || 'Pass';
      netOvdVal = fAmt(m.TOTAL_OVERDUE_NET);
      maxOvdDaysVal = m.MAX_OVD_DAYS || 0;
    }
    
    const lowerCat = cat.toLowerCase();
    card.className = `glass-card customer-card ${lowerCat}-status-card ${lowerCat}-status`;
    card.style.animationDelay = '0.05s';
    
    const isChecked = bulkSelectedCIFs.has(c.id);
    const initial = (c.name || 'CS').substring(0, 2).toUpperCase();
    
    card.innerHTML = `
      <div class="card-top">
        <div class="card-title-sec">
          <div class="card-avatar">${initial}</div>
          <div>
            <h4 class="card-name">${c.name}</h4>
            <span class="card-cif">CIF: ${c.id}</span>
          </div>
        </div>
        <div class="card-badge-container">
          <div class="card-checkbox ${isChecked ? 'checked' : ''}" onclick="toggleBulkSelect(event, '${c.id}')">
            ${isChecked ? '<i class="material-icons-round" style="font-size:16px;">check</i>' : ''}
          </div>
          <span class="card-badge badge-premium badge-${lowerCat === 'pass' ? 'act-pass' : (lowerCat === 'wl' ? 'act-wl' : 'act-npa')}" style="margin-top:6px;">${cat}</span>
        </div>
      </div>
      <div class="card-body-row">
        <div class="card-metric"><span class="metric-lbl">Net Overdue</span><span class="metric-val ${maxOvdDaysVal > 0 ? 'high-ovd' : ''}">${netOvdVal}</span></div>
        <div class="card-metric" style="text-align:right;"><span class="metric-lbl">Overdue Days</span><span class="metric-val">${maxOvdDaysVal} Days</span></div>
      </div>
    `;
    
    card.onclick = (e) => {
      if (e.target.closest('.card-checkbox')) return;
      saveRecentSearch(c.id, c.name);
      currentCIF = c.id;
      navTo('detail');
    };
    
    grid.appendChild(card);
  }
}

function toggleBulkSelect(event, cifId) {
  event.stopPropagation();
  if (bulkSelectedCIFs.has(cifId)) bulkSelectedCIFs.delete(cifId);
  else bulkSelectedCIFs.add(cifId);
  
  const box = event.currentTarget;
  box.classList.toggle('checked');
  box.innerHTML = box.classList.contains('checked') ? '<i class="material-icons-round" style="font-size:16px;">check</i>' : '';
  
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const txt = document.getElementById('bulkCountText');
  if (bulkSelectedCIFs.size > 0) {
    txt.innerText = `${bulkSelectedCIFs.size} Account${bulkSelectedCIFs.size !== 1 ? 's' : ''} Selected`;
    bar.classList.add('active');
  } else {
    bar.classList.remove('active');
  }
}

function clearBulkSelection() {
  bulkSelectedCIFs.clear();
  document.querySelectorAll('.card-checkbox').forEach(box => {
    box.classList.remove('checked');
    box.innerHTML = '';
  });
  updateBulkBar();
}

async function copyBulkReminders() {
  const textList = [];
  for (const cifId of bulkSelectedCIFs) {
    const m = await crmDb.get('metrics', cifId);
    if (m) {
      const text = `Account Name: ${m.CUSTOMER_NAME}\nNet Overdue: ${fAmt(m.TOTAL_OVERDUE_NET)}\nOverdue Days: ${m.MAX_OVD_DAYS}\n`;
      textList.push(text);
    }
  }
  if (textList.length === 0) return;
  navigator.clipboard.writeText(textList.join('\n---\n')).then(() => {
    showToast('Consolidated bulk reminders copied to clipboard', 'success');
    clearBulkSelection();
  });
}

async function sendBulkWhatsApp() {
  const cifs = Array.from(bulkSelectedCIFs);
  const m = await crmDb.get('metrics', cifs[0]);
  if (!m) return;
  
  const extra = await getCachedExtraDetails(cifs[0]);
  const phone = extra ? (extra.Contact_No || '').split(';')[0]?.trim() : '';
  if (!phone) {
    showToast(`No contact number recorded for ${m.CUSTOMER_NAME}. Bulk WhatsApp cancelled.`, 'error');
    return;
  }
  
  const text = encodeURIComponent(`Dear Customer, this is a gentle reminder that your loan account overdue balance clearance is pending. Kindly coordinate clearance. Thank you.`);
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.startsWith('977') ? cleanPhone : '977' + cleanPhone;
  window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  
  clearBulkSelection();
}

// ==========================================
// SUGGESTED SEARCH RECENT CHIPS
// ==========================================
async function saveRecentSearch(cifId, name) {
  let recents = await crmDb.getKV('recent_searches') || [];
  recents = recents.filter(item => item.id !== cifId);
  recents.unshift({ id: cifId, name: name });
  recents = recents.slice(0, 5);
  await crmDb.putKV('recent_searches', recents);
}

async function renderRecentChipList() {
  const container = document.getElementById('recentChipsList');
  const box = document.getElementById('recentSearchesBox');
  const recents = await crmDb.getKV('recent_searches') || [];
  
  if (recents.length === 0) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';
  container.innerHTML = '';
  
  recents.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'recent-chip';
    chip.innerHTML = `
      <span onclick="triggerRecentChipClick('${item.id}')">${item.name}</span>
      <i class="material-icons-round" onclick="deleteRecentChip(event, '${item.id}')">close</i>
    `;
    container.appendChild(chip);
  });
}

function triggerRecentChipClick(cifId) {
  currentCIF = cifId;
  navTo('detail');
}

async function deleteRecentChip(event, cifId) {
  event.stopPropagation();
  let recents = await crmDb.getKV('recent_searches') || [];
  recents = recents.filter(item => item.id !== cifId);
  await crmDb.putKV('recent_searches', recents);
  renderRecentChipList();
}

// Initialize theme on page load
initTheme();
