/* ============================================================
   KANAKKU — app.js
   Local-first spending tracker. No build step, no dependencies
   beyond Chart.js (CDN). Data lives in IndexedDB with a
   localStorage mirror as a second safety net against iOS Safari's
   7-day storage eviction. Export/Import gives a manual backup path
   until a cloud sync layer (Supabase) is added in a future round.
   ============================================================ */

(function () {
"use strict";

/* ============================================================
   1. CATEGORY SYSTEM — Indian / Tamil Nadu day-to-day spending
   ============================================================ */
const CATEGORIES = [
  { id: 'groceries_kitchen', label: 'Groceries & Kitchen', emo: '🛒', color: '#E8A33D', fixed: false, subs: [
    { id: 'groceries', label: 'Groceries', tags: ['Ration','Monthly Grocery','Sundries'], merchants: ['Nilgiris','More Supermarket','Ratnadeep','Local Kirana'] },
    { id: 'veg_fruits', label: 'Vegetables & Fruits', tags: ['Veg Market','Weekly Veg'], merchants: ['Koyambedu Market','Veg Cart','Sunday Market'] },
    { id: 'milk_bakery', label: 'Milk & Bakery', tags: ['Milk','Curd','Bread'], merchants: ['Aavin','Local Dairy','Bakery'] },
    { id: 'tea_snacks', label: 'Tea, Coffee & Snacks', tags: ['Tea Kadai','Bajji','Evening Snack'], merchants: ['Tea Shop','Bakery'] },
  ]},
  { id: 'food_outside', label: 'Food Outside', emo: '🍽️', color: '#E8625D', fixed: false, subs: [
    { id: 'hotel_tiffin', label: 'Hotel / Tiffin / Meals', tags: ['Breakfast','Lunch','Mess','Tiffin Center'], merchants: ['Saravana Bhavan','Sangeetha','Local Mess'] },
    { id: 'food_delivery', label: 'Food Delivery', tags: ['Swiggy','Zomato','Late Night'], merchants: ['Swiggy','Zomato'] },
  ]},
  { id: 'transport', label: 'Transport', emo: '🚗', color: '#2DA8A0', fixed: false, subs: [
    { id: 'fuel', label: 'Fuel', tags: ['Petrol','Diesel','Bike','Car'], merchants: ['IOCL','HP Petrol','BPCL','Shell'] },
    { id: 'auto_cab_bus_train', label: 'Auto / Cab / Bus / Train', tags: ['Auto','Ola','Uber','TNSTC Bus','Local Train','Metro'], merchants: ['Ola','Uber','TNSTC','Chennai Metro'] },
  ]},
  { id: 'home_utilities', label: 'Home & Utilities', emo: '🏠', color: '#8A7FD1', fixed: true, subs: [
    { id: 'electricity', label: 'Electricity (EB)', tags: ['TANGEDCO','EB Bill'], merchants: ['TANGEDCO'] },
    { id: 'recharge_broadband', label: 'Recharge / Broadband', tags: ['Mobile Recharge','WiFi','DTH'], merchants: ['Jio','Airtel','ACT Fibernet','Vi'] },
    { id: 'rent_maintenance', label: 'Rent / Maintenance', tags: ['House Rent','Apartment Maintenance','Sump Water'], merchants: ['Landlord','Apartment Association'] },
    { id: 'maid_helper', label: 'Maid / Helper', tags: ['Maid Salary','Cook','Driver','Gardener'], merchants: [] },
  ]},
  { id: 'health', label: 'Health', emo: '🏥', color: '#4CAF7D', fixed: false, subs: [
    { id: 'medical_pharmacy', label: 'Medical / Pharmacy', tags: ['Doctor Consultation','Medicines','Lab Test'], merchants: ['Apollo Pharmacy','Local Clinic'] },
  ]},
  { id: 'family', label: 'Family', emo: '👨‍👩‍👧', color: '#D97757', fixed: false, subs: [
    { id: 'amma_family', label: 'Amma / Family Support', tags: ['Amma','Appa','Parents','Family Support','Home Support'], merchants: [] },
    { id: 'baby_child', label: 'Baby / Child', tags: ['Diapers','School Van','Toys','Milk Powder'], merchants: [] },
    { id: 'temple_function_gifts', label: 'Temple / Function / Gifts', tags: ['Temple Hundi','Pooja Items','Wedding Gift','Function Contribution'], merchants: [] },
    { id: 'education_fees', label: 'Education / Fees', tags: ['School Fee','Tuition','College Fee','Books','Uniform'], merchants: [] },
  ]},
  { id: 'financial', label: 'Financial Commitments', emo: '💰', color: '#5B8DEF', fixed: true, subs: [
    { id: 'emi_loan_insurance', label: 'EMI / Loan / Insurance', tags: ['Home Loan EMI','Car Loan','LIC Premium','Health Insurance'], merchants: ['LIC','Bank EMI'] },
    { id: 'subscriptions_ott', label: 'Subscriptions / OTT', tags: ['Netflix','Hotstar','Prime','Spotify'], merchants: ['Netflix','Disney+ Hotstar','Amazon Prime','Spotify'] },
  ]},
  { id: 'lifestyle', label: 'Lifestyle', emo: '🛍️', color: '#C77DD2', fixed: false, subs: [
    { id: 'shopping', label: 'Shopping', tags: ['Clothes','Electronics','Footwear'], merchants: ['Pothys','Saravana Stores','Myntra'] },
    { id: 'online_orders', label: 'Online Orders', tags: ['Amazon Order','Flipkart Order','Online Purchase'], merchants: ['Amazon','Flipkart','Meesho'] },
    { id: 'salon_grooming', label: 'Salon / Grooming', tags: ['Haircut','Salon','Spa','Parlour'], merchants: ['Naturals','Green Trends','Lakme Salon'] },
    { id: 'travel', label: 'Travel', tags: ['Weekend Trip','Vacation','Native Visit','Hotel Stay'], merchants: [] },
  ]},
  { id: 'misc', label: 'Miscellaneous', emo: '🗂️', color: '#8B95A1', fixed: false, subs: [
    { id: 'local_misc', label: 'Local Misc', tags: ['Tailor','Cobbler','Xerox','Courier','Donation','Parking'], merchants: [] },
  ]},
];

const SUB_INDEX = {};
CATEGORIES.forEach(cat => cat.subs.forEach(sub => { SUB_INDEX[sub.id] = { sub, cat }; }));

function getSub(subId) { return SUB_INDEX[subId] || null; }
function getCatColor(subId) { const e = getSub(subId); return e ? e.cat.color : '#8B95A1'; }
function getCatEmo(subId) { const e = getSub(subId); return e ? e.cat.emo : '❓'; }
function getSubLabel(subId) { const e = getSub(subId); return e ? e.sub.label : 'Uncategorised'; }
function getCatLabel(subId) { const e = getSub(subId); return e ? e.cat.label : 'Uncategorised'; }
function isFixedSub(subId) { const e = getSub(subId); return e ? !!e.cat.fixed : false; }

const KEYWORD_MAP = [
  [['swiggy'], 'food_delivery'], [['zomato'], 'food_delivery'],
  [['saravana bhavan','sangeetha','mess','tiffin','idli','dosa','hotel'], 'hotel_tiffin'],
  [['petrol','diesel','iocl','hp petrol','bpcl','shell','fuel','bunk'], 'fuel'],
  [['ola','uber','auto','metro','tnstc','bus','train','rapido'], 'auto_cab_bus_train'],
  [['tangedco','eb bill','electricity'], 'electricity'],
  [['jio','airtel','act fibernet',' vi ','recharge','broadband','wifi','dth'], 'recharge_broadband'],
  [['rent','maintenance','sump'], 'rent_maintenance'],
  [['maid','cook','driver salary','gardener'], 'maid_helper'],
  [['apollo','pharmacy','clinic','hospital','doctor','medicine','lab test'], 'medical_pharmacy'],
  [['diaper','school van','milk powder','baby'], 'baby_child'],
  [['amma','appa','mother','father','parents','family support'], 'amma_family'],
  [['temple','pooja','hundi','wedding gift','function'], 'temple_function_gifts'],
  [['school fee','tuition','college fee','uniform','textbook'], 'education_fees'],
  [['lic','emi','insurance','loan'], 'emi_loan_insurance'],
  [['netflix','hotstar','prime video','spotify','ott'], 'subscriptions_ott'],
  [['myntra','pothys','saravana stores','clothes','footwear'], 'shopping'],
  [['amazon','flipkart','meesho','online order'], 'online_orders'],
  [['salon','haircut','parlour','spa','naturals','green trends'], 'salon_grooming'],
  [['aavin','dairy',' milk','curd','bread'], 'milk_bakery'],
  [['nilgiris','more supermarket','ratnadeep','kirana','ration'], 'groceries'],
  [['koyambedu','vegetable','veg market','veg cart'], 'veg_fruits'],
  [['tea','coffee','bajji','bonda','snack'], 'tea_snacks'],
  [['tailor','cobbler','xerox','courier','donation','parking'], 'local_misc'],
  [['trip','vacation','native visit','resort'], 'travel'],
];

function suggestSubFromText(text) {
  if (!text) return null;
  const t = (' ' + text.toLowerCase() + ' ');
  for (const [keywords, subId] of KEYWORD_MAP) {
    for (const kw of keywords) { if (t.includes(kw)) return subId; }
  }
  return null;
}

const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI', icon: '📲' },
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'debitcard', label: 'Debit Card', icon: '💳' },
  { id: 'creditcard', label: 'Credit Card', icon: '🪪' },
  { id: 'autodebit', label: 'Auto-debit', icon: '🔁' },
];

/* ============================================================
   1b. INCOME SOURCES & SAVINGS / INVESTMENT TYPES
   ============================================================ */
const INCOME_SOURCES = [
  { id: 'salary', label: 'Salary', emo: '💼' },
  { id: 'business', label: 'Business / Freelance', emo: '🧾' },
  { id: 'rental', label: 'Rental Income', emo: '🏠' },
  { id: 'interest', label: 'Interest / Dividends', emo: '🏦' },
  { id: 'other_income', label: 'Other Income', emo: '➕' },
];
function getIncomeSourceLabel(id) { const s = INCOME_SOURCES.find(x => x.id === id); return s ? s.label : 'Other Income'; }
function getIncomeSourceEmo(id) { const s = INCOME_SOURCES.find(x => x.id === id); return s ? s.emo : '➕'; }

const SAVING_TYPES = [
  { id: 'mutual_fund', label: 'Mutual Funds', emo: '📈', color: '#5B8DEF' },
  { id: 'equity', label: 'Equity / Stocks', emo: '📊', color: '#4CAF7D' },
  { id: 'gold', label: 'Gold', emo: '🥇', color: '#E8A33D' },
  { id: 'chit_fund', label: 'Chit Fund', emo: '🤝', color: '#C77DD2' },
  { id: 'cash_account', label: 'Cash in Account', emo: '🏦', color: '#2DA8A0' },
  { id: 'other_saving', label: 'Other Savings', emo: '💼', color: '#8B95A1' },
];
function getSavingTypeLabel(id) { const s = SAVING_TYPES.find(x => x.id === id); return s ? s.label : 'Other Savings'; }
function getSavingTypeEmo(id) { const s = SAVING_TYPES.find(x => x.id === id); return s ? s.emo : '💼'; }
function getSavingTypeColor(id) { const s = SAVING_TYPES.find(x => x.id === id); return s ? s.color : '#8B95A1'; }

/* ============================================================
   2. STORAGE LAYER — IndexedDB local cache + Google Sheets sync.
   Every write lands in IndexedDB instantly (so entry never waits
   on the network), is queued, and pushed to your Google Sheet in
   the background. On load, the Sheet is treated as the source of
   truth and reconciled into the local cache.
   ============================================================ */
const DB_NAME = 'kanakku-sheets-db';
const DB_VERSION = 2;
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('budgets')) db.createObjectStore('budgets', { keyPath: 'subId' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'opId', autoIncrement: true });
      if (!db.objectStoreNames.contains('income')) {
        const store = db.createObjectStore('income', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('savings')) {
        const store = db.createObjectStore('savings', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e);
  });
}
function tx(storeName, mode) { return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName)); }

function mirrorToLocalStorage() {
  Promise.all([getAllExpenses(), getAllBudgets(), getAllIncome(), getAllSavings()]).then(([expenses, budgets, income, savings]) => {
    try { localStorage.setItem('kanakku_mirror', JSON.stringify({ expenses, budgets, income, savings, savedAt: Date.now() })); }
    catch (e) { /* storage full/unavailable — IndexedDB remains primary local cache */ }
  });
}

function queueOp(type, payload) {
  return tx('syncQueue', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.add({ type, payload, ts: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  })).then((opId) => { scheduleFlush(); return opId; });
}
function getQueue() {
  return tx('syncQueue', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = reject;
  }));
}
function removeFromQueue(opId) {
  return tx('syncQueue', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(opId); req.onsuccess = resolve; req.onerror = reject;
  }));
}

/* ---------- local cache read/write (instant, no network wait) ---------- */
function addExpense(expense, skipQueue) {
  return tx('expenses', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put(expense);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('upsertExpense', expense); resolve(expense); };
    req.onerror = reject;
  }));
}
function deleteExpense(id, skipQueue) {
  return tx('expenses', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('deleteExpense', { id }); resolve(); };
    req.onerror = reject;
  }));
}
function getAllExpenses() {
  return tx('expenses', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = reject;
  }));
}
function setBudget(subId, amount, skipQueue) {
  return tx('budgets', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put({ subId, amount });
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('setBudget', { subId, amount }); resolve(); };
    req.onerror = reject;
  }));
}
function getAllBudgets() {
  return tx('budgets', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = reject;
  }));
}
function deleteBudget(subId, skipQueue) {
  return tx('budgets', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(subId);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('deleteBudget', { subId }); resolve(); };
    req.onerror = reject;
  }));
}
/* ---------- income ---------- */
function addIncome(entry, skipQueue) {
  return tx('income', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('upsertIncome', entry); resolve(entry); };
    req.onerror = reject;
  }));
}
function deleteIncome(id, skipQueue) {
  return tx('income', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('deleteIncome', { id }); resolve(); };
    req.onerror = reject;
  }));
}
function getAllIncome() {
  return tx('income', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = reject;
  }));
}

