const SPREADSHEET_ID = "1L33HQfCK1dkOwho_63Lpo63vCAKrBK0XBsAOKpRGhGk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const CACHE_KEY = "taona-finance-dashboard-cache-v1";
const BUDDHIST_YEAR = 2569;

const MONTH_SHEETS = [
  { month: 1, label: "ม.ค.", full: "มกราคม", gid: "162399202" },
  { month: 2, label: "ก.พ.", full: "กุมภาพันธ์", gid: "1704971166" },
  { month: 3, label: "มี.ค.", full: "มีนาคม", gid: "873213783" },
  { month: 4, label: "เม.ย.", full: "เมษายน", gid: "1364993698" },
  { month: 5, label: "พ.ค.", full: "พฤษภาคม", gid: "1091753654" },
  { month: 6, label: "มิ.ย.", full: "มิถุนายน", gid: "1168747436" },
  { month: 7, label: "ก.ค.", full: "กรกฎาคม", gid: "750748051" },
  { month: 8, label: "ส.ค.", full: "สิงหาคม", gid: "2009813727" },
  { month: 9, label: "ก.ย.", full: "กันยายน", gid: "474041316" },
  { month: 10, label: "ต.ค.", full: "ตุลาคม", gid: "110710213" },
  { month: 11, label: "พ.ย.", full: "พฤศจิกายน", gid: "1030000595" },
  { month: 12, label: "ธ.ค.", full: "ธันวาคม", gid: "909493022" },
];

const COLORS = ["#0aa39a", "#ff6f61", "#f5a524", "#9b59b6", "#7f8fa6", "#2563eb", "#138b57", "#e24a43"];
const state = {
  loading: true,
  selectedMonth: 4,
  mode: "monthly",
  txType: "all",
  category: "all",
  search: "",
  sort: "date-desc",
  data: null,
  error: null,
};

const app = document.getElementById("app");

function icon(name) {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    trend: '<path d="M3 17l6-6 4 4 7-9"/><path d="M14 6h6v6"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M16 12h5v5h-5a2.5 2.5 0 0 1 0-5z"/>',
    receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    apple: '<path d="M12 7c1.8-2.4 4.4-1.8 5.3-.4 1.5 2.4.2 8.8-5.3 12.4C6.5 15.4 5.2 9 6.7 6.6 7.6 5.2 10.2 4.6 12 7z"/><path d="M12 7c-.2-2 1.2-3.6 3.4-4"/><path d="M12 7c-.7-1.7-2.1-2.7-4-3"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h17"/><rect x="7" y="12" width="3" height="4"/><rect x="12" y="8" width="3" height="8"/><rect x="17" y="4" width="3" height="12"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
    filter: '<path d="M3 5h18"/><path d="M7 12h10"/><path d="M10 19h4"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function loadSheet(sheet) {
  return new Promise((resolve, reject) => {
    const callbackName = `__sheet_${sheet.month}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`โหลดแท็บ ${sheet.label} ไม่สำเร็จ`));
    }, 18000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      cleanup();
      if (!response || response.status !== "ok") {
        reject(new Error(response?.errors?.[0]?.detailed_message || `แท็บ ${sheet.label} ไม่ตอบกลับ`));
        return;
      }
      resolve(parseMonthSheet(sheet, response.table?.rows || []));
    };

    const tqx = encodeURIComponent(`out:json;responseHandler:${callbackName}`);
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${sheet.gid}&tqx=${tqx}`;
    script.onerror = () => {
      cleanup();
      reject(new Error(`Google Sheets ปฏิเสธการโหลดแท็บ ${sheet.label}`));
    };
    document.head.appendChild(script);
  });
}