/* ---------- savings / investments ---------- */
function addSaving(entry, skipQueue) {
  return tx('savings', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('upsertSaving', entry); resolve(entry); };
    req.onerror = reject;
  }));
}
function deleteSaving(id, skipQueue) {
  return tx('savings', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => { mirrorToLocalStorage(); if (!skipQueue) queueOp('deleteSaving', { id }); resolve(); };
    req.onerror = reject;
  }));
}
function getAllSavings() {
  return tx('savings', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = reject;
  }));
}

function setKV(key, value) {
  return tx('kv', 'readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put({ key, value });
    req.onsuccess = resolve; req.onerror = reject;
  }));
}
function getKV(key, fallback) {
  return tx('kv', 'readonly').then(store => new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
    req.onerror = () => resolve(fallback);
  })).catch(() => fallback);
}

/* ---------- Google Sheets sync (Apps Script Web App) ---------- */
const sync = { status: 'idle', lastSyncedAt: null, pendingCount: 0, gasUrl: null, listeners: [] };
function onSyncChange(fn) { sync.listeners.push(fn); }
function notifySync() { sync.listeners.forEach(fn => { try { fn(sync); } catch (e) {} }); }

function gasFetch(action, payload) {
  if (!sync.gasUrl) return Promise.reject(new Error('not-configured'));
  // Body sent as a plain string with no explicit Content-Type header, so the
  // browser treats this as a CORS-safelisted "simple request" and skips the
  // preflight OPTIONS call — Apps Script Web Apps don't handle preflight well.
  return fetch(sync.gasUrl, { method: 'POST', body: JSON.stringify({ action, payload }) }).then(r => r.json());
}

function testConnection(url) {
  return fetch(url + '?action=getAll').then(r => r.json()).then(data => {
    if (!data || data.ok !== true) throw new Error('bad-response');
    return data;
  });
}

function fetchRemoteAll() {
  if (!sync.gasUrl) return Promise.resolve(null);
  return fetch(sync.gasUrl + '?action=getAll').then(r => r.json());
}

let flushTimer = null;
function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flushQueue, 400); }

function flushQueue() {
  if (!sync.gasUrl || !navigator.onLine) { updatePendingCount(); return Promise.resolve(); }
  sync.status = 'syncing'; notifySync();
  return getQueue().then(async (items) => {
    for (const item of items) {
      try {
        await gasFetch(item.type, item.payload);
        await removeFromQueue(item.opId);
      } catch (err) {
        sync.status = 'error'; notifySync();
        return; // stop on first failure; remaining queued items retry on next trigger
      }
    }
    sync.status = 'idle'; sync.lastSyncedAt = Date.now();
    setKV('lastSyncedAt', sync.lastSyncedAt);
    updatePendingCount();
    notifySync();
  });
}

function updatePendingCount() {
  return getQueue().then(items => { sync.pendingCount = items.length; notifySync(); return items.length; });
}

window.addEventListener('online', () => flushQueue());

/* ============================================================
   3. STATE + HELPERS
   ============================================================ */
const state = {
  expenses: [],
  income: [],
  savings: [],
  budgets: {},
  view: 'home',
  theme: 'dark',
  editingId: null,
  editingType: 'expense',
  analyticsRange: 30,
  historyFilter: { subId: null, query: '', type: 'expense' },
};

function uid() { return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtINR(n, decimals) {
  n = Number(n) || 0;
  const opts = { maximumFractionDigits: decimals === undefined ? 0 : decimals, minimumFractionDigits: 0 };
  return '₹' + n.toLocaleString('en-IN', opts);
}
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function startOfWeek(d) { const x = new Date(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day; x.setDate(x.getDate() + diff); x.setHours(0,0,0,0); return x; }

window.K = { CATEGORIES, getSub, getCatColor, getCatEmo, getSubLabel, getCatLabel, isFixedSub,
  suggestSubFromText, PAYMENT_MODES, INCOME_SOURCES, getIncomeSourceLabel, getIncomeSourceEmo,
  SAVING_TYPES, getSavingTypeLabel, getSavingTypeEmo, getSavingTypeColor,
  openDB, addExpense, deleteExpense, getAllExpenses,
  addIncome, deleteIncome, getAllIncome, addSaving, deleteSaving, getAllSavings,
  setBudget, getAllBudgets, deleteBudget, setKV, getKV, state, uid, todayISO, fmtINR, daysInMonth, startOfWeek,
  sync, onSyncChange, testConnection, fetchRemoteAll, flushQueue, updatePendingCount, scheduleFlush };

})();

/* ============================================================
   4. SMART LOGIC — rule-based "AI-like" helpers.
   All computed locally from the person's own history; no network
   calls, so this works fully offline and never leaks data.
   ============================================================ */
(function () {
"use strict";
const K = window.K;

function recentTags(limit) {
  limit = limit || 10;
  const scores = {};
  const now = Date.now();
  K.state.expenses.forEach(e => {
    const ageDays = (now - new Date(e.date).getTime()) / 86400000;
    const recencyWeight = Math.max(0.15, 1 - ageDays / 90);
    (e.tags || []).forEach(t => { scores[t] = (scores[t] || 0) + recencyWeight; });
  });
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, limit).map(x => x[0]);
}

function frequentCombos(limit) {
  limit = limit || 5;
  const map = {};
  K.state.expenses.forEach(e => {
    if (!e.merchant) return;
    const key = e.merchant.trim().toLowerCase() + '|' + e.subId;
    if (!map[key]) map[key] = { merchant: e.merchant, subId: e.subId, count: 0, total: 0 };
    map[key].count++; map[key].total += e.amount;
  });
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, limit)
    .map(c => Object.assign(c, { avg: Math.round(c.total / c.count) }));
}

function statsForSub(subId, excludeId) {
  const amounts = K.state.expenses.filter(e => e.subId === subId && e.id !== excludeId).map(e => e.amount);
  if (amounts.length < 3) return null;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
  return { mean, stddev: Math.sqrt(variance), count: amounts.length };
}

function isUnusual(amount, subId) {
  const s = statsForSub(subId);
  if (!s || s.count < 4) return null;
  const threshold = s.mean + 1.5 * s.stddev;
  if (amount > threshold && amount > s.mean * 1.4) return { mean: s.mean, threshold };
  return null;
}

function inRange(dateStr, fromDate, toDate) {
  const d = new Date(dateStr);
  return d >= fromDate && d <= toDate;
}
function sumRange(fromDate, toDate) {
  return K.state.expenses.filter(e => inRange(e.date, fromDate, toDate)).reduce((s, e) => s + e.amount, 0);
}

function monthlyProjection() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dim = K.daysInMonth(now);
  const dayOfMonth = now.getDate();
  const spentSoFar = sumRange(monthStart, now);
  const sevenAgo = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0,0,0,0);
  const last7Total = sumRange(sevenAgo, now);
  const last7Days = Math.min(7, dayOfMonth);
  const avgDaily7 = last7Days > 0 ? last7Total / last7Days : 0;
  const daysRemaining = dim - dayOfMonth;
  const projected = spentSoFar + avgDaily7 * daysRemaining;
  return { spentSoFar, projected: Math.max(projected, spentSoFar), avgDaily7, dayOfMonth, dim, daysRemaining };
}

function categoryTotals(fromDate, toDate) {
  const totals = {};
  K.state.expenses.filter(e => inRange(e.date, fromDate, toDate)).forEach(e => {
    totals[e.subId] = (totals[e.subId] || 0) + e.amount;
  });
  return totals;
}

function budgetPace() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dim = K.daysInMonth(now);
  const dayOfMonth = now.getDate();
  const paceExpected = dayOfMonth / dim;
  const totals = categoryTotals(monthStart, now);
  const rows = [];
  Object.entries(K.state.budgets).forEach(([subId, budget]) => {
    if (!budget) return;
    const spent = totals[subId] || 0;
    const pace = spent / budget;
    rows.push({ subId, budget, spent, pace, overPace: pace > paceExpected + 0.15, paceExpected });
  });
  return rows;
}

function topMerchants(fromDate, toDate, limit) {
  limit = limit || 5;
  const map = {};
  K.state.expenses.filter(e => inRange(e.date, fromDate, toDate) && e.merchant).forEach(e => {
    const key = e.merchant.trim();
    map[key] = (map[key] || 0) + e.amount;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function paymentModeSplit(fromDate, toDate) {
  const map = {};
  K.state.expenses.filter(e => inRange(e.date, fromDate, toDate)).forEach(e => {
    map[e.paymentMode] = (map[e.paymentMode] || 0) + e.amount;
  });
  return map;
}

function fixedVsVariable(fromDate, toDate) {
  let fixed = 0, variable = 0;
  K.state.expenses.filter(e => inRange(e.date, fromDate, toDate)).forEach(e => {
    if (K.isFixedSub(e.subId)) fixed += e.amount; else variable += e.amount;
  });
  return { fixed, variable };
}

function topLeaks(fromDate, toDate, limit) {
  limit = limit || 3;
  const totals = categoryTotals(fromDate, toDate);
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .filter(([subId]) => !K.isFixedSub(subId))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([subId, amt]) => ({ subId, amt, pct: Math.round((amt / total) * 100) }));
}

function generateInsights() {
  const insights = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = K.startOfWeek(now);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); lastWeekEnd.setHours(23,59,59,999);

  const thisWeek = sumRange(weekStart, now);
  const lastWeek = sumRange(lastWeekStart, lastWeekEnd);
  if (lastWeek > 200) {
    const diff = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (Math.abs(diff) >= 12) {
      insights.push({ type: diff > 0 ? 'bad' : 'good',
        html: `You've spent <strong>${Math.abs(diff)}% ${diff > 0 ? 'more' : 'less'}</strong> this week compared to last week.` });
    }
  }

  const leaks = topLeaks(monthStart, now, 1);
  if (leaks.length && leaks[0].amt > 500) {
    insights.push({ type: 'neutral',
      html: `<strong>${K.getSubLabel(leaks[0].subId)}</strong> is your top discretionary spend this month — ${K.fmtINR(leaks[0].amt)} (${leaks[0].pct}% of total).` });
  }

  const pace = budgetPace().filter(r => r.overPace);
  if (pace.length) {
    insights.push({ type: 'bad',
      html: `You're on track to overspend your <strong>${K.getSubLabel(pace[0].subId)}</strong> budget this month at the current pace.` });
  }

  const proj = monthlyProjection();
  if (proj.avgDaily7 > 0) {
    insights.push({ type: 'neutral',
      html: `At your recent daily average of <strong>${K.fmtINR(proj.avgDaily7)}</strong>, you're projected to spend <strong>${K.fmtINR(proj.projected)}</strong> this month.` });
  }

  const combos = frequentCombos(1);
  if (combos.length && combos[0].count >= 4) {
    insights.push({ type: 'neutral',
      html: `You've spent at <strong>${combos[0].merchant}</strong> ${combos[0].count} times this period — avg ${K.fmtINR(combos[0].avg)} per visit.` });
  }

  if (!insights.length) insights.push({ type: 'neutral', html: `Log a few more expenses and I'll start surfacing patterns here.` });
  return insights.slice(0, 4);
}

function generateAlerts() {
  const alerts = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Budget pace warnings — every overspending category, not just one
  budgetPace().filter(r => r.overPace).forEach(r => {
    const pct = Math.round(r.pace * 100);
    alerts.push({ severity: 'high',
      html: `<strong>${K.getSubLabel(r.subId)}</strong> is at ${pct}% of its monthly budget, ahead of schedule (${Math.round(r.paceExpected*100)}% of month gone).` });
  });

  // Unusual transactions in the last 3 days
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); threeDaysAgo.setHours(0,0,0,0);
  K.state.expenses.filter(e => inRange(e.date, threeDaysAgo, now)).forEach(e => {
    const s = statsForSub(e.subId, e.id);
    if (s && s.count >= 4) {
      const threshold = s.mean + 1.5 * s.stddev;
      if (e.amount > threshold && e.amount > s.mean * 1.4) {
        alerts.push({ severity: 'medium',
          html: `<strong>${K.fmtINR(e.amount)}</strong> at ${e.merchant || K.getSubLabel(e.subId)} is well above your usual ${K.fmtINR(s.mean)} for ${K.getSubLabel(e.subId)}.` });
      }
    }
  });

  // Recurring bills that historically land around this time of month but haven't been logged yet
  const recurringSubs = [...new Set(K.state.expenses.filter(e => e.recurring).map(e => e.subId))];
  recurringSubs.forEach(subId => {
    const loggedThisMonth = K.state.expenses.some(e => e.subId === subId && e.recurring && inRange(e.date, monthStart, now));
    const pastOccurrences = K.state.expenses.filter(e => e.subId === subId && e.recurring);
    if (!loggedThisMonth && pastOccurrences.length >= 2 && now.getDate() > 20) {
      alerts.push({ severity: 'low',
        html: `You usually log a recurring <strong>${K.getSubLabel(subId)}</strong> payment each month — haven't seen one yet this month.` });
    }
  });

  return alerts.slice(0, 5);
}

Object.assign(window.K, {
  recentTags, frequentCombos, isUnusual, statsForSub, sumRange, inRange,
  monthlyProjection, categoryTotals, budgetPace, topMerchants, paymentModeSplit,
  fixedVsVariable, topLeaks, generateInsights, generateAlerts,
});
})();

/* ============================================================
   5. RENDER ENGINE
   ============================================================ */
(function () {
"use strict";
const K = window.K;
const charts = {};

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function toast(msg, actionLabel, actionFn) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${msg}</span>` + (actionLabel ? `<button class="undo">${actionLabel}</button>` : '');
  t.classList.add('show');
  if (actionLabel && actionFn) {
    t.querySelector('.undo').onclick = () => { actionFn(); t.classList.remove('show'); };
  }
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('show'), 3800);
}

/* -------------------- HOME -------------------- */
function homeChartColors() {
  const styles = getComputedStyle(document.body);
  return {
    text: styles.getPropertyValue('--text-mid').trim() || '#C7C1B6',
    grid: styles.getPropertyValue('--line').trim() || 'rgba(255,255,255,0.08)',
  };
}

function renderHome() {
  const root = document.getElementById('view-home');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = K.startOfWeek(now);
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

  const todaySpend = K.sumRange(todayStart, todayEnd);
  const weekSpend = K.sumRange(weekStart, now);
  const monthSpend = K.sumRange(monthStart, now);

  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); lastWeekEnd.setHours(23,59,59,999);
  const lastWeekSpend = K.sumRange(lastWeekStart, lastWeekEnd);
  const weekDelta = lastWeekSpend > 0 ? Math.round(((weekSpend - lastWeekSpend) / lastWeekSpend) * 100) : null;

  const totalBudget = Object.values(K.state.budgets).reduce((a, b) => a + (b || 0), 0);
  const dim = K.daysInMonth(now);
  const fairShareToday = totalBudget > 0 ? totalBudget / dim : (monthSpend / now.getDate() || 300);
  const ringPct = Math.min(100, Math.round((todaySpend / (fairShareToday || 1)) * 100));
  const ringOver = todaySpend > fairShareToday;
  const circumference = 2 * Math.PI * 26;
  const ringOffset = circumference - (Math.min(ringPct, 100) / 100) * circumference;

  const proj = K.monthlyProjection();
  const leaks = K.topLeaks(monthStart, now, 3);
  const combos = K.frequentCombos(4);
  const recent = [...K.state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt).slice(0, 5);
  const insights = K.generateInsights();
  const alerts = K.generateAlerts();
  const catTotals = K.categoryTotals(monthStart, now);
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCat = topCats.length ? topCats[0][1] : 1;
  const isEmpty = K.state.expenses.length === 0 && K.state.income.length === 0 && K.state.savings.length === 0;

  const monthIncome = K.state.income.filter(i => K.inRange(i.date, monthStart, now)).reduce((s, i) => s + i.amount, 0);
  const monthSavings = K.state.savings.filter(sv => K.inRange(sv.date, monthStart, now)).reduce((s, sv) => s + sv.amount, 0);
  const leftover = monthIncome - monthSpend - monthSavings;
  const savingsRate = monthIncome > 0 ? Math.round((monthSavings / monthIncome) * 100) : null;
  const hasMoneyFlowData = monthIncome > 0 || monthSavings > 0;
  const flowTotal = monthIncome > 0 ? monthIncome : (monthSpend + monthSavings) || 1;

  root.innerHTML = `
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <p class="hero-label">Today</p>
          <p class="hero-amount"><sup>₹</sup>${todaySpend.toLocaleString('en-IN')}</p>
          <p class="hero-sub">${totalBudget > 0 ? `of ~${K.fmtINR(fairShareToday)} fair-share/day` : `Projected month-end: ${K.fmtINR(proj.projected)}`}</p>
        </div>
        <div class="hero-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle class="ring-track" cx="32" cy="32" r="26" fill="none" stroke-width="6"/>
            <circle class="ring-fill ${ringOver ? 'over' : ''}" cx="32" cy="32" r="26" fill="none" stroke-width="6"
              stroke-dasharray="${circumference}" stroke-dashoffset="${ringOffset}"/>
          </svg>
          <div class="hero-ring-label">${ringPct}%</div>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-pill">
          <div class="label">This Week</div>
          <div class="value">${K.fmtINR(weekSpend)}</div>
          ${weekDelta !== null ? `<div class="delta ${weekDelta > 0 ? 'up' : 'down'}">${weekDelta > 0 ? '▲' : '▼'} ${Math.abs(weekDelta)}% vs last week</div>` : `<div class="delta">First week tracked</div>`}
        </div>
        <div class="stat-pill">
          <div class="label">This Month</div>
          <div class="value">${K.fmtINR(monthSpend)}</div>
          <div class="delta">Day ${now.getDate()} of ${dim}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">This Month's Money Flow <span class="link" data-goto="analytics">Details</span></div>
      ${hasMoneyFlowData ? `
      <div class="chart-wrap small" style="height:140px;"><canvas id="moneyFlowChart"></canvas></div>
      <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-top:14px;">
        <div class="stat-pill"><div class="label">Income</div><div class="value" style="color:var(--good);">${K.fmtINR(monthIncome)}</div></div>
        <div class="stat-pill"><div class="label">Saved</div><div class="value" style="color:var(--teal);">${K.fmtINR(monthSavings)}</div></div>
        <div class="stat-pill"><div class="label">Left Over</div><div class="value" style="color:${leftover<0?'var(--bad)':'var(--text-hi)'};">${K.fmtINR(leftover)}</div></div>
      </div>
      ${savingsRate !== null ? `<p style="font-size:12.5px;color:var(--text-low);margin:12px 2px 0;">You've saved <strong style="color:var(--text-hi);">${savingsRate}%</strong> of this month's income so far.</p>` : ''}
      ${leftover < 0 ? `<p style="font-size:12.5px;color:var(--bad);margin:8px 2px 0;">Spending + savings has gone past income this month.</p>` : ''}
      ` : `
      <p style="font-size:13px;color:var(--text-low);margin:0 0 12px;">Add your monthly income and savings to see the full picture — income, spending, and what's left, all in one place.</p>
      <div style="display:flex;gap:8px;">
        <button class="btn-ghost" id="addIncomeShortcut" style="width:auto;flex:1;padding:12px;">+ Add Income</button>
        <button class="btn-ghost" id="addSavingShortcut" style="width:auto;flex:1;padding:12px;">+ Add Saving</button>
      </div>
      `}
    </div>

    ${isEmpty ? `
    <div class="card" style="text-align:center;padding:28px 20px;">
      <div style="font-size:34px;margin-bottom:8px;">👋</div>
      <p style="font-family:var(--font-display);font-size:18px;font-weight:600;margin:0 0 6px;">Welcome to Kanakku</p>
      <p style="font-size:13.5px;color:var(--text-mid);line-height:1.6;margin:0 0 18px;max-width:320px;margin-left:auto;margin-right:auto;">
        Log your first expense and this page fills in — daily/weekly trend, category charts, budget pace, and spending insights all update automatically.
      </p>
      <button class="btn-primary" id="emptyStateAddBtn" style="max-width:220px;margin:0 auto;">+ Add First Expense</button>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Where Savings Are Going</div>
      ${monthSavings > 0 ? `
        <div class="chart-wrap small"><canvas id="homeSavingsChart"></canvas></div>
        <div class="legend-list">
          ${Object.entries(K.state.savings.filter(sv => K.inRange(sv.date, monthStart, now)).reduce((acc, sv) => { acc[sv.type] = (acc[sv.type]||0) + sv.amount; return acc; }, {}))
            .sort((a,b) => b[1]-a[1])
            .map(([typeId, amt]) => `
              <div class="legend-row">
                <span class="sw" style="background:${K.getSavingTypeColor(typeId)}"></span>
                <span class="nm">${K.getSavingTypeEmo(typeId)} ${K.getSavingTypeLabel(typeId)}</span>
                <span class="amt">${K.fmtINR(amt)}</span>
                <span class="pct">${Math.round((amt/monthSavings)*100)}%</span>
              </div>`).join('')}
        </div>
      ` : `<p style="font-size:13px;color:var(--text-low);padding:8px 0;">Log a mutual fund SIP, gold purchase, or chit contribution to see your savings mix here.</p>`}
    </div>

    <div class="card">
      <div class="card-title">This Week at a Glance</div>
      <div class="chart-wrap small"><canvas id="homeWeekChart"></canvas></div>
    </div>

    ${combos.length ? `
    <div class="scroll-row" style="margin-bottom:14px;" id="quickComboRow">
      ${combos.map(c => `
        <button class="chip" data-quick-merchant="${esc(c.merchant)}" data-quick-sub="${c.subId}" data-quick-amt="${c.avg}">
          <span>${K.getCatEmo(c.subId)}</span> ${esc(c.merchant)} · ${K.fmtINR(c.avg)}
        </button>`).join('')}
    </div>` : ''}

    ${alerts.length ? `
    <div class="card">
      <div class="card-title">Alerts</div>
      ${alerts.map(a => `
        <div class="insight">
          <span class="dot" style="background:${a.severity === 'high' ? 'var(--bad)' : a.severity === 'medium' ? 'var(--gold)' : 'var(--teal)'}"></span>
          <p>${a.html}</p>
        </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">Insights</div>
      ${insights.map(i => `
        <div class="insight">
          <span class="dot" style="background:${i.type === 'bad' ? 'var(--bad)' : i.type === 'good' ? 'var(--good)' : 'var(--gold)'}"></span>
          <p>${i.html}</p>
        </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">Where it's going <span class="link" data-goto="analytics">See all</span></div>
      ${topCats.length ? `
        <div class="chart-wrap small"><canvas id="homeCatChart"></canvas></div>
        <div class="legend-list">
          ${topCats.map(([subId, amt]) => `
            <div class="legend-row">
              <span class="sw" style="background:${K.getCatColor(subId)}"></span>
              <span class="nm">${K.getCatEmo(subId)} ${K.getSubLabel(subId)}</span>
              <span class="amt">${K.fmtINR(amt)}</span>
              <span class="pct">${Math.round((amt/maxCat===1?100:(amt/(topCats.reduce((s,[,v])=>s+v,0)||1))*100))}%</span>
            </div>`).join('')}
        </div>` : `<p style="font-size:13px;color:var(--text-low);padding:8px 0;">Category charts will appear here once you log a few expenses.</p>`}
    </div>

    ${leaks.length ? `
    <div class="card">
      <div class="card-title">Top Spending Leaks</div>
      ${leaks.map((l, i) => `
        <div class="insight">
          <span class="dot" style="background:var(--gold)"></span>
          <p><strong>#${i+1} ${K.getSubLabel(l.subId)}</strong> — ${K.fmtINR(l.amt)} (${l.pct}% of this month's spend)</p>
        </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-title">Recent Entries <span class="link" data-goto="history">See all</span></div>
      ${recent.length ? recent.map(entryRowHTML).join('') : emptyStateHTML('📝', 'No entries yet', 'Tap the + button to log your first expense.')}
    </div>
  `;

  root.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.goto)));
  root.querySelectorAll('[data-quick-merchant]').forEach(b => b.addEventListener('click', () => {
    openAddSheet(null, { merchant: b.dataset.quickMerchant, subId: b.dataset.quickSub, amount: b.dataset.quickAmt });
  }));
  root.querySelectorAll('.entry-row').forEach(r => r.addEventListener('click', () => window.openAddSheet(r.dataset.id)));
  const emptyBtn = document.getElementById('emptyStateAddBtn');
  if (emptyBtn) emptyBtn.addEventListener('click', () => window.openAddSheet(null));
  const addIncomeBtn = document.getElementById('addIncomeShortcut');
  if (addIncomeBtn) addIncomeBtn.addEventListener('click', () => window.openAddSheet(null, { type: 'income' }));
  const addSavingBtn = document.getElementById('addSavingShortcut');
  if (addSavingBtn) addSavingBtn.addEventListener('click', () => window.openAddSheet(null, { type: 'saving' }));

  drawHomeWeekChart();
  if (topCats.length) drawHomeCatChart(topCats);
  if (hasMoneyFlowData) drawMoneyFlowChart(monthIncome, monthSpend, monthSavings, leftover);
  if (monthSavings > 0) drawHomeSavingsChart(monthStart, now, monthSavings);
}

function drawHomeWeekChart() {
  const canvas = document.getElementById('homeWeekChart');
  if (!canvas) return;
  const c = homeChartColors();
  const now = new Date();
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
    data.push(K.state.expenses.filter(e => e.date === dStr).reduce((s, e) => s + e.amount, 0));
  }
  destroyChart('homeWeek');
  charts.homeWeek = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: '#E8A33D', borderRadius: 6, barThickness: 22 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => '₹' + ctx.parsed.y.toLocaleString('en-IN') } } },
      scales: {
        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: c.text, font: { size: 10 }, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
      }
    }
  });
}

function drawHomeCatChart(topCats) {
  const canvas = document.getElementById('homeCatChart');
  if (!canvas) return;
  destroyChart('homeCat');
  charts.homeCat = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: topCats.map(([id]) => K.getSubLabel(id)), datasets: [{ data: topCats.map(([, v]) => v), backgroundColor: topCats.map(([id]) => K.getCatColor(id)), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
  });
}

function drawMoneyFlowChart(income, spend, savings, leftover) {
  const canvas = document.getElementById('moneyFlowChart');
  if (!canvas) return;
  destroyChart('moneyFlow');
  const c = homeChartColors();
  const leftBar = Math.max(0, leftover);
  const labels = ['Spent', 'Saved'];
  const data = [spend, savings];
  const colors = ['#E8625D', '#2DA8A0'];
  if (income > 0) { labels.push('Left Over'); data.push(leftBar); colors.push('#4CAF7D'); }
  charts.moneyFlow = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: ['This Month'], datasets: labels.map((l, i) => ({ label: l, data: [data[i]], backgroundColor: colors[i], borderRadius: 6 })) },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: c.text, boxWidth: 10, font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ₹' + ctx.parsed.x.toLocaleString('en-IN') } } },
      scales: {
        x: { stacked: true, ticks: { color: c.text, font: { size: 10 }, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
        y: { stacked: true, ticks: { display: false }, grid: { display: false } },
      }
    }
  });
}

function drawHomeSavingsChart(monthStart, now, monthSavings) {
  const canvas = document.getElementById('homeSavingsChart');
  if (!canvas) return;
  destroyChart('homeSavings');
  const totals = K.state.savings.filter(sv => K.inRange(sv.date, monthStart, now)).reduce((acc, sv) => { acc[sv.type] = (acc[sv.type] || 0) + sv.amount; return acc; }, {});
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  charts.homeSavings = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: entries.map(([id]) => K.getSavingTypeLabel(id)), datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([id]) => K.getSavingTypeColor(id)), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
  });
}

function entryRowHTML(e) {
  const sub = K.getSub(e.subId);
  const d = new Date(e.date);
  const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `
    <div class="entry-row" data-id="${e.id}">
      <div class="entry-icon" style="background:${K.getCatColor(e.subId)}22;">${K.getCatEmo(e.subId)}</div>
      <div class="entry-mid">
        <div class="t1">${esc(e.merchant) || K.getSubLabel(e.subId)} ${e.recurring ? '<span class="entry-recurring">↻</span>' : ''}</div>
        <div class="t2">
          <span>${dateLabel}</span>
          ${e.note ? `<span>· ${esc(e.note.slice(0,40))}${e.note.length>40?'…':''}</span>` : ''}
          ${(e.tags||[]).slice(0,2).map(t => `<span class="tagpill">${esc(t)}</span>`).join('')}
        </div>
      </div>
      <div class="entry-amt">${K.fmtINR(e.amount)}</div>
    </div>`;
}

function emptyStateHTML(emo, title, body) {
  return `<div class="empty-state"><div class="emo">${emo}</div><h3>${title}</h3><p>${body}</p></div>`;
}

window.KanakkuRender = { charts, el, destroyChart, esc, toast, renderHome, entryRowHTML, emptyStateHTML };
window.renderHome = renderHome;
})();

/* -------------------- HISTORY -------------------- */
(function () {
"use strict";
const K = window.K;
const { esc, entryRowHTML, emptyStateHTML } = window.KanakkuRender;

function incomeRowHTML(e) {
  const d = new Date(e.date);
  const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `
    <div class="entry-row" data-id="${e.id}" data-type="income">
      <div class="entry-icon" style="background:var(--good-soft);">${K.getIncomeSourceEmo(e.source)}</div>
      <div class="entry-mid">
        <div class="t1">${K.getIncomeSourceLabel(e.source)}</div>
        <div class="t2"><span>${dateLabel}</span>${e.note ? `<span>· ${esc(e.note.slice(0,40))}${e.note.length>40?'…':''}</span>` : ''}</div>
      </div>
      <div class="entry-amt" style="color:var(--good);">+${K.fmtINR(e.amount)}</div>
    </div>`;
}

function savingRowHTML(e) {
  const d = new Date(e.date);
  const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `
    <div class="entry-row" data-id="${e.id}" data-type="saving">
      <div class="entry-icon" style="background:${K.getSavingTypeColor(e.type)}22;">${K.getSavingTypeEmo(e.type)}</div>
      <div class="entry-mid">
        <div class="t1">${K.getSavingTypeLabel(e.type)}</div>
        <div class="t2"><span>${dateLabel}</span>${e.note ? `<span>· ${esc(e.note.slice(0,40))}${e.note.length>40?'…':''}</span>` : ''}</div>
      </div>
      <div class="entry-amt" style="color:var(--teal);">${K.fmtINR(e.amount)}</div>
    </div>`;
}

function renderHistory() {
  const root = document.getElementById('view-history');
  const f = K.state.historyFilter;
  const type = f.type || 'expense';
  root.innerHTML = `
    <div class="range-tabs" id="historyTypeTabs" style="margin-bottom:14px;">
      <button data-type="expense" class="${type==='expense'?'active':''}">Expenses</button>
      <button data-type="income" class="${type==='income'?'active':''}">Income</button>
      <button data-type="saving" class="${type==='saving'?'active':''}">Savings</button>
    </div>
    <div class="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="historySearch" type="text" placeholder="Search merchant, note, or tag…" value="${esc(f.query)}" />
    </div>
    ${type === 'expense' ? `
    <div class="scroll-row filter-scroll" id="historyFilterRow">
      <button class="chip ${!f.subId ? 'selected' : ''}" data-filter-sub="">All</button>
      ${K.CATEGORIES.flatMap(c => c.subs).map(s => `<button class="chip ${f.subId === s.id ? 'selected' : ''}" data-filter-sub="${s.id}">${K.getCatEmo(s.id)} ${s.label}</button>`).join('')}
    </div>` : ''}
    <div id="historyList"></div>
  `;
  renderHistoryList();

  document.getElementById('historyTypeTabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    K.state.historyFilter.type = b.dataset.type;
    renderHistory();
  }));
  document.getElementById('historySearch').addEventListener('input', (e) => {
    K.state.historyFilter.query = e.target.value; renderHistoryList();
  });
  const filterRow = document.getElementById('historyFilterRow');
  if (filterRow) filterRow.querySelectorAll('[data-filter-sub]').forEach(b => b.addEventListener('click', () => {
    K.state.historyFilter.subId = b.dataset.filterSub || null;
    filterRow.querySelectorAll('[data-filter-sub]').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    renderHistoryList();
  }));
}

function renderHistoryList() {
  const listEl = document.getElementById('historyList');
  const f = K.state.historyFilter;
  const type = f.type || 'expense';

  let items, rowFn, searchFields;
  if (type === 'income') {
    items = [...K.state.income]; rowFn = incomeRowHTML;
    searchFields = (e) => [K.getIncomeSourceLabel(e.source), e.note || ''];
  } else if (type === 'saving') {
    items = [...K.state.savings]; rowFn = savingRowHTML;
    searchFields = (e) => [K.getSavingTypeLabel(e.type), e.note || ''];
  } else {
    items = [...K.state.expenses]; rowFn = entryRowHTML;
    searchFields = (e) => [e.merchant || '', e.note || '', ...(e.tags || [])];
    if (f.subId) items = items.filter(e => e.subId === f.subId);
  }

  if (f.query) {
    const q = f.query.toLowerCase();
    items = items.filter(e => searchFields(e).some(s => s.toLowerCase().includes(q)));
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date) || (b.createdAt||0) - (a.createdAt||0));

  if (!items.length) {
    const messages = {
      expense: ['🔍', 'Nothing here', 'Try a different search or filter, or log a new expense.'],
      income: ['💰', 'No income logged', 'Tap the + button and switch to Income to log your monthly salary or other earnings.'],
      saving: ['📈', 'No savings logged', 'Tap the + button and switch to Saving to log a SIP, gold purchase, or chit contribution.'],
    }[type];
    listEl.innerHTML = emptyStateHTML(...messages);
    return;
  }

  // group by date
  const groups = {};
  items.forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });
  const dateKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

  const todayStr = K.todayISO();
  const yStr = (() => { const y = new Date(); y.setDate(y.getDate()-1); return y.toISOString().slice(0,10); })();

  listEl.innerHTML = dateKeys.map(dk => {
    const dayTotal = groups[dk].reduce((s, e) => s + e.amount, 0);
    let label = new Date(dk).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (dk === todayStr) label = 'Today';
    else if (dk === yStr) label = 'Yesterday';
    return `<div class="day-group-label"><span>${label}</span><span>${K.fmtINR(dayTotal)}</span></div>
      <div class="card" style="padding:4px 14px;">${groups[dk].map(rowFn).join('')}</div>`;
  }).join('');

  listEl.querySelectorAll('.entry-row').forEach(r => r.addEventListener('click', () => window.openAddSheet(r.dataset.id, null, type)));
}

window.renderHistory = renderHistory;
})();

/* -------------------- ANALYTICS -------------------- */
(function () {
"use strict";
const K = window.K;
const { destroyChart, esc } = window.KanakkuRender;

function chartColors() {
  const styles = getComputedStyle(document.body);
  return {
    text: styles.getPropertyValue('--text-mid').trim() || '#C7C1B6',
    grid: styles.getPropertyValue('--line').trim() || 'rgba(255,255,255,0.08)',
    gold: '#E8A33D', teal: '#2DA8A0', bad: '#E8625D', good: '#4CAF7D',
  };
}

function renderAnalytics() {
  const root = document.getElementById('view-analytics');
  const mode = K.state.analyticsMode || 'recent';
  root.innerHTML = `
    <div class="range-tabs" id="modeTabs">
      <button data-mode="recent" class="${mode==='recent'?'active':''}">Recent</button>
      <button data-mode="monthly" class="${mode==='monthly'?'active':''}">Monthly</button>
      <button data-mode="yearly" class="${mode==='yearly'?'active':''}">Yearly</button>
    </div>
    <div id="analyticsBody"></div>
  `;
  document.getElementById('modeTabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    K.state.analyticsMode = b.dataset.mode; renderAnalytics();
  }));

  if (mode === 'monthly') renderMonthlyAnalytics();
  else if (mode === 'yearly') renderYearlyAnalytics();
  else renderRecentAnalytics();
}

function renderRecentAnalytics() {
  const body = document.getElementById('analyticsBody');
  const range = K.state.analyticsRange;
  body.innerHTML = `
    <div class="range-tabs" id="rangeTabs">
      <button data-range="7" class="${range===7?'active':''}">7D</button>
      <button data-range="30" class="${range===30?'active':''}">30D</button>
      <button data-range="90" class="${range===90?'active':''}">90D</button>
    </div>

    <div class="card">
      <div class="card-title">Daily Spending</div>
      <div class="chart-wrap"><canvas id="dailyBarChart"></canvas></div>
      <p style="font-size:12px;color:var(--text-low);margin:8px 0 0;">What you actually spent each day — not running total.</p>
    </div>

    <div class="card">
      <div class="card-title">Spending Trend & Projection</div>
      <div class="chart-wrap"><canvas id="trendChart"></canvas></div>
      <p style="font-size:12px;color:var(--text-low);margin:8px 0 0;">Dotted line projects month-end total from your trailing 7-day average.</p>
    </div>

    <div class="card">
      <div class="card-title">Category Breakdown</div>
      <div class="chart-wrap small"><canvas id="catChart"></canvas></div>
      <div class="legend-list" id="catLegend"></div>
    </div>

    <div class="card">
      <div class="card-title">Payment Mode Split</div>
      <div class="chart-wrap small"><canvas id="modeChart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Fixed vs Variable</div>
      <div id="fixedVarWrap"></div>
    </div>

    <div class="card">
      <div class="card-title">Top Merchants</div>
      <div id="topMerchantsWrap"></div>
    </div>
  `;

  document.getElementById('rangeTabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    K.state.analyticsRange = Number(b.dataset.range);
    renderRecentAnalytics();
  }));

  drawDailyBarChart(range);
  drawTrendChart(range);
  drawCategoryChart(range);
  drawModeChart(range);
  drawFixedVar(range);
  drawTopMerchants(range);
}

/* -------------------- MONTHLY VIEW -------------------- */
function renderMonthlyAnalytics() {
  const body = document.getElementById('analyticsBody');
  if (!K.state.selectedMonth) { const n = new Date(); K.state.selectedMonth = { year: n.getFullYear(), month: n.getMonth() }; }
  const { year, month } = K.state.selectedMonth;
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const isCurrentMonth = (new Date()).getFullYear() === year && (new Date()).getMonth() === month;
  const toForCalc = isCurrentMonth ? new Date() : to;

  const prevFrom = new Date(year, month - 1, 1);
  const prevTo = new Date(year, month, 0, 23, 59, 59, 999);

  const total = K.sumRange(from, toForCalc);
  const prevTotal = K.sumRange(prevFrom, prevTo);
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const totals = K.categoryTotals(from, toForCalc);
  const entries = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  const budgetTotal = Object.values(K.state.budgets).reduce((a,b)=>a+(b||0),0);
  const merchants = K.topMerchants(from, toForCalc, 5);
  const maxMerchant = merchants.length ? merchants[0][1] : 1;
  const { fixed, variable } = K.fixedVsVariable(from, toForCalc);
  const fvTotal = fixed + variable || 1;

  const monthIncome = K.state.income.filter(i => K.inRange(i.date, from, toForCalc)).reduce((s, i) => s + i.amount, 0);
  const monthSavings = K.state.savings.filter(sv => K.inRange(sv.date, from, toForCalc)).reduce((s, sv) => s + sv.amount, 0);
  const leftover = monthIncome - total - monthSavings;
  const savingsRate = monthIncome > 0 ? Math.round((monthSavings / monthIncome) * 100) : null;
  const savingsByType = Object.entries(K.state.savings.filter(sv => K.inRange(sv.date, from, toForCalc)).reduce((acc, sv) => { acc[sv.type] = (acc[sv.type]||0)+sv.amount; return acc; }, {})).sort((a,b)=>b[1]-a[1]);

  body.innerHTML = `
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;">
      <button class="icon-btn" id="prevMonthBtn">‹</button>
      <div style="text-align:center;">
        <p style="font-family:var(--font-display);font-size:18px;font-weight:600;margin:0;">${from.toLocaleDateString('en-IN',{month:'long', year:'numeric'})}</p>
        ${isCurrentMonth ? `<p style="font-size:11px;color:var(--text-low);margin:2px 0 0;">In progress</p>` : ''}
      </div>
      <button class="icon-btn" id="nextMonthBtn" ${isCurrentMonth ? 'style="opacity:0.3;pointer-events:none;"' : ''}>›</button>
    </div>

    ${monthIncome > 0 ? `
    <div class="card">
      <div class="card-title">Income, Spending & Savings</div>
      <div class="stat-row" style="grid-template-columns:repeat(2,1fr);">
        <div class="stat-pill"><div class="label">Income</div><div class="value" style="color:var(--good);">${K.fmtINR(monthIncome)}</div></div>
        <div class="stat-pill"><div class="label">Spent</div><div class="value" style="color:var(--bad);">${K.fmtINR(total)}</div></div>
        <div class="stat-pill"><div class="label">Saved</div><div class="value" style="color:var(--teal);">${K.fmtINR(monthSavings)}</div></div>
        <div class="stat-pill"><div class="label">Left Over</div><div class="value" style="color:${leftover<0?'var(--bad)':'var(--text-hi)'};">${K.fmtINR(leftover)}</div></div>
      </div>
      ${savingsRate !== null ? `<p style="font-size:12.5px;color:var(--text-low);margin:12px 2px 0;">Savings rate: <strong style="color:var(--text-hi);">${savingsRate}%</strong> of income this month.</p>` : ''}
    </div>` : ''}

    <div class="hero-card">
      <p class="hero-label">Total Spend</p>
      <p class="hero-amount"><sup>₹</sup>${total.toLocaleString('en-IN')}</p>
      ${delta !== null ? `<p class="hero-sub ${delta>0?'':''}" style="color:${delta>0?'var(--bad)':'var(--good)'}">${delta>0?'▲':'▼'} ${Math.abs(delta)}% vs ${prevFrom.toLocaleDateString('en-IN',{month:'short'})}</p>` : `<p class="hero-sub">No prior month to compare</p>`}
      ${budgetTotal > 0 ? `
      <div class="budget-bar-track" style="margin-top:14px;height:10px;"><div class="budget-bar-fill" style="width:${Math.min(100,(total/budgetTotal)*100)}%;background:${total>budgetTotal?'var(--bad)':'var(--good)'}"></div></div>
      <p style="font-size:12px;color:var(--text-low);margin:8px 0 0;">${K.fmtINR(total)} of ${K.fmtINR(budgetTotal)} total budget</p>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Category Breakdown</div>
      <div class="chart-wrap small"><canvas id="monthCatChart"></canvas></div>
      <div class="legend-list">
        ${entries.length ? entries.map(([id, amt]) => `
          <div class="legend-row">
            <span class="sw" style="background:${K.getCatColor(id)}"></span>
            <span class="nm">${K.getCatEmo(id)} ${K.getSubLabel(id)}</span>
            <span class="amt">${K.fmtINR(amt)}</span>
            <span class="pct">${Math.round((amt/(total||1))*100)}%</span>
          </div>`).join('') : `<p style="font-size:13px;color:var(--text-low);">No entries this month yet.</p>`}
      </div>
    </div>

    ${monthSavings > 0 ? `
    <div class="card">
      <div class="card-title">Savings Mix</div>
      <div class="chart-wrap small"><canvas id="monthSavingsChart"></canvas></div>
      <div class="legend-list">
        ${savingsByType.map(([id, amt]) => `
          <div class="legend-row">
            <span class="sw" style="background:${K.getSavingTypeColor(id)}"></span>
            <span class="nm">${K.getSavingTypeEmo(id)} ${K.getSavingTypeLabel(id)}</span>
            <span class="amt">${K.fmtINR(amt)}</span>
            <span class="pct">${Math.round((amt/monthSavings)*100)}%</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Fixed vs Variable</div>
      <div class="budget-bar-track" style="height:14px;display:flex;overflow:hidden;">
        <div style="width:${(fixed/fvTotal)*100}%;background:var(--teal);height:100%;"></div>
        <div style="width:${(variable/fvTotal)*100}%;background:var(--gold);height:100%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:13px;">
        <span>Fixed — ${K.fmtINR(fixed)}</span><span>Variable — ${K.fmtINR(variable)}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Top Merchants</div>
      ${merchants.length ? merchants.map(([name, amt]) => `
        <div style="margin-bottom:11px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
            <span style="color:var(--text-mid);">${esc(name)}</span><span style="font-family:var(--font-mono);font-weight:600;">${K.fmtINR(amt)}</span>
          </div>
          <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${(amt/maxMerchant)*100}%;background:var(--gold);"></div></div>
        </div>`).join('') : `<p style="font-size:13px;color:var(--text-low);">No merchant data this month.</p>`}
    </div>
  `;

  document.getElementById('prevMonthBtn').onclick = () => {
    let { year, month } = K.state.selectedMonth;
    month--; if (month < 0) { month = 11; year--; }
    K.state.selectedMonth = { year, month };
    renderMonthlyAnalytics();
  };
  document.getElementById('nextMonthBtn').onclick = () => {
    let { year, month } = K.state.selectedMonth;
    month++; if (month > 11) { month = 0; year++; }
    K.state.selectedMonth = { year, month };
    renderMonthlyAnalytics();
  };

  destroyChart('monthCat');
  const c = chartColors();
  const ctx = document.getElementById('monthCatChart').getContext('2d');
  window.KanakkuRender.charts.monthCat = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: entries.map(([id])=>K.getSubLabel(id)), datasets: [{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([id])=>K.getCatColor(id)), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
  });

  if (monthSavings > 0) {
    destroyChart('monthSavings');
    const ctx2 = document.getElementById('monthSavingsChart').getContext('2d');
    window.KanakkuRender.charts.monthSavings = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: savingsByType.map(([id])=>K.getSavingTypeLabel(id)), datasets: [{ data: savingsByType.map(([,v])=>v), backgroundColor: savingsByType.map(([id])=>K.getSavingTypeColor(id)), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
    });
  }
}

/* -------------------- YEARLY VIEW -------------------- */
function renderYearlyAnalytics() {
  const body = document.getElementById('analyticsBody');
  if (!K.state.selectedYear) K.state.selectedYear = new Date().getFullYear();
  const year = K.state.selectedYear;
  const isCurrentYear = year === new Date().getFullYear();
  const from = new Date(year, 0, 1);
  const to = isCurrentYear ? new Date() : new Date(year, 11, 31, 23, 59, 59, 999);

  const prevFrom = new Date(year - 1, 0, 1);
  const prevTo = new Date(year - 1, 11, 31, 23, 59, 59, 999);

  const total = K.sumRange(from, to);
  const prevTotal = K.sumRange(prevFrom, prevTo);
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const monthLabels = [], monthTotals = [], monthIncomeArr = [], monthSavingsArr = [];
  const lastMonth = isCurrentYear ? new Date().getMonth() : 11;
  for (let m = 0; m <= 11; m++) {
    const mFrom = new Date(year, m, 1); const mTo = new Date(year, m + 1, 0, 23, 59, 59, 999);
    monthLabels.push(mFrom.toLocaleDateString('en-IN', { month: 'short' }));
    monthTotals.push(m <= lastMonth ? K.sumRange(mFrom, mTo) : null);
    monthIncomeArr.push(m <= lastMonth ? K.state.income.filter(i => K.inRange(i.date, mFrom, mTo)).reduce((s,i)=>s+i.amount,0) : null);
    monthSavingsArr.push(m <= lastMonth ? K.state.savings.filter(sv => K.inRange(sv.date, mFrom, mTo)).reduce((s,sv)=>s+sv.amount,0) : null);
  }

  const totals = K.categoryTotals(from, to);
  const entries = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const avgMonthly = total / Math.max(1, lastMonth + 1);

  const yearIncome = monthIncomeArr.reduce((s,v)=>s+(v||0),0);
  const yearSavings = monthSavingsArr.reduce((s,v)=>s+(v||0),0);
  const yearLeftover = yearIncome - total - yearSavings;
  const yearSavingsRate = yearIncome > 0 ? Math.round((yearSavings/yearIncome)*100) : null;
  const savingsByType = Object.entries(K.state.savings.filter(sv => K.inRange(sv.date, from, to)).reduce((acc, sv) => { acc[sv.type] = (acc[sv.type]||0)+sv.amount; return acc; }, {})).sort((a,b)=>b[1]-a[1]);

  body.innerHTML = `
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;">
      <button class="icon-btn" id="prevYearBtn">‹</button>
      <p style="font-family:var(--font-display);font-size:18px;font-weight:600;margin:0;">${year}</p>
      <button class="icon-btn" id="nextYearBtn" ${isCurrentYear ? 'style="opacity:0.3;pointer-events:none;"' : ''}>›</button>
    </div>

    ${yearIncome > 0 ? `
    <div class="card">
      <div class="card-title">Income, Spending & Savings</div>
      <div class="stat-row" style="grid-template-columns:repeat(2,1fr);">
        <div class="stat-pill"><div class="label">Income</div><div class="value" style="color:var(--good);">${K.fmtINR(yearIncome)}</div></div>
        <div class="stat-pill"><div class="label">Spent</div><div class="value" style="color:var(--bad);">${K.fmtINR(total)}</div></div>
        <div class="stat-pill"><div class="label">Saved</div><div class="value" style="color:var(--teal);">${K.fmtINR(yearSavings)}</div></div>
        <div class="stat-pill"><div class="label">Left Over</div><div class="value" style="color:${yearLeftover<0?'var(--bad)':'var(--text-hi)'};">${K.fmtINR(yearLeftover)}</div></div>
      </div>
      ${yearSavingsRate !== null ? `<p style="font-size:12.5px;color:var(--text-low);margin:12px 2px 0;">Savings rate: <strong style="color:var(--text-hi);">${yearSavingsRate}%</strong> of income this year.</p>` : ''}
    </div>` : ''}

    <div class="hero-card">
      <p class="hero-label">Year Total Spend${isCurrentYear ? ' (so far)' : ''}</p>
      <p class="hero-amount"><sup>₹</sup>${total.toLocaleString('en-IN')}</p>
      ${delta !== null ? `<p class="hero-sub" style="color:${delta>0?'var(--bad)':'var(--good)'}">${delta>0?'▲':'▼'} ${Math.abs(delta)}% vs ${year-1}</p>` : `<p class="hero-sub">No prior year to compare</p>`}
      <div class="stat-row">
        <div class="stat-pill"><div class="label">Avg / Month</div><div class="value">${K.fmtINR(avgMonthly)}</div></div>
        <div class="stat-pill"><div class="label">Months Tracked</div><div class="value">${lastMonth+1}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Month by Month</div>
      <div class="chart-wrap"><canvas id="yearBarChart"></canvas></div>
      ${yearIncome > 0 ? `<p style="font-size:11.5px;color:var(--text-low);margin:8px 0 0;">Green = income, red = spend, teal = savings.</p>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Category Totals This Year</div>
      <div class="legend-list">
        ${entries.length ? entries.map(([id, amt]) => `
          <div class="legend-row">
            <span class="sw" style="background:${K.getCatColor(id)}"></span>
            <span class="nm">${K.getCatEmo(id)} ${K.getSubLabel(id)}</span>
            <span class="amt">${K.fmtINR(amt)}</span>
            <span class="pct">${Math.round((amt/(total||1))*100)}%</span>
          </div>`).join('') : `<p style="font-size:13px;color:var(--text-low);">No entries this year yet.</p>`}
      </div>
    </div>

    ${yearSavings > 0 ? `
    <div class="card">
      <div class="card-title">Savings Mix This Year</div>
      <div class="chart-wrap small"><canvas id="yearSavingsChart"></canvas></div>
      <div class="legend-list">
        ${savingsByType.map(([id, amt]) => `
          <div class="legend-row">
            <span class="sw" style="background:${K.getSavingTypeColor(id)}"></span>
            <span class="nm">${K.getSavingTypeEmo(id)} ${K.getSavingTypeLabel(id)}</span>
            <span class="amt">${K.fmtINR(amt)}</span>
            <span class="pct">${Math.round((amt/yearSavings)*100)}%</span>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;

  document.getElementById('prevYearBtn').onclick = () => { K.state.selectedYear--; renderYearlyAnalytics(); };
  document.getElementById('nextYearBtn').onclick = () => { K.state.selectedYear++; renderYearlyAnalytics(); };

  destroyChart('yearBar');
  const c = chartColors();
  const ctx = document.getElementById('yearBarChart').getContext('2d');
  const datasets = yearIncome > 0
    ? [
        { label: 'Income', data: monthIncomeArr, backgroundColor: '#4CAF7D', borderRadius: 5, barThickness: 10 },
        { label: 'Spend', data: monthTotals, backgroundColor: '#E8625D', borderRadius: 5, barThickness: 10 },
        { label: 'Saved', data: monthSavingsArr, backgroundColor: '#2DA8A0', borderRadius: 5, barThickness: 10 },
      ]
    : [{ data: monthTotals, backgroundColor: c.gold, borderRadius: 6, barThickness: 18 }];
  window.KanakkuRender.charts.yearBar = new Chart(ctx, {
    type: 'bar',
    data: { labels: monthLabels, datasets },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: yearIncome > 0, position: 'bottom', labels: { color: c.text, boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx)=> (ctx.dataset.label ? ctx.dataset.label+': ' : '') + '₹'+(ctx.parsed.y||0).toLocaleString('en-IN') } } },
      scales: { x: { ticks: { color: c.text, font:{size:10} }, grid: { display:false } },
                y: { ticks: { color: c.text, font:{size:10}, callback: v=>'₹'+v.toLocaleString('en-IN') }, grid: { color: c.grid } } } }
  });

  if (yearSavings > 0) {
    destroyChart('yearSavings');
    const ctx2 = document.getElementById('yearSavingsChart').getContext('2d');
    window.KanakkuRender.charts.yearSavings = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: savingsByType.map(([id])=>K.getSavingTypeLabel(id)), datasets: [{ data: savingsByType.map(([,v])=>v), backgroundColor: savingsByType.map(([id])=>K.getSavingTypeColor(id)), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
    });
  }
}

function drawDailyBarChart(rangeDays) {
  const c = chartColors();
  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const labels = [], data = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);
    labels.push(rangeDays > 31 ? d.toLocaleDateString('en-IN', { day: 'numeric' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    data.push(K.state.expenses.filter(e => e.date === dStr).reduce((s, e) => s + e.amount, 0));
  }
  destroyChart('dailyBar');
  const ctx = document.getElementById('dailyBarChart').getContext('2d');
  window.KanakkuRender.charts.dailyBar = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: '#E8A33D', borderRadius: 4, barPercentage: rangeDays > 45 ? 1.0 : 0.7 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => '₹' + ctx.parsed.y.toLocaleString('en-IN') } } },
      scales: {
        x: { ticks: { color: c.text, font: { size: 9 }, maxTicksLimit: rangeDays > 31 ? 10 : rangeDays, autoSkip: true }, grid: { display: false } },
        y: { ticks: { color: c.text, font: { size: 10 }, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
      }
    }
  });
}

function drawTrendChart(rangeDays) {
  const c = chartColors();
  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const labels = [], actual = [], projectedLine = [];
  const proj = K.monthlyProjection();
  const dailyAvg = proj.avgDaily7 || (proj.spentSoFar / Math.max(1, proj.dayOfMonth));

  let cumulative = 0;
  const dayCount = rangeDays;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
    const dayTotal = K.state.expenses.filter(e => e.date === d.toISOString().slice(0,10)).reduce((s,e)=>s+e.amount,0);
    cumulative += dayTotal;
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    actual.push(cumulative);
  }
  // simple forward projection appended for the current month view (only meaningful on 30D)
  const projectedFull = actual.map((v, i) => i === actual.length - 1 ? proj.projected : null);

  destroyChart('trend');
  const ctx = document.getElementById('trendChart').getContext('2d');
  window.KanakkuRender.charts.trend = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Cumulative spend', data: actual, borderColor: c.gold, backgroundColor: 'rgba(232,163,61,0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 },
      { label: 'Projected month-end', data: projectedFull, borderColor: c.teal, borderDash: [5,4], pointRadius: rangeDays===30?4:0, pointBackgroundColor: c.teal, showLine: false, tension: 0 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { color: c.text, maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: c.text, font: { size: 10 }, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
      }
    }
  });
}