function parseMonthSheet(sheet, rows) {
  const income = [];
  const expenses = [];
  const quality = [];

  rows.forEach((row, rowIndex) => {
    const cells = row.c || [];
    const revenueDate = parseDate(cells[1]);
    const cash = toNumber(cells[2]);
    const transfer = toNumber(cells[3]);
    const inStore = toNumber(cells[4]);
    const grab = toNumber(cells[5]);
    const gokoo = toNumber(cells[6]);
    const delivery = toNumber(cells[7]);
    const other = toNumber(cells[8]);
    const totalRevenue = toNumber(cells[10]) || cash + transfer + grab + gokoo + other;
    const note = text(cells[9]);

    if (revenueDate && totalRevenue > 0) {
      if (cash) income.push(makeIncome(sheet, revenueDate, "หน้าร้าน", "เงินสด", cash, "เงินสด", note, rowIndex));
      if (transfer) income.push(makeIncome(sheet, revenueDate, "หน้าร้าน", "เงินโอน", transfer, "เงินโอน", note, rowIndex));
      if (grab) income.push(makeIncome(sheet, revenueDate, "Delivery", "Grab", grab, "แพลตฟอร์ม", note, rowIndex));
      if (gokoo) income.push(makeIncome(sheet, revenueDate, "Delivery", "Gokoo", gokoo, "แพลตฟอร์ม", note, rowIndex));
      if (other) income.push(makeIncome(sheet, revenueDate, "รายได้อื่น", note || "รายได้อื่น", other, "อื่นๆ", note, rowIndex));
      if (!cash && !transfer && inStore) income.push(makeIncome(sheet, revenueDate, "หน้าร้าน", "รวมหน้าร้าน", inStore, "รวม", note, rowIndex));
      if (!grab && !gokoo && delivery) income.push(makeIncome(sheet, revenueDate, "Delivery", "รวม Delivery", delivery, "รวม", note, rowIndex));
    }

    const expenseDate = parseDate(cells[12]);
    const item = normalizeItem(text(cells[13]));
    if (!expenseDate || !item) return;

    const unit = text(cells[14]);
    const qty = toNumber(cells[15]);
    const price = toNumber(cells[16]);
    const amount = toNumber(cells[17]) || (qty && price ? qty * price : 0);
    const category = text(cells[18]) || "ไม่พบข้อมูล";
    const subcategory = text(cells[19]) || "ไม่พบข้อมูล";
    const expenseNote = text(cells[20]);

    if (!amount) {
      quality.push({
        level: "warning",
        message: `แถว ${rowIndex + 1}: "${item}" ไม่มียอดเงินรายจ่าย`,
      });
      return;
    }
    if (category.includes("ไม่พบ") || subcategory.includes("ไม่พบ")) {
      quality.push({
        level: "warning",
        message: `แถว ${rowIndex + 1}: "${item}" ยังไม่ถูกจัดหมวดหมู่`,
      });
    }
    expenses.push({
      id: `e-${sheet.month}-${rowIndex}`,
      month: sheet.month,
      date: toISO(expenseDate),
      type: "expense",
      label: item,
      detail: item,
      unit,
      qty,
      price,
      amount,
      category,
      subcategory,
      payment: "",
      note: expenseNote,
    });
  });

  const transactions = [...income, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const revenue = sum(income, "amount");
  const expenseTotal = sum(expenses, "amount");
  const fruitExpenses = expenses.filter(isFruitExpense);
  const categoryTotals = groupTotal(expenses, "category");
  const subcategoryTotals = groupTotal(expenses, "subcategory");
  const fruitItems = groupTotal(fruitExpenses, "label");

  return {
    ...sheet,
    income,
    expenses,
    transactions,
    revenue,
    expensesTotal: expenseTotal,
    netProfit: revenue - expenseTotal,
    fruitTotal: sum(fruitExpenses, "amount"),
    categoryTotals,
    subcategoryTotals,
    fruitItems,
    quality,
  };
}

function makeIncome(sheet, date, category, subcategory, amount, payment, note, rowIndex) {
  return {
    id: `i-${sheet.month}-${rowIndex}-${category}-${subcategory}`,
    month: sheet.month,
    date: toISO(date),
    type: "income",
    label: subcategory,
    detail: subcategory,
    unit: "",
    qty: 1,
    price: amount,
    amount,
    category,
    subcategory,
    payment,
    note,
  };
}

function parseDate(cell) {
  const value = raw(cell);
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const base = Date.UTC(1899, 11, 30);
    return new Date(base + value * 86400000);
  }
  if (typeof value === "string") {
    const match = value.match(/Date\((\d+),(\d+),(\d+)/);
    if (match) return new Date(Number(match[1]), Number(match[2]), Number(match[3]), 12);
  }
  return null;
}

function raw(cell) {
  return cell && typeof cell === "object" ? cell.v ?? cell.f ?? "" : cell;
}

function text(cell) {
  return String(raw(cell) ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(cell) {
  const value = raw(cell);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  if (value.includes("#DIV") || value.includes("Function")) return 0;
  const parsed = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeItem(value) {
  return value
    .replace(/เซเลอลี่/g, "เซเลอรี่")
    .replace(/แก้วมังกรแดง/g, "แก้วมังกร")
    .replace(/รีวืว/g, "รีวิว")
    .trim();
}

function isFruitExpense(tx) {
  return tx.type === "expense" && (tx.subcategory.includes("ผลไม้") || /กล้วย|ส้ม|มะม่วง|แตงโม|สับปะรด|มะพร้าว|ฝรั่ง|มะนาว|แคนตาลูป|เมล่อน|ลิ้นจี่|ลำไย|แก้วมังกร|อะโวคาโด|อโวคาโด|บีทรูท|แครอท|เซเลอรี่/.test(tx.label));
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function groupTotal(items, key) {
  return items.reduce((acc, item) => {
    const label = item[key] || "ไม่ระบุ";
    acc[label] = (acc[label] || 0) + item.amount;
    return acc;
  }, {});
}

function buildData(months) {
  const ordered = MONTH_SHEETS.map((sheet) => months.find((month) => month.month === sheet.month) || emptyMonth(sheet));
  const transactions = ordered.flatMap((month) => month.transactions);
  const categories = Array.from(new Set(transactions.filter((tx) => tx.type === "expense").map((tx) => tx.category))).sort();
  return {
    loadedAt: new Date().toISOString(),
    months: ordered,
    transactions,
    categories,
  };
}

function emptyMonth(sheet) {
  return {
    ...sheet,
    income: [],
    expenses: [],
    transactions: [],
    revenue: 0,
    expensesTotal: 0,
    netProfit: 0,
    fruitTotal: 0,
    categoryTotals: {},
    subcategoryTotals: {},
    fruitItems: {},
    quality: [],
  };
}

async function loadAll({ force = false } = {}) {
  state.loading = true;
  state.error = null;
  render();

  try {
    if (!force) {
      const cached = readCache();
      if (cached) {
        state.data = cached;
        state.loading = false;
        render();
      }
    }
    const loaded = await Promise.all(MONTH_SHEETS.map(loadSheet));
    state.data = buildData(loaded);
    localStorage.setItem(CACHE_KEY, JSON.stringify(state.data));
    state.loading = false;
    render();
  } catch (error) {
    const cached = readCache();
    if (cached) {
      state.data = cached;
      state.error = `${error.message} ใช้ข้อมูล cache ล่าสุดแทน`;
    } else {
      state.error = error.message;
    }
    state.loading = false;
    render();
  }
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function render() {
  if (state.loading && !state.data) {
    app.innerHTML = `
      <div class="boot-screen">
        <div class="boot-mark">น้ำ</div>
        <div>
          <h1>กำลังโหลดแดชบอร์ด</h1>
          <p>ดึงข้อมูลรายเดือนจาก Google Sheets...</p>
        </div>
      </div>`;
    return;
  }

  if (!state.data) {
    app.innerHTML = `<div class="error-state"><h1>โหลดข้อมูลไม่สำเร็จ</h1><p>${escapeHtml(state.error || "ไม่พบข้อมูล")}</p></div>`;
    return;
  }

  const selected = getSelectedMonth();
  const previous = getPreviousMonth();
  const allMonths = state.data.months;
  const txRows = filteredTransactions(selected);
  const monthDelta = {
    revenue: diff(selected.revenue, previous?.revenue || 0),
    expenses: diff(selected.expensesTotal, previous?.expensesTotal || 0),
    netProfit: diff(selected.netProfit, previous?.netProfit || 0),
    fruit: diff(selected.fruitTotal, previous?.fruitTotal || 0),
    margin: diff(profitMargin(selected), profitMargin(previous)),
  };

  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="dashboard">
        ${renderTopbar(selected)}
        ${state.error ? `<div class="panel quality-panel" style="margin-bottom:12px">${escapeHtml(state.error)}</div>` : ""}
        <section class="kpi-grid">
          ${renderKpi("รายได้รวม", selected.revenue, monthDelta.revenue, "trend", "teal", false)}
          ${renderKpi("ค่าใช้จ่ายรวม", selected.expensesTotal, monthDelta.expenses, "receipt", "red", true)}
          ${renderKpi("กำไรสุทธิ", selected.netProfit, monthDelta.netProfit, "wallet", "teal", false)}
          ${renderKpi("ค่าใช้จ่ายผลไม้", selected.fruitTotal, monthDelta.fruit, "apple", "red", true)}
          ${renderKpi("อัตรากำไรสุทธิ", profitMargin(selected), monthDelta.margin, "chart", "teal", false, true)}
        </section>
        <section class="dashboard-grid">
          <article class="panel span-6">
            ${panelHeader("แนวโน้มรายได้ vs ค่าใช้จ่าย", "รายเดือนจากแท็บ 1-12", renderModeSwitch())}
            ${renderTrendChart(allMonths)}
          </article>
          <article class="panel span-3">
            ${panelHeader("เทียบรายจ่ายตามหมวด", `${previous?.label || "-"} เทียบ ${selected.label}`, "")}
            ${renderCategoryCompare(selected, previous)}
          </article>
          <article class="panel span-3">
            ${panelHeader(`สรุปไฮไลต์เดือน ${selected.label}. ${BUDDHIST_YEAR}`, "รายการเพิ่มขึ้น/ลดลงมากที่สุด", "")}
            ${renderInsights(selected, previous)}
          </article>
          <article class="panel span-4">
            ${panelHeader(`วิเคราะห์ผลไม้ (${selected.label}. ${BUDDHIST_YEAR})`, "สัดส่วนรายจ่ายตามรายการ", "")}
            ${renderFruitDonut(selected)}
          </article>
          <article class="panel span-4">
            ${panelHeader("จัดอันดับผลไม้ตามค่าใช้จ่าย", "ดูยอดและการเปลี่ยนแปลงจากเดือนก่อน", "")}
            ${renderFruitRanking(selected, previous)}
          </article>
          <article class="panel span-4">
            ${panelHeader("แนวโน้มค่าใช้จ่ายผลไม้รายเดือน", "รวมเฉพาะประเภทย่อยผลไม้และรายการใกล้เคียง", "")}
            ${renderFruitTrend(allMonths)}
          </article>
          <article class="panel span-9">
            ${panelHeader("ธุรกรรมล่าสุด", `${txRows.length.toLocaleString("th-TH")} รายการที่ตรงกับตัวกรอง`, renderDownloadButton())}
            ${renderToolbar(selected)}
            ${renderTable(txRows)}
          </article>
          <article class="panel span-3 quality-panel">
            ${panelHeader("การแจ้งเตือนคุณภาพข้อมูล", "รายการที่ควรตรวจในชีต", "")}
            ${renderQuality(selected)}
          </article>
          <article class="panel span-3">
            ${panelHeader(`กระแสเงินสด (${selected.label}. ${BUDDHIST_YEAR})`, "สรุปรายรับรายจ่าย", "")}
            ${renderCashflow(selected)}
          </article>
        </section>
      </main>
    </div>`;

  bindEvents();
}

function renderSidebar() {
  const loaded = state.data?.loadedAt ? formatDateTime(state.data.loadedAt) : "-";
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">น้ำ</div>
        <div>
          <h1>สมูทตี้ดี๊ดี๊</h1>
          <p>แดชบอร์ดการเงิน</p>
        </div>
      </div>
      <nav class="nav">
        ${navItem("grid", "ภาพรวม", true)}
        ${navItem("trend", "รายได้", false)}
        ${navItem("receipt", "ค่าใช้จ่าย", false)}
        ${navItem("apple", "วัตถุดิบผลไม้", false)}
        ${navItem("chart", "กำไร & กระแสเงินสด", false)}
      </nav>
      <div class="source-card">
        <h2>แหล่งข้อมูล</h2>
        <div class="status-line"><span class="status-dot"></span>Google Sheets</div>
        <div class="status-line"><span class="status-dot"></span>เชื่อมต่อแล้ว</div>
        <div class="status-line muted">โหลดล่าสุด<br>${loaded}</div>
      </div>
    </aside>`;
}

function navItem(iconName, label, active) {
  return `<button class="nav-item ${active ? "is-active" : ""}" type="button">${icon(iconName)}<span>${label}</span></button>`;
}

function renderTopbar(selected) {
  return `
    <header class="topbar">
      <div class="page-title">
        <h2>ภาพรวมรายได้และค่าใช้จ่าย</h2>
        <p>ข้อมูลจาก <a class="sheet-link" href="${SHEET_URL}" target="_blank" rel="noreferrer">Google Sheets</a> · แท็บเดือน ${selected.full} ${BUDDHIST_YEAR}</p>
      </div>
      <div class="month-tabs" aria-label="เลือกเดือน">
        ${MONTH_SHEETS.map((month) => `<button class="month-tab ${month.month === state.selectedMonth ? "is-active" : ""}" data-month="${month.month}" type="button">${month.label}</button>`).join("")}
      </div>
      <div class="top-actions">
        <button class="btn" id="refreshBtn" type="button">${icon("refresh")} รีเฟรช</button>
      </div>
    </header>`;
}

function renderKpi(title, value, delta, iconName, tone, inverseBad, isPercent = false) {
  const display = isPercent ? `${formatNumber(value, 1)}%` : formatBaht(value);
  const deltaText = `${delta.value >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(delta.percent), 1)}% จากเดือนก่อน`;
  const bad = inverseBad ? delta.value > 0 : delta.value < 0;
  const neutral = Math.abs(delta.value) < 1;
  return `
    <article class="kpi-card">
      <div class="kpi-head">
        <h3>${title}</h3>
        <span class="kpi-icon" style="color:${tone === "red" ? "var(--coral)" : "var(--teal)"}">${icon(iconName)}</span>
      </div>
      <div class="kpi-value">${display}</div>
      <div class="delta ${bad ? "is-bad" : ""} ${neutral ? "is-neutral" : ""}">${deltaText}</div>
    </article>`;
}

function panelHeader(title, subtitle, actions) {
  return `
    <div class="panel-header">
      <div class="panel-title">
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      ${actions || ""}
    </div>`;
}

function renderModeSwitch() {
  return `
    <div class="segmented">
      <button class="${state.mode === "monthly" ? "is-active" : ""}" data-mode="monthly" type="button">รายเดือน</button>
      <button class="${state.mode === "net" ? "is-active" : ""}" data-mode="net" type="button">กำไร</button>
    </div>`;
}

function renderTrendChart(months) {
  const netMode = state.mode === "net";
  const active = months;
  const width = 720;
  const height = 275;
  const pad = { top: 18, right: 18, bottom: 38, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxValue = Math.max(1000, ...active.flatMap((m) => [m.revenue, m.expensesTotal, Math.max(0, m.netProfit)]));
  const y = (value) => pad.top + plotH - (value / maxValue) * plotH;
  const step = plotW / active.length;
  const barW = Math.min(20, step / 4);
  const points = active.map((m, index) => {
    const x = pad.left + index * step + step / 2;
    return `${x},${y(Math.max(0, m.netProfit))}`;
  });

  const areaPoints = `${pad.left},${pad.top + plotH} ${points.join(" ")} ${pad.left + (active.length - 1) * step},${pad.top + plotH}`;
  return `
    <div class="legend">
      ${netMode ? "" : `<span class="legend-item" style="color:var(--teal)"><span class="swatch"></span>รายได้</span>
      <span class="legend-item" style="color:var(--coral)"><span class="swatch"></span>ค่าใช้จ่าย</span>`}
      <span class="legend-item" style="color:var(--navy)"><span class="swatch"></span>กำไรสุทธิ</span>
    </div>
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟรายได้ ค่าใช้จ่าย และกำไรสุทธิ">
      ${[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const yy = pad.top + plotH - tick * plotH;
        return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" stroke="#e7edf4"/><text class="axis-label" x="8" y="${yy + 4}">${formatCompact(maxValue * tick)}</text>`;
      }).join("")}
      ${netMode ? `<polygon points="${areaPoints}" fill="#0aa39a" opacity="0.08"/>` : ""}
      ${active.map((m, index) => {
        const x = pad.left + index * step + step / 2;
        const activeClass = m.month === state.selectedMonth ? 'opacity="1"' : 'opacity="0.82"';
        return `
          ${netMode ? "" : `<rect ${activeClass} x="${x - barW - 2}" y="${y(m.revenue)}" width="${barW}" height="${pad.top + plotH - y(m.revenue)}" fill="#0aa39a" rx="3"/>
          <rect ${activeClass} x="${x + 2}" y="${y(m.expensesTotal)}" width="${barW}" height="${pad.top + plotH - y(m.expensesTotal)}" fill="#ff6f61" rx="3"/>`}
          ${m.month === state.selectedMonth ? `<rect x="${x - step / 2 + 4}" y="${pad.top}" width="${step - 8}" height="${plotH}" fill="#0aa39a" opacity="0.06" rx="7"/>` : ""}
          <text class="axis-label" x="${x}" y="${height - 12}" text-anchor="middle">${m.label}</text>`;
      }).join("")}
      <polyline points="${points.join(" ")}" fill="none" stroke="#082847" stroke-width="3"/>
      ${active.map((m, index) => {
        const x = pad.left + index * step + step / 2;
        return `<circle cx="${x}" cy="${y(Math.max(0, m.netProfit))}" r="${m.month === state.selectedMonth ? 5 : 3.5}" fill="#082847"/>`;
      }).join("")}
    </svg>`;
}

function renderCategoryCompare(current, previous) {
  const keys = Array.from(new Set([...Object.keys(current.categoryTotals), ...Object.keys(previous?.categoryTotals || {})]));
  const ranked = keys
    .map((key) => ({ key, current: current.categoryTotals[key] || 0, previous: previous?.categoryTotals[key] || 0 }))
    .sort((a, b) => b.current + b.previous - (a.current + a.previous))
    .slice(0, 8);
  const max = Math.max(1, ...ranked.flatMap((row) => [row.current, row.previous]));
  if (!ranked.length) return `<div class="empty-state">ยังไม่มีรายจ่ายเดือนนี้</div>`;
  return `
    <div class="legend" style="margin-bottom:12px">
      <span class="legend-item" style="color:#aeb7c3"><span class="swatch"></span>${previous?.label || "เดือนก่อน"}</span>
      <span class="legend-item" style="color:var(--teal)"><span class="swatch"></span>${current.label}</span>
    </div>
    <div class="category-bars">
      ${ranked.map((row) => {
        const change = diff(row.current, row.previous);
        const bad = change.value > 0;
        return `
          <div class="category-row">
            <strong title="${escapeHtml(row.key)}">${escapeHtml(shorten(row.key, 16))}</strong>
            <div class="bar-track">
              <span class="bar-prev" style="width:${(row.previous / max) * 100}%"></span>
              <span class="bar-current" style="width:${(row.current / max) * 100}%"></span>
            </div>
            <span class="amount ${bad ? "negative" : "positive"}">${change.value >= 0 ? "+" : ""}${formatCompact(change.value)}</span>
          </div>`;
      }).join("")}
    </div>`;
}

function renderFruitDonut(month) {
  const entries = Object.entries(month.fruitItems).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) return `<div class="empty-state">ยังไม่พบรายจ่ายผลไม้ในเดือนนี้</div>`;
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = entries.map(([name, value], index) => {
    const dash = (value / total) * circumference;
    const circle = `<circle cx="86" cy="86" r="${radius}" fill="none" stroke="${COLORS[index % COLORS.length]}" stroke-width="25" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 86 86)"/>`;
    offset += dash;
    return circle;
  }).join("");
  return `
    <div class="donut-wrap">
      <svg width="172" height="172" viewBox="0 0 172 172" role="img" aria-label="สัดส่วนรายจ่ายผลไม้">
        <circle cx="86" cy="86" r="${radius}" fill="none" stroke="#edf1f6" stroke-width="25"/>
        ${circles}
        <text class="donut-sub" x="86" y="76" text-anchor="middle">รวม</text>
        <text class="donut-center" x="86" y="98" text-anchor="middle">${formatCompact(total)}</text>
        <text class="donut-sub" x="86" y="116" text-anchor="middle">บาท</text>
      </svg>
      <div class="rank-list">
        ${entries.map(([name, value], index) => `
          <div class="rank-row">
            <span class="rank-no" style="color:${COLORS[index % COLORS.length]}">●</span>
            <span class="rank-name">${escapeHtml(shorten(name, 22))}</span>
            <strong>${formatCompact(value)}</strong>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderFruitRanking(current, previous) {
  const entries = Object.entries(current.fruitItems).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  if (!entries.length) return `<div class="empty-state">ยังไม่มีรายการผลไม้</div>`;
  return `
    <div class="rank-list">
      ${entries.map(([name, value], index) => {
        const previousValue = previous?.fruitItems?.[name] || 0;
        const change = diff(value, previousValue);
        return `
          <div class="rank-row" style="grid-template-columns:28px minmax(0,1fr) 92px">
            <span class="rank-no">${index + 1}</span>
            <span class="rank-name">
              <strong>${escapeHtml(name)}</strong>
              <span class="rank-bar"><span class="rank-fill" style="width:${(value / max) * 100}%"></span></span>
            </span>
            <span class="amount ${change.value > 0 ? "negative" : "positive"}">${formatCompact(value)}<br><small>${change.value >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(change.percent), 1)}%</small></span>
          </div>`;
      }).join("")}
    </div>`;
}

function renderFruitTrend(months) {
  const width = 410;
  const height = 210;
  const pad = { top: 14, right: 18, bottom: 32, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1000, ...months.map((m) => m.fruitTotal));
  const y = (value) => pad.top + plotH - (value / max) * plotH;
  const step = plotW / Math.max(1, months.length - 1);
  const points = months.map((m, index) => `${pad.left + index * step},${y(m.fruitTotal)}`);
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟแนวโน้มรายจ่ายผลไม้">
      ${[0, 0.5, 1].map((tick) => {
        const yy = pad.top + plotH - tick * plotH;
        return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" stroke="#e7edf4"/><text class="axis-label" x="6" y="${yy + 4}">${formatCompact(max * tick)}</text>`;
      }).join("")}
      <polyline points="${points.join(" ")}" fill="none" stroke="#0aa39a" stroke-width="3"/>
      ${months.map((m, index) => {
        const x = pad.left + index * step;
        return `<circle cx="${x}" cy="${y(m.fruitTotal)}" r="${m.month === state.selectedMonth ? 5 : 3.5}" fill="${m.month === state.selectedMonth ? "#082847" : "#0aa39a"}"/><text class="axis-label" x="${x}" y="${height - 10}" text-anchor="middle">${m.label}</text>`;
      }).join("")}
    </svg>`;
}

function renderInsights(current, previous) {
  const categoryChanges = compareMap(current.categoryTotals, previous?.categoryTotals || {});
  const fruitChanges = compareMap(current.fruitItems, previous?.fruitItems || {});
  const increases = categoryChanges.filter((item) => item.diff > 0).slice(0, 3);
  const decreases = categoryChanges.filter((item) => item.diff < 0).slice(-3).reverse();
  const fruitIncrease = fruitChanges.find((item) => item.diff > 0);
  return `
    <div class="metric-row"><strong>กำไรสุทธิ</strong><span class="amount ${current.netProfit >= 0 ? "positive" : "negative"}">${formatBaht(current.netProfit)}</span></div>
    <div class="metric-row"><strong>อัตรากำไรสุทธิ</strong><span class="amount">${formatNumber(profitMargin(current), 1)}%</span></div>
    <div class="metric-row"><strong>รายได้เฉลี่ยต่อวัน</strong><span class="amount">${formatBaht(avgPerDay(current.income))}</span></div>
    <div class="metric-row"><strong>รายจ่ายเฉลี่ยต่อวัน</strong><span class="amount">${formatBaht(avgPerDay(current.expenses))}</span></div>
    <div style="height:8px"></div>
    <h4 style="margin:0 0 6px;font-size:13px">รายการเพิ่มขึ้นมากที่สุด</h4>
    <div class="insight-list">
      ${(increases.length ? increases : [{ key: "ไม่มีรายการเพิ่มขึ้น", diff: 0, percent: 0 }]).map((item) => insightRow(item, true)).join("")}
    </div>
    <h4 style="margin:12px 0 6px;font-size:13px">รายการลดลงมากที่สุด</h4>
    <div class="insight-list">
      ${(decreases.length ? decreases : [{ key: "ไม่มีรายการลดลง", diff: 0, percent: 0 }]).map((item) => insightRow(item, false)).join("")}
    </div>
    ${fruitIncrease ? `<div class="metric-row"><strong>ผลไม้ที่เพิ่มสูงสุด</strong><span class="amount negative">${escapeHtml(shorten(fruitIncrease.key, 16))}<br>+${formatCompact(fruitIncrease.diff)}</span></div>` : ""}`;
}

function insightRow(item, increase) {
  const cls = item.diff === 0 ? "" : increase ? "negative" : "positive";
  return `
    <div class="insight-row">
      <strong>${escapeHtml(shorten(item.key, 20))}</strong>
      <span class="amount ${cls}">${item.diff >= 0 ? "+" : ""}${formatCompact(item.diff)} (${formatNumber(item.percent, 1)}%)</span>
    </div>`;
}

function renderToolbar(month) {
  const categories = ["all", ...state.data.categories];
  return `
    <div class="toolbar">
      <select class="select" id="typeFilter" aria-label="ประเภทธุรกรรม">
        <option value="all" ${state.txType === "all" ? "selected" : ""}>ทั้งหมด</option>
        <option value="income" ${state.txType === "income" ? "selected" : ""}>รายรับ</option>
        <option value="expense" ${state.txType === "expense" ? "selected" : ""}>รายจ่าย</option>
      </select>
      <select class="select" id="categoryFilter" aria-label="หมวดหมู่">
        ${categories.map((cat) => `<option value="${escapeAttr(cat)}" ${state.category === cat ? "selected" : ""}>${cat === "all" ? "ทุกหมวดหมู่" : escapeHtml(cat)}</option>`).join("")}
      </select>
      <input class="input" id="searchInput" value="${escapeAttr(state.search)}" placeholder="ค้นหารายการ หมวดหมู่ หรือหมายเหตุ" />
      <button class="btn icon-only" id="clearFilters" title="ล้างตัวกรอง" type="button">${icon("filter")}</button>
    </div>`;
}

function renderDownloadButton() {
  return `<button class="btn" id="downloadCsv" type="button">${icon("download")} CSV</button>`;
}

function renderTable(rows) {
  const visible = rows.slice(0, 120);
  if (!visible.length) return `<div class="empty-state">ไม่พบรายการที่ตรงกับตัวกรอง</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ประเภท</th>
            <th>หมวดหมู่</th>
            <th>รายละเอียด</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>ช่องทาง/ประเภทย่อย</th>
            <th style="text-align:right">ยอดเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((tx) => `
            <tr>
              <td>${formatDate(tx.date)}</td>
              <td><span class="badge ${tx.type}">${tx.type === "income" ? "รายรับ" : "รายจ่าย"}</span></td>
              <td>${escapeHtml(tx.category)}</td>
              <td><strong>${escapeHtml(tx.detail || tx.label)}</strong>${tx.note ? `<br><span class="muted">${escapeHtml(shorten(tx.note, 48))}</span>` : ""}</td>
              <td>${tx.qty ? formatNumber(tx.qty, 2) : "-"}</td>
              <td>${escapeHtml(tx.unit || "-")}</td>
              <td>${escapeHtml(tx.payment || tx.subcategory || "-")}</td>
              <td style="text-align:right" class="amount ${tx.type === "income" ? "positive" : "negative"}">${tx.type === "income" ? "+" : "-"}${formatBaht(tx.amount)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin:10px 0 0">แสดง ${visible.length.toLocaleString("th-TH")} จาก ${rows.length.toLocaleString("th-TH")} รายการ</p>`;
}

function renderQuality(month) {
  const missingCategory = month.quality.filter((item) => item.message.includes("จัดหมวดหมู่")).length;
  const missingAmount = month.quality.filter((item) => item.message.includes("ยอดเงิน")).length;
  const lowData = month.transactions.length === 0;
  const alerts = [
    missingCategory ? `หมวดหมู่ไม่ครบ ${missingCategory.toLocaleString("th-TH")} รายการ` : "",
    missingAmount ? `ยอดเงินรายจ่ายหาย ${missingAmount.toLocaleString("th-TH")} รายการ` : "",
    lowData ? `เดือน ${month.label}. ยังไม่มีธุรกรรม` : "",
  ].filter(Boolean);
  if (!alerts.length) alerts.push("ไม่พบปัญหาหลักในเดือนนี้");
  return alerts.map((message) => `
    <div class="quality-row">
      <span class="quality-icon">${icon("alert")}</span>
      <div><strong>${escapeHtml(message)}</strong><br><span class="muted">ตรวจสอบแถวต้นทางในแท็บ ${month.month}</span></div>
    </div>`).join("");
}

function renderCashflow(month) {
  const cashIncome = sum(month.income.filter((tx) => tx.payment === "เงินสด"), "amount");
  const transferIncome = sum(month.income.filter((tx) => tx.payment === "เงินโอน"), "amount");
  const deliveryIncome = sum(month.income.filter((tx) => tx.category === "Delivery"), "amount");
  return `
    <div class="metric-row"><strong>เงินสดหน้าร้าน</strong><span class="amount positive">${formatBaht(cashIncome)}</span></div>
    <div class="metric-row"><strong>เงินโอนหน้าร้าน</strong><span class="amount positive">${formatBaht(transferIncome)}</span></div>
    <div class="metric-row"><strong>Delivery</strong><span class="amount positive">${formatBaht(deliveryIncome)}</span></div>
    <div class="metric-row"><strong>รายจ่ายรวม</strong><span class="amount negative">-${formatBaht(month.expensesTotal)}</span></div>
    <div class="metric-row"><strong>คงเหลือสุทธิ</strong><span class="amount ${month.netProfit >= 0 ? "positive" : "negative"}">${formatBaht(month.netProfit)}</span></div>`;
}

function getSelectedMonth() {
  return state.data.months.find((month) => month.month === state.selectedMonth) || state.data.months[0];
}

function getPreviousMonth() {
  return state.data.months.find((month) => month.month === state.selectedMonth - 1) || emptyMonth({ month: state.selectedMonth - 1, label: "เดือนก่อน", full: "เดือนก่อน", gid: "" });
}

function filteredTransactions(month) {
  const query = state.search.trim().toLowerCase();
  let rows = month.transactions.filter((tx) => {
    if (state.txType !== "all" && tx.type !== state.txType) return false;
    if (state.category !== "all" && tx.category !== state.category) return false;
    if (!query) return true;
    return [tx.label, tx.detail, tx.category, tx.subcategory, tx.note, tx.payment].join(" ").toLowerCase().includes(query);
  });
  if (state.sort === "amount-desc") rows = rows.sort((a, b) => b.amount - a.amount);
  else rows = rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

function compareMap(current, previous) {
  return Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]))
    .map((key) => {
      const currentValue = current[key] || 0;
      const previousValue = previous[key] || 0;
      const delta = diff(currentValue, previousValue);
      return { key, current: currentValue, previous: previousValue, diff: delta.value, percent: delta.percent };
    })
    .sort((a, b) => b.diff - a.diff);
}