function drawCategoryChart(rangeDays) {
  const c = chartColors();
  const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const totals = K.categoryTotals(from, now);
  const entries = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  const total = entries.reduce((s,[,v]) => s+v, 0) || 1;

  destroyChart('cat');
  const ctx = document.getElementById('catChart').getContext('2d');
  window.KanakkuRender.charts.cat = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: entries.map(([id])=>K.getSubLabel(id)), datasets: [{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([id])=>K.getCatColor(id)), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
  });

  document.getElementById('catLegend').innerHTML = entries.slice(0, 8).map(([id, amt]) => `
    <div class="legend-row">
      <span class="sw" style="background:${K.getCatColor(id)}"></span>
      <span class="nm">${K.getCatEmo(id)} ${K.getSubLabel(id)}</span>
      <span class="amt">${K.fmtINR(amt)}</span>
      <span class="pct">${Math.round((amt/total)*100)}%</span>
    </div>`).join('') || '<p style="font-size:13px;color:var(--text-low);">No data in this range yet.</p>';
}

function drawModeChart(rangeDays) {
  const c = chartColors();
  const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const split = K.paymentModeSplit(from, now);
  const modes = K.PAYMENT_MODES.filter(m => split[m.id]);
  destroyChart('mode');
  const ctx = document.getElementById('modeChart').getContext('2d');
  const palette = { upi: '#2DA8A0', cash: '#E8A33D', debitcard: '#5B8DEF', creditcard: '#E8625D', autodebit: '#C77DD2' };
  window.KanakkuRender.charts.mode = new Chart(ctx, {
    type: 'bar',
    data: { labels: modes.map(m=>m.label), datasets: [{ data: modes.map(m=>split[m.id]), backgroundColor: modes.map(m=>palette[m.id]), borderRadius: 8, barThickness: 34 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx)=> '₹'+ctx.parsed.x.toLocaleString('en-IN') } } },
      scales: { x: { ticks: { color: c.text, font:{size:10} }, grid: { color: c.grid } }, y: { ticks: { color: c.text, font:{size:12} }, grid: { display:false } } } }
  });
}

function drawFixedVar(rangeDays) {
  const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const { fixed, variable } = K.fixedVsVariable(from, now);
  const total = fixed + variable || 1;
  document.getElementById('fixedVarWrap').innerHTML = `
    <div class="budget-bar-track" style="height:14px;display:flex;overflow:hidden;">
      <div style="width:${(fixed/total)*100}%;background:var(--teal);height:100%;"></div>
      <div style="width:${(variable/total)*100}%;background:var(--gold);height:100%;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:13px;">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--teal);margin-right:6px;"></span>Fixed — ${K.fmtINR(fixed)}</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--gold);margin-right:6px;"></span>Variable — ${K.fmtINR(variable)}</span>
    </div>`;
}

function drawTopMerchants(rangeDays) {
  const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - (rangeDays - 1)); from.setHours(0,0,0,0);
  const merchants = K.topMerchants(from, now, 6);
  const max = merchants.length ? merchants[0][1] : 1;
  document.getElementById('topMerchantsWrap').innerHTML = merchants.length ? merchants.map(([name, amt]) => `
    <div style="margin-bottom:11px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:var(--text-mid);">${esc(name)}</span><span style="font-family:var(--font-mono);font-weight:600;">${K.fmtINR(amt)}</span>
      </div>
      <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${(amt/max)*100}%;background:var(--gold);"></div></div>
    </div>`).join('') : '<p style="font-size:13px;color:var(--text-low);">No merchant data in this range yet.</p>';
}