function diff(current = 0, previous = 0) {
  const value = current - previous;
  const percent = previous ? (value / Math.abs(previous)) * 100 : current ? 100 : 0;
  return { value, percent };
}

function profitMargin(month) {
  if (!month?.revenue) return 0;
  return (month.netProfit / month.revenue) * 100;
}

function avgPerDay(items) {
  const days = new Set(items.map((item) => item.date)).size || 1;
  return sum(items, "amount") / days;
}

function bindEvents() {
  document.querySelectorAll("[data-month]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMonth = Number(button.dataset.month);
      state.category = "all";
      render();
    });
  });
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadAll({ force: true }));
  document.getElementById("typeFilter")?.addEventListener("change", (event) => {
    state.txType = event.target.value;
    render();
  });
  document.getElementById("categoryFilter")?.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });
  document.getElementById("searchInput")?.addEventListener("input", debounce((event) => {
    state.search = event.target.value;
    render();
  }, 180));
  document.getElementById("clearFilters")?.addEventListener("click", () => {
    state.txType = "all";
    state.category = "all";
    state.search = "";
    render();
  });
  document.getElementById("downloadCsv")?.addEventListener("click", downloadCurrentCsv);
}

function downloadCurrentCsv() {
  const rows = filteredTransactions(getSelectedMonth());
  const header = ["date", "type", "category", "subcategory", "detail", "qty", "unit", "amount", "note"];
  const csv = [header, ...rows.map((tx) => [tx.date, tx.type, tx.category, tx.subcategory, tx.detail, tx.qty, tx.unit, tx.amount, tx.note])].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dashboard-${getSelectedMonth().month}-${BUDDHIST_YEAR}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

function formatBaht(value) {
  return `${formatNumber(value, 0)} บาท`;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCompact(value) {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, 1)}M`;
  if (abs >= 1000) return `${sign}${formatNumber(abs / 1000, 0)}K`;
  return `${sign}${formatNumber(abs, 0)}`;
}

function formatDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("th-TH-u-ca-buddhist", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shorten(value, max) {
  if (!value || value.length <= max) return value || "";
  return `${value.slice(0, max - 1)}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

loadAll();