window.renderAnalytics = renderAnalytics;
})();

/* -------------------- BUDGETS -------------------- */
(function () {
"use strict";
const K = window.K;
const { emptyStateHTML } = window.KanakkuRender;

function renderBudgets() {
  const root = document.getElementById('view-budgets');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totals = K.categoryTotals(monthStart, now);
  const dim = K.daysInMonth(now);
  const paceExpected = now.getDate() / dim;

  const totalBudget = Object.values(K.state.budgets).reduce((a,b)=>a+(b||0),0);
  const totalSpent = Object.entries(K.state.budgets).reduce((s,[id])=>s+(totals[id]||0),0);

  root.innerHTML = `
    <p class="section-title">Monthly Budgets</p>
    ${totalBudget > 0 ? `
    <div class="card">
      <div class="card-title">Overall</div>
      <div class="budget-row" style="margin-bottom:0;">
        <div class="budget-head"><span class="nm">All budgeted categories</span><span class="nums">${K.fmtINR(totalSpent)} / ${K.fmtINR(totalBudget)}</span></div>
        <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${Math.min(100,(totalSpent/totalBudget)*100)}%;background:${totalSpent>totalBudget?'var(--bad)':'var(--good)'}"></div></div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Set Budgets by Category</div>
      ${K.CATEGORIES.flatMap(c => c.subs).map(sub => {
        const budget = K.state.budgets[sub.id] || 0;
        const spent = totals[sub.id] || 0;
        const pace = budget > 0 ? spent / budget : 0;
        const over = budget > 0 && pace > paceExpected + 0.15;
        const barColor = budget === 0 ? 'var(--line-strong)' : over ? 'var(--bad)' : pace > paceExpected ? 'var(--gold)' : 'var(--good)';
        return `
        <div class="budget-row">
          <div class="budget-head">
            <span class="nm">${K.getCatEmo(sub.id)} ${sub.label}</span>
            <span class="nums">${budget > 0 ? K.fmtINR(spent) + ' / ' : (spent>0? K.fmtINR(spent)+' spent · ':'')}<button class="link" data-set-budget="${sub.id}" style="font-family:var(--font-body);">${budget > 0 ? K.fmtINR(budget) : 'Set budget'}</button></span>
          </div>
          <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${budget>0?Math.min(100,(spent/budget)*100):0}%;background:${barColor}"></div></div>
          ${over ? `<p style="font-size:11.5px;color:var(--bad);margin:5px 0 0;">On track to overspend — ${Math.round(pace*100)}% used, ${Math.round(paceExpected*100)}% of month gone</p>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;

  root.querySelectorAll('[data-set-budget]').forEach(b => b.addEventListener('click', () => promptBudget(b.dataset.setBudget)));
}

function promptBudget(subId) {
  const current = K.state.budgets[subId] || '';
  const val = prompt(`Monthly budget for ${K.getSubLabel(subId)} (₹)`, current || '');
  if (val === null) return;
  const num = Number(val.replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num < 0) return;
  K.state.budgets[subId] = num;
  K.setBudget(subId, num).then(() => { renderBudgets(); if (K.state.view==='home') window.renderHome(); });
}

window.renderBudgets = renderBudgets;
})();

/* ============================================================
   6. ADD / EDIT EXPENSE SHEET
   ============================================================ */
(function () {
"use strict";
const K = window.K;
const { esc, toast } = window.KanakkuRender;

let draft = null; // working copy of the entry being added/edited

function freshDraft(type, prefill) {
  type = type || 'expense';
  if (type === 'income') {
    return { type: 'income', id: null, amount: '', date: K.todayISO(), source: 'salary', note: '' };
  }
  if (type === 'saving') {
    return { type: 'saving', id: null, amount: '', date: K.todayISO(), savingType: 'mutual_fund', note: '' };
  }
  return {
    type: 'expense', id: null, amount: prefill && prefill.amount ? String(prefill.amount) : '',
    date: K.todayISO(), subId: (prefill && prefill.subId) || null,
    merchant: (prefill && prefill.merchant) || '', note: '', tags: [],
    paymentMode: 'upi', recurring: false, location: '',
  };
}

function storeForType(type) {
  if (type === 'income') return K.state.income;
  if (type === 'saving') return K.state.savings;
  return K.state.expenses;
}

function openAddSheet(editId, prefill, editType) {
  const overlay = document.getElementById('addOverlay');
  const sheet = document.getElementById('addSheet');
  const type = editId ? (editType || 'expense') : ((prefill && prefill.type) || editType || 'expense');

  if (editId) {
    const existing = storeForType(type).find(e => e.id === editId);
    draft = Object.assign({ type }, existing, existing && existing.tags ? { tags: [...existing.tags] } : {});
  } else {
    draft = freshDraft(type, prefill);
  }
  K.state.editingId = editId || null;
  K.state.editingType = type;

  renderAddSheet();
  overlay.classList.add('show');
  sheet.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const inp = document.getElementById('amountField'); if (inp) inp.focus(); }, 280);
}

function closeAddSheet() {
  document.getElementById('addOverlay').classList.remove('show');
  document.getElementById('addSheet').classList.remove('show');
  document.body.style.overflow = '';
  draft = null; K.state.editingId = null;
}

function renderAddSheet() {
  const sheet = document.getElementById('addSheet');
  const isEdit = !!K.state.editingId;
  const titleWord = draft.type === 'income' ? 'Income' : draft.type === 'saving' ? 'Saving' : 'Expense';

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <h2>${isEdit ? 'Edit ' + titleWord : 'Add ' + titleWord}</h2>
      <button class="icon-btn" id="closeAddBtn" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    ${!isEdit ? `
    <div class="range-tabs" id="entryTypeTabs" style="margin-bottom:16px;">
      <button data-type="expense" class="${draft.type==='expense'?'active':''}">💸 Expense</button>
      <button data-type="income" class="${draft.type==='income'?'active':''}">💰 Income</button>
      <button data-type="saving" class="${draft.type==='saving'?'active':''}">📈 Saving</button>
    </div>` : ''}

    <div class="amount-input-wrap">
      <span class="rupee">₹</span>
      <input id="amountField" type="number" inputmode="decimal" placeholder="0" value="${draft.amount}" />
    </div>

    <div id="typeSpecificFields"></div>

    <button class="btn-primary" id="saveExpenseBtn" style="margin-top:6px;">${isEdit ? 'Save Changes' : 'Save ' + titleWord}</button>
    ${isEdit ? `<button class="btn-ghost btn-danger" id="deleteExpenseBtn" style="margin-top:10px;">Delete ${titleWord}</button>` : ''}
  `;

  if (draft.type === 'income') renderIncomeFields();
  else if (draft.type === 'saving') renderSavingFields();
  else renderExpenseFields();

  wireCommonEvents();
}

function yesterdayISO() { const y = new Date(); y.setDate(y.getDate()-1); return y.toISOString().slice(0,10); }

function dateFieldHTML() {
  return `
    <div class="field" style="margin-top:16px;">
      <label>Date</label>
      <div class="chip-row">
        <button class="chip ${draft.date === K.todayISO() ? 'selected' : ''}" data-date="today">Today</button>
        <button class="chip ${draft.date === yesterdayISO() ? 'selected' : ''}" data-date="yesterday">Yesterday</button>
        <input type="date" id="dateField" class="text-input" style="width:auto;flex:1;min-width:120px;padding:9px 10px;" value="${draft.date}" max="${K.todayISO()}" />
      </div>
    </div>`;
}

/* -------------------- EXPENSE fields -------------------- */
function renderExpenseFields() {
  const wrap = document.getElementById('typeSpecificFields');
  const isEdit = !!K.state.editingId;
  const recentMerchants = [...new Set(K.state.expenses.map(e => e.merchant).filter(Boolean))].slice(0, 8);
  const suggestedTags = K.recentTags(10);
  const subTags = draft.subId ? (K.getSub(draft.subId).sub.tags || []) : [];
  const allTags = [...new Set([...subTags, ...suggestedTags])].slice(0, 10);
  const suggestedSub = (!isEdit && draft.subId === null) ? K.suggestSubFromText(draft.merchant) : null;
  const unusual = draft.amount && draft.subId ? K.isUnusual(Number(draft.amount), draft.subId) : null;

  wrap.innerHTML = `
    ${unusual ? `<div class="unusual-banner" style="margin-top:12px;">⚠️ <span>This is higher than your usual ${K.fmtINR(unusual.mean)} for ${K.getSubLabel(draft.subId)}. Worth a note?</span></div>` : ''}
    ${dateFieldHTML()}
    <div class="field">
      <label>Category</label>
      ${suggestedSub ? `<div class="suggest-banner">✨ <span>Looks like <strong>${K.getSubLabel(suggestedSub)}</strong> — apply?</span> <button class="tag-apply" id="applySuggestBtn">Apply</button></div>` : ''}
      <div class="cat-grid" id="catGrid">
        ${K.CATEGORIES.flatMap(c => c.subs.map(s => ({ ...s, catEmo: c.emo, catColor: c.color }))).map(s => `
          <button class="cat-tile ${draft.subId === s.id ? 'selected' : ''}" data-sub="${s.id}">
            <span class="emo">${s.catEmo}</span><span>${s.label}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>Merchant / Payee</label>
      <input id="merchantField" class="text-input" type="text" placeholder="e.g. Swiggy, Aavin, Auto" value="${esc(draft.merchant)}" list="merchantList" />
      <datalist id="merchantList">${recentMerchants.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
      ${recentMerchants.length ? `<div class="scroll-row" style="margin-top:9px;">${recentMerchants.slice(0,6).map(m => `<button class="chip" data-merchant-chip="${esc(m)}">${esc(m)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="field">
      <label>Note</label>
      <textarea id="noteField" class="text-input" placeholder="Optional note…">${esc(draft.note)}</textarea>
    </div>
    <div class="field">
      <label>Tags</label>
      <div class="chip-row" id="tagChipRow">
        ${draft.tags.map(t => `<button class="chip selected" data-remove-tag="${esc(t)}">${esc(t)} <span class="x">×</span></button>`).join('')}
      </div>
      ${allTags.filter(t => !draft.tags.includes(t)).length ? `<div class="scroll-row" style="margin-top:9px;">${allTags.filter(t => !draft.tags.includes(t)).map(t => `<button class="chip" data-add-tag="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>` : ''}
      <input id="customTagField" class="text-input" style="margin-top:9px;" type="text" placeholder="Type a custom tag and press Enter" />
    </div>
    <div class="field">
      <label>Payment Mode</label>
      <div class="mode-row" id="modeRow">
        ${K.PAYMENT_MODES.map(m => `<button class="mode-btn ${draft.paymentMode === m.id ? 'selected' : ''}" data-mode="${m.id}"><span style="font-size:17px;">${m.icon}</span>${m.label}</button>`).join('')}
      </div>
    </div>
    <div class="field toggle-row">
      <div>
        <label style="margin-bottom:2px;">Recurring expense</label>
        <p style="font-size:12px;color:var(--text-low);margin:0;">Rent, EMI, subscriptions, etc.</p>
      </div>
      <button class="switch ${draft.recurring ? 'on' : ''}" id="recurringToggle"></button>
    </div>
    <div class="field">
      <label>Location <span style="opacity:0.6;font-weight:400;text-transform:none;">(optional)</span></label>
      <div style="display:flex;gap:8px;">
        <input id="locationField" class="text-input" type="text" placeholder="e.g. Coimbatore" value="${esc(draft.location||'')}" />
        <button class="icon-btn" id="useLocationBtn" style="width:48px;height:48px;flex-shrink:0;" aria-label="Use current location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        </button>
      </div>
    </div>
  `;

  sheet_wireExpenseFields();
}

/* -------------------- INCOME fields -------------------- */
function renderIncomeFields() {
  const wrap = document.getElementById('typeSpecificFields');
  wrap.innerHTML = `
    ${dateFieldHTML()}
    <div class="field">
      <label>Source</label>
      <div class="cat-grid" id="sourceGrid">
        ${K.INCOME_SOURCES.map(s => `
          <button class="cat-tile ${draft.source === s.id ? 'selected' : ''}" data-source="${s.id}">
            <span class="emo">${s.emo}</span><span>${s.label}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>Note <span style="opacity:0.6;font-weight:400;text-transform:none;">(optional)</span></label>
      <textarea id="noteField" class="text-input" placeholder="e.g. July salary, bonus, etc.">${esc(draft.note || '')}</textarea>
    </div>
  `;
  document.getElementById('addSheet').querySelectorAll('[data-source]').forEach(b => b.onclick = () => { draft.source = b.dataset.source; renderAddSheet(); });
  const noteEl = document.getElementById('noteField');
  if (noteEl) noteEl.oninput = (e) => { draft.note = e.target.value; };
}

/* -------------------- SAVING fields -------------------- */
function renderSavingFields() {
  const wrap = document.getElementById('typeSpecificFields');
  wrap.innerHTML = `
    ${dateFieldHTML()}
    <div class="field">
      <label>Where is this going?</label>
      <div class="cat-grid" id="savingTypeGrid">
        ${K.SAVING_TYPES.map(s => `
          <button class="cat-tile ${draft.savingType === s.id ? 'selected' : ''}" data-savingtype="${s.id}">
            <span class="emo">${s.emo}</span><span>${s.label}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>Note <span style="opacity:0.6;font-weight:400;text-transform:none;">(optional)</span></label>
      <textarea id="noteField" class="text-input" placeholder="e.g. SIP — Parag Parikh Flexi Cap">${esc(draft.note || '')}</textarea>
    </div>
  `;
  document.getElementById('addSheet').querySelectorAll('[data-savingtype]').forEach(b => b.onclick = () => { draft.savingType = b.dataset.savingtype; renderAddSheet(); });
  const noteEl = document.getElementById('noteField');
  if (noteEl) noteEl.oninput = (e) => { draft.note = e.target.value; };
}

/* -------------------- shared wiring -------------------- */
function wireCommonEvents() {
  const sheet = document.getElementById('addSheet');
  document.getElementById('closeAddBtn').onclick = closeAddSheet;

  const amountEl = document.getElementById('amountField');
  amountEl.oninput = () => { draft.amount = amountEl.value; };

  const typeTabs = document.getElementById('entryTypeTabs');
  if (typeTabs) typeTabs.querySelectorAll('button').forEach(b => b.onclick = () => {
    const amt = draft.amount; // preserve amount typed so far across type switches
    draft = freshDraft(b.dataset.type);
    draft.amount = amt;
    renderAddSheet();
  });

  sheet.querySelectorAll('[data-date]').forEach(b => b.onclick = () => {
    draft.date = b.dataset.date === 'today' ? K.todayISO() : yesterdayISO();
    renderAddSheet();
  });
  const dateEl = document.getElementById('dateField');
  if (dateEl) dateEl.onchange = (e) => { draft.date = e.target.value; renderAddSheet(); };

  document.getElementById('saveExpenseBtn').onclick = saveDraft;
  const delBtn = document.getElementById('deleteExpenseBtn');
  if (delBtn) delBtn.onclick = () => {
    const id = draft.id, type = draft.type;
    closeAddSheet();
    window.handleDeleteEntry(id, type);
  };
}

function sheet_wireExpenseFields() {
  const sheet = document.getElementById('addSheet');
  sheet.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { draft.subId = b.dataset.sub; renderAddSheet(); });
  const suggestBtn = document.getElementById('applySuggestBtn');
  if (suggestBtn) suggestBtn.onclick = () => { draft.subId = K.suggestSubFromText(draft.merchant); renderAddSheet(); };

  const merchantEl = document.getElementById('merchantField');
  merchantEl.oninput = () => { draft.merchant = merchantEl.value; };
  merchantEl.onblur = () => { if (!draft.subId) { const s = K.suggestSubFromText(draft.merchant); if (s) { draft.subId = s; renderAddSheet(); } } };
  sheet.querySelectorAll('[data-merchant-chip]').forEach(b => b.onclick = () => { draft.merchant = b.dataset.merchantChip; if(!draft.subId){const s=K.suggestSubFromText(draft.merchant); if(s) draft.subId=s;} renderAddSheet(); });

  const noteEl = document.getElementById('noteField');
  if (noteEl) noteEl.oninput = (e) => { draft.note = e.target.value; };

  sheet.querySelectorAll('[data-add-tag]').forEach(b => b.onclick = () => { draft.tags.push(b.dataset.addTag); renderAddSheet(); });
  sheet.querySelectorAll('[data-remove-tag]').forEach(b => b.onclick = () => { draft.tags = draft.tags.filter(t => t !== b.dataset.removeTag); renderAddSheet(); });
  const customTagEl = document.getElementById('customTagField');
  if (customTagEl) customTagEl.onkeydown = (e) => {
    if (e.key === 'Enter' && customTagEl.value.trim()) {
      e.preventDefault();
      const v = customTagEl.value.trim();
      if (!draft.tags.includes(v)) draft.tags.push(v);
      renderAddSheet();
    }
  };

  sheet.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { draft.paymentMode = b.dataset.mode; renderAddSheet(); });
  const recurringEl = document.getElementById('recurringToggle');
  if (recurringEl) recurringEl.onclick = (e) => { draft.recurring = !draft.recurring; e.target.classList.toggle('on'); };

  const locationEl = document.getElementById('locationField');
  if (locationEl) locationEl.oninput = (e) => { draft.location = e.target.value; };
  const useLocBtn = document.getElementById('useLocationBtn');
  if (useLocBtn) useLocBtn.onclick = () => {
    if (!navigator.geolocation) { toast('Location not available on this device'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      draft.location = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
      renderAddSheet();
    }, () => toast('Could not get location — check permissions'));
  };
}

function saveDraft() {
  const amount = Number(String(draft.amount).replace(/[^0-9.]/g, ''));
  if (!amount || amount <= 0) { toast('Enter an amount to continue'); document.getElementById('amountField').focus(); return; }

  if (draft.type === 'income') {
    const entry = {
      id: draft.id || K.uid(), amount, date: draft.date, source: draft.source || 'other_income',
      note: (draft.note || '').trim(), createdAt: draft.createdAt || Date.now(), updatedAt: Date.now(),
    };
    K.addIncome(entry).then(() => {
      const idx = K.state.income.findIndex(e => e.id === entry.id);
      if (idx >= 0) K.state.income[idx] = entry; else K.state.income.push(entry);
      closeAddSheet(); toast('Income saved'); window.refreshCurrentView();
    });
    return;
  }

  if (draft.type === 'saving') {
    const entry = {
      id: draft.id || K.uid(), amount, date: draft.date, type: draft.savingType || 'other_saving',
      note: (draft.note || '').trim(), createdAt: draft.createdAt || Date.now(), updatedAt: Date.now(),
    };
    K.addSaving(entry).then(() => {
      const idx = K.state.savings.findIndex(e => e.id === entry.id);
      if (idx >= 0) K.state.savings[idx] = entry; else K.state.savings.push(entry);
      closeAddSheet(); toast('Saving logged'); window.refreshCurrentView();
    });
    return;
  }

  if (!draft.subId) { toast('Pick a category to continue'); return; }
  const entry = {
    id: draft.id || K.uid(),
    amount, date: draft.date, subId: draft.subId,
    merchant: draft.merchant.trim(), note: draft.note.trim(), tags: draft.tags,
    paymentMode: draft.paymentMode, recurring: !!draft.recurring, location: draft.location || '',
    createdAt: draft.createdAt || Date.now(), updatedAt: Date.now(),
  };
  K.addExpense(entry).then(() => {
    const idx = K.state.expenses.findIndex(e => e.id === entry.id);
    if (idx >= 0) K.state.expenses[idx] = entry; else K.state.expenses.push(entry);
    closeAddSheet(); toast('Expense saved'); window.refreshCurrentView();
  });
}

window.openAddSheet = openAddSheet;
window.closeAddSheet = closeAddSheet;
})();

/* ============================================================
   7. DELETE HANDLER (with undo)
   ============================================================ */
(function () {
"use strict";
const K = window.K;
const { toast } = window.KanakkuRender;

function handleDelete(id) { handleDeleteEntry(id, 'expense'); }

function handleDeleteEntry(id, type) {
  if (!id) return;
  const cfg = {
    expense: { list: 'expenses', del: K.deleteExpense, add: K.addExpense, label: 'Expense' },
    income: { list: 'income', del: K.deleteIncome, add: K.addIncome, label: 'Income' },
    saving: { list: 'savings', del: K.deleteSaving, add: K.addSaving, label: 'Saving' },
  }[type || 'expense'];
  if (!cfg) return;

  const entry = K.state[cfg.list].find(e => e.id === id);
  if (!entry) return;
  K.state[cfg.list] = K.state[cfg.list].filter(e => e.id !== id);
  cfg.del(id).then(() => window.refreshCurrentView());
  toast(cfg.label + ' deleted', 'Undo', () => {
    K.state[cfg.list].push(entry);
    cfg.add(entry).then(() => window.refreshCurrentView());
  });
}
window.handleDelete = handleDelete;
window.handleDeleteEntry = handleDeleteEntry;
})();

/* ============================================================
   8. SETTINGS SHEET
   ============================================================ */
(function () {
"use strict";
const K = window.K;
const { toast } = window.KanakkuRender;

function openSettingsSheet() {
  renderSettingsSheet();
  document.getElementById('settingsOverlay').classList.add('show');
  document.getElementById('settingsSheet').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSettingsSheet() {
  document.getElementById('settingsOverlay').classList.remove('show');
  document.getElementById('settingsSheet').classList.remove('show');
  document.body.style.overflow = '';
}

function renderSettingsSheet() {
  const sheet = document.getElementById('settingsSheet');
  const isDark = K.state.theme === 'dark';
  const totalEntries = K.state.expenses.length + K.state.income.length + K.state.savings.length;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const connected = !!K.sync.gasUrl;
  const statusLabel = !connected ? 'Not connected' : K.sync.status === 'syncing' ? 'Syncing…' : K.sync.status === 'error' ? 'Sync error — will retry' : 'Connected';
  const statusIcon = !connected ? '⚪' : K.sync.status === 'syncing' ? '🔄' : K.sync.status === 'error' ? '⚠️' : '🟢';
  const lastSyncLabel = K.sync.lastSyncedAt ? new Date(K.sync.lastSyncedAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }) : 'Never';

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>Settings</h2>
      <button class="icon-btn" id="closeSettingsBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>

    ${!isStandalone ? `
    <div class="install-banner">
      <span>📲</span>
      <div><strong>Install Kanakku</strong><br>On iPhone: tap Share <strong>⬆️</strong> in Safari → "Add to Home Screen" for a full-screen, app-like experience.</div>
    </div>` : ''}

    <div class="settings-group">
      <p class="settings-group-title">Google Sheets</p>
      <div class="settings-row">
        <div class="ic">${statusIcon}</div>
        <div class="txt"><div class="t1">${statusLabel}</div><div class="t2">${connected ? `Last synced: ${lastSyncLabel} · ${K.sync.pendingCount} pending` : 'Connect your Sheet to back up and view your data there'}</div></div>
      </div>
      <div class="field" style="margin-top:10px;">
        <label>Apps Script Web App URL</label>
        <input id="gasUrlField" class="text-input" type="text" placeholder="https://script.google.com/macros/s/.../exec" value="${K.sync.gasUrl || ''}" />
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-primary" id="testGasBtn" style="margin-top:0;">${connected ? 'Update & Re-test' : 'Test & Save'}</button>
        ${connected ? `<button class="btn-ghost" id="syncNowBtn" style="margin-top:0;width:auto;padding:14px 18px;">Sync Now</button>` : ''}
      </div>
      <p style="font-size:11.5px;color:var(--text-low);margin:10px 2px 0;">Don't have this yet? See SETUP-INSTRUCTIONS.md for the 5-minute one-time setup.</p>
    </div>

    <div class="settings-group">
      <p class="settings-group-title">Appearance</p>
      <div class="settings-row">
        <div class="ic">${isDark ? '🌙' : '☀️'}</div>
        <div class="txt"><div class="t1">Dark mode</div><div class="t2">${isDark ? 'On — easier on the eyes at night' : 'Off — bright theme'}</div></div>
        <button class="switch ${isDark ? 'on' : ''}" id="themeToggle"></button>
      </div>
    </div>

    <div class="settings-group">
      <p class="settings-group-title">Local Backup</p>
      <div class="settings-row" id="exportJsonRow" style="cursor:pointer;">
        <div class="ic">⬇️</div>
        <div class="txt"><div class="t1">Export backup (JSON)</div><div class="t2">Full data, restorable in this app</div></div>
        <span class="chev">›</span>
      </div>
      <div class="settings-row" id="exportCsvRow" style="cursor:pointer;">
        <div class="ic">📄</div>
        <div class="txt"><div class="t1">Export as CSV</div><div class="t2">Open in Excel or Google Sheets</div></div>
        <span class="chev">›</span>
      </div>
      <div class="settings-row" id="importRow" style="cursor:pointer;">
        <div class="ic">⬆️</div>
        <div class="txt"><div class="t1">Import backup</div><div class="t2">Restore from a JSON export</div></div>
        <span class="chev">›</span>
      </div>
      <input type="file" id="importFileInput" accept="application/json" style="display:none;" />
    </div>

    <div class="settings-group">
      <p class="settings-group-title">About Your Data</p>
      <div class="settings-row">
        <div class="ic">📦</div>
        <div class="txt"><div class="t1">${totalEntries} entries stored</div><div class="t2">${connected ? 'Synced to your Google Sheet, with a fast local copy on this device' : 'Kept on this device only until you connect a Sheet above'}</div></div>
      </div>
    </div>

    <div class="settings-group">
      <p class="settings-group-title">Danger Zone</p>
      <div class="settings-row" id="resetRow" style="cursor:pointer;">
        <div class="ic">🗑️</div>
        <div class="txt"><div class="t1" style="color:var(--bad);">Erase all data</div><div class="t2">Deletes every expense and budget on this device${connected ? ' and your Sheet' : ''}</div></div>
      </div>
    </div>

    <div class="settings-group">
      <p class="settings-group-title">About</p>
      <div class="settings-row"><div class="ic">🪔</div><div class="txt"><div class="t1">Kanakku</div><div class="t2">v2.0 · Google Sheets edition · Built for daily use</div></div></div>
    </div>
  `;

  document.getElementById('closeSettingsBtn').onclick = closeSettingsSheet;
  document.getElementById('themeToggle').onclick = (e) => {
    K.state.theme = K.state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); K.setKV('theme', K.state.theme);
    e.target.classList.toggle('on');
  };
  document.getElementById('exportJsonRow').onclick = exportJSON;
  document.getElementById('exportCsvRow').onclick = exportCSV;
  document.getElementById('importRow').onclick = () => document.getElementById('importFileInput').click();
  document.getElementById('importFileInput').onchange = handleImport;
  document.getElementById('resetRow').onclick = handleReset;

  document.getElementById('testGasBtn').onclick = () => {
    const url = document.getElementById('gasUrlField').value.trim();
    if (!url) { toast('Paste your Apps Script URL first'); return; }
    const btn = document.getElementById('testGasBtn');
    btn.textContent = 'Testing…';
    K.testConnection(url).then(() => {
      K.sync.gasUrl = url; K.setKV('gasUrl', url);
      toast('Connected to Google Sheets');
      renderSettingsSheet();
      window.reconcileAfterConnect();
    }).catch(() => {
      toast('Could not connect — check the URL and deployment access');
      btn.textContent = 'Test & Save';
    });
  };
  const syncBtn = document.getElementById('syncNowBtn');
  if (syncBtn) syncBtn.onclick = () => { toast('Syncing…'); window.reconcileAfterConnect().then(() => renderSettingsSheet()); };
}

function applyTheme() { document.body.classList.toggle('light', K.state.theme === 'light'); }

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportJSON() {
  const payload = {
    expenses: K.state.expenses, budgets: K.state.budgets, income: K.state.income, savings: K.state.savings,
    exportedAt: new Date().toISOString(), app: 'kanakku', version: 2,
  };
  downloadFile(JSON.stringify(payload, null, 2), `kanakku-backup-${K.todayISO()}.json`, 'application/json');
  toast('Backup downloaded');
}

function exportCSV() {
  const header = ['Date','Amount','Category','Subcategory','Merchant','Note','Tags','Payment Mode','Recurring','Location'];
  const rows = K.state.expenses.map(e => [
    e.date, e.amount, K.getCatLabel(e.subId), K.getSubLabel(e.subId), e.merchant, (e.note||'').replace(/\n/g,' '),
    (e.tags||[]).join('; '), e.paymentMode, e.recurring ? 'Yes' : 'No', e.location || ''
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(csv, `kanakku-expenses-${K.todayISO()}.csv`, 'text/csv');

  const incHeader = ['Date','Amount','Source','Note'];
  const incRows = K.state.income.map(i => [i.date, i.amount, K.getIncomeSourceLabel(i.source), (i.note||'').replace(/\n/g,' ')]);
  const incCsv = [incHeader, ...incRows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(incCsv, `kanakku-income-${K.todayISO()}.csv`, 'text/csv');

  const savHeader = ['Date','Amount','Type','Note'];
  const savRows = K.state.savings.map(s => [s.date, s.amount, K.getSavingTypeLabel(s.type), (s.note||'').replace(/\n/g,' ')]);
  const savCsv = [savHeader, ...savRows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(savCsv, `kanakku-savings-${K.todayISO()}.csv`, 'text/csv');

  toast('CSV files downloaded (expenses, income, savings)');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.expenses) throw new Error('bad format');
      let added = 0;
      const promises = [];

      const existingExpIds = new Set(K.state.expenses.map(x => x.id));
      data.expenses.filter(x => !existingExpIds.has(x.id)).forEach(x => { added++; K.state.expenses.push(x); promises.push(K.addExpense(x)); });

      const existingIncIds = new Set(K.state.income.map(x => x.id));
      (data.income || []).filter(x => !existingIncIds.has(x.id)).forEach(x => { added++; K.state.income.push(x); promises.push(K.addIncome(x)); });

      const existingSavIds = new Set(K.state.savings.map(x => x.id));
      (data.savings || []).filter(x => !existingSavIds.has(x.id)).forEach(x => { added++; K.state.savings.push(x); promises.push(K.addSaving(x)); });

      Object.entries(data.budgets || {}).forEach(([subId, amt]) => { K.state.budgets[subId] = amt; K.setBudget(subId, amt); });
      Promise.all(promises).then(() => { toast(`Imported ${added} entries`); window.refreshCurrentView(); closeSettingsSheet(); });
    } catch (err) { toast('Could not read this backup file'); }
  };
  reader.readAsText(file);
}

function handleReset() {
  if (!confirm('This deletes every expense, income, saving, and budget on this device. This cannot be undone. Continue?')) return;
  const budgetIds = Object.keys(K.state.budgets);
  Promise.all([
    ...K.state.expenses.map(e => K.deleteExpense(e.id)),
    ...K.state.income.map(i => K.deleteIncome(i.id)),
    ...K.state.savings.map(s => K.deleteSaving(s.id)),
    ...budgetIds.map(subId => K.deleteBudget(subId)),
  ]).then(() => {
    K.state.expenses = []; K.state.income = []; K.state.savings = []; K.state.budgets = {};
    window.refreshCurrentView(); closeSettingsSheet(); toast('All data erased');
  });
}

window.openSettingsSheet = openSettingsSheet;
window.closeSettingsSheet = closeSettingsSheet;
window.applyTheme = applyTheme;
})();

/* ============================================================
   9. NAVIGATION + INIT
   ============================================================ */
(function () {
"use strict";
const K = window.K;

const VIEW_META = {
  home: { title: 'Home', eyebrow: 'Kanakku' },
  history: { title: 'History', eyebrow: 'All entries' },
  analytics: { title: 'Analytics', eyebrow: 'Deep dive' },
  budgets: { title: 'Budgets', eyebrow: 'Stay on track' },
};

function switchView(name) {
  if (window.closeAddSheet) window.closeAddSheet();
  if (window.closeSettingsSheet) window.closeSettingsSheet();
  K.state.view = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  document.getElementById('topbarTitle').textContent = VIEW_META[name].title;
  document.getElementById('topbarEyebrow').textContent = VIEW_META[name].eyebrow;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  renderView(name);
}

function renderView(name) {
  if (name === 'home') window.renderHome();
  else if (name === 'history') window.renderHistory();
  else if (name === 'analytics') window.renderAnalytics();
  else if (name === 'budgets') window.renderBudgets();
}

function refreshCurrentView() {
  // Only re-render the view that's actually visible. Rendering Home in the
  // background while it's hidden (display:none) made Chart.js size its
  // canvases to 0×0, so charts could come up blank the next time you opened
  // Home. switchView() already re-renders Home fresh every time you tap it,
  // so there's no need to pre-warm it here.
  renderView(K.state.view);
}

window.reconcileAfterConnect = () => reconcileWithRemote().then(() => K.flushQueue());
window.switchView = switchView;
window.refreshCurrentView = refreshCurrentView;

/* -------------------- INSTALL PROMPT (Android/desktop) -------------------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const slot = document.getElementById('installBannerSlot');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return;
  slot.innerHTML = `
    <div class="install-banner">
      <span>📲</span>
      <div><strong>Install Kanakku</strong><br>Add it to your home screen for instant, full-screen access.</div>
      <button class="close" id="installNowBtn" style="font-weight:700;color:var(--gold);">Install</button>
    </div>`;
  document.getElementById('installNowBtn').onclick = () => {
    slot.innerHTML = '';
    deferredInstallPrompt.prompt();
  };
});

/* -------------------- APP BOOT -------------------- */
function mergeById(localList, remoteList, addFn) {
  const localById = {}; localList.forEach(e => { localById[e.id] = e; });
  const merged = {};
  (remoteList || []).forEach(e => { merged[e.id] = e; });
  Object.values(localById).forEach(e => {
    const r = merged[e.id];
    if (!r || (e.updatedAt || 0) > (r.updatedAt || 0)) merged[e.id] = e;
  });
  const mergedList = Object.values(merged);
  return Promise.all(mergedList.map(e => addFn(e, true))).then(() => mergedList);
}

function reconcileWithRemote() {
  // Sheet is treated as source of truth. Merge by id, last-write-wins on updatedAt,
  // so anything still sitting in the local sync queue (not yet pushed) isn't clobbered.
  return K.fetchRemoteAll().then(remote => {
    if (!remote || !remote.ok) return;
    return Promise.all([
      mergeById(K.state.expenses, remote.expenses, K.addExpense),
      mergeById(K.state.income, remote.income, K.addIncome),
      mergeById(K.state.savings, remote.savings, K.addSaving),
    ]).then(([expenses, income, savings]) => {
      K.state.expenses = expenses;
      K.state.income = income;
      K.state.savings = savings;
      Object.assign(K.state.budgets, remote.budgets || {});
      window.refreshCurrentView();
    });
  }).catch(() => { /* offline or not yet configured — local cache keeps working */ });
}

function init() {
  // Bottom nav + FAB + settings wiring
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.nav)));
  document.getElementById('fabAdd').addEventListener('click', () => window.openAddSheet(null));
  document.getElementById('settingsBtn').addEventListener('click', () => window.openSettingsSheet());
  document.getElementById('addOverlay').addEventListener('click', () => window.closeAddSheet());
  document.getElementById('settingsOverlay').addEventListener('click', () => window.closeSettingsSheet());

  K.openDB().then(() => Promise.all([
    K.getAllExpenses(), K.getAllBudgets(), K.getKV('theme', 'dark'), K.getKV('gasUrl', null), K.updatePendingCount(),
    K.getAllIncome(), K.getAllSavings(),
  ])).then(([expenses, budgets, theme, gasUrl, _pending, income, savings]) => {
    K.state.expenses = expenses;
    K.state.income = income;
    K.state.savings = savings;
    K.state.budgets = {}; budgets.forEach(b => { K.state.budgets[b.subId] = b.amount; });
    K.state.theme = theme;
    K.sync.gasUrl = gasUrl;
    window.applyTheme();
    switchView('home');

    if (gasUrl) { reconcileWithRemote().then(() => K.flushQueue()); }

    // Quick-add shortcut from home-screen icon (manifest.json "shortcuts")
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') setTimeout(() => window.openAddSheet(null), 300);
  }).catch((err) => {
    console.error('Kanakku init error', err);
    // Fall back to localStorage mirror if IndexedDB failed entirely
    try {
      const mirror = JSON.parse(localStorage.getItem('kanakku_mirror') || '{}');
      K.state.expenses = mirror.expenses || [];
      K.state.income = mirror.income || [];
      K.state.savings = mirror.savings || [];
      (mirror.budgets || []).forEach(b => { K.state.budgets[b.subId] = b.amount; });
    } catch (e2) { /* nothing we can do */ }
    window.applyTheme();
    switchView('home');
  });

  // Register service worker for offline app-shell caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support unavailable — app still works online */ });
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
