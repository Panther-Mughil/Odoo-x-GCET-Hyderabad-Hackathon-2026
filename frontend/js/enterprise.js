let healthDonutChart = null;
let movementChart = null;

let state = {
  currentView: 'dashboard',
  selectedWarehouse: 'all',
  currentUser: { name: 'Alex Vance', role: 'Inventory Manager' },
  products: [],
  operations: [],
  ledger: [],
  warehouses: [],
  alerts: [
    { name: "Wireless Optical Mouse", sku: "WM-1042", current: 12, min: 50, target: 120, cost: 650, status: "Critical", vendor: "Prime Electronics" },
    { name: "USB-C Multiport Hub", sku: "HUB-2201", current: 28, min: 40, target: 80, cost: 1200, status: "Low", vendor: "TechSource India" },
    { name: "M8 Industrial Bolts", sku: "BLT-M8-100", current: 8, min: 15, target: 80, cost: 15, status: "Low", vendor: "Chennai Components" },
    { name: "Structural Steel Rods", sku: "STL-100-KG", current: 77, min: 20, target: 150, cost: 45, status: "Healthy", vendor: "ArcelorMittal Ltd" },
    { name: "Ergonomic Warehouse Chairs", sku: "CHR-ERG-BLK", current: 18, min: 5, target: 25, cost: 3200, status: "Healthy", vendor: "Metro Supplies" },
    { name: "Barcode Handheld Scanner", sku: "SCN-BT-09", current: 3, min: 10, target: 30, cost: 4500, status: "Critical", vendor: "Prime Electronics" },
    { name: "Thermal Label Rolls (500pk)", sku: "LBL-THM-500", current: 14, min: 30, target: 100, cost: 380, status: "Low", vendor: "Metro Supplies" }
  ],
  auditLogs: [
    { time: "Just now", user: "Alex Vance", action: "Validated Delivery DEL-2026-0001", entity: "Metro Frame Works", delta: "-20 kg Steel", location: "WH2/Production Rack", ip: "192.168.1.42" },
    { time: "14 mins ago", user: "Jordan Cole", action: "Internal Movement INT-2026-0001", entity: "Production Replenishment", delta: "50 kg Steel", location: "WH1/Store → WH2/Rack", ip: "192.168.1.108" },
    { time: "42 mins ago", user: "Alex Vance", action: "Validated Receipt REC-2026-0001", entity: "ArcelorMittal Steel Ltd", delta: "+100 kg Steel", location: "WH1/Main Store", ip: "192.168.1.42" },
    { time: "1 hr ago", user: "Jordan Cole", action: "Cycle Count Adjustment ADJ-2026-0001", entity: "Damaged Scrap Audit", delta: "-3 kg Steel", location: "WH2/Production Rack", ip: "192.168.1.108" }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  loadAllData();
});

// Navigation Engine
function navigate(viewName) {
  state.currentView = viewName;
  document.querySelectorAll(".page-view").forEach(el => el.style.display = "none");
  document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = "block";

  // Update active sidebar item
  const links = document.querySelectorAll(".nav-link");
  links.forEach(l => {
    if (l.getAttribute("onclick") && l.getAttribute("onclick").includes(viewName)) {
      l.classList.add("active");
    }
  });

  // Breadcrumb
  const breadcrumb = document.getElementById("breadcrumbActive");
  if (breadcrumb) {
    breadcrumb.innerText = capitalizeFirst(viewName);
  }

  // Refresh data for the active view
  if (viewName === 'dashboard') loadDashboardKPIs();
  if (viewName === 'products') renderProductsTable();
  if (viewName === 'receipts') renderReceiptsTable();
  if (viewName === 'deliveries') renderDeliveriesTable();
  if (viewName === 'transfers') renderTransfersTable();
  if (viewName === 'adjustments') renderAdjustmentsTable();
  if (viewName === 'ledger') renderLedgerTable();
  if (viewName === 'reorder') renderReorderTable();
  if (viewName === 'warehouses') renderWarehouseTopology();
  if (viewName === 'audit') renderAuditLogs();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 1. Data Fetching
async function loadAllData() {
  await Promise.all([
    loadDashboardKPIs(),
    fetchProducts(),
    fetchOperations(),
    fetchLedger(),
    fetchTopology()
  ]);
  populateModalDropdowns();
}

async function loadDashboardKPIs() {
  try {
    const res = await fetch("/api/dashboard/kpis");
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById("kpiTotalStock").innerHTML = `${data.total_units_on_hand.toLocaleString()} <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">units</span>`;
    document.getElementById("kpiLowStock").innerText = `${data.low_stock_count} items`;
    document.getElementById("kpiOutOfStock").innerText = `${data.out_of_stock_count} items`;
    document.getElementById("kpiPendingReceipts").innerText = data.pending_receipts;
    document.getElementById("kpiPendingDeliveries").innerText = data.pending_deliveries;
  } catch (e) {
    console.error(e);
  }
}

async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) return;
    state.products = await res.json();
    renderProductsTable();
    populateModalDropdowns();
  } catch (e) {
    console.error(e);
  }
}

async function fetchOperations() {
  try {
    const res = await fetch("/api/operations");
    if (!res.ok) return;
    state.operations = await res.json();
    renderReceiptsTable();
    renderDeliveriesTable();
    renderTransfersTable();
    renderAdjustmentsTable();
  } catch (e) {
    console.error(e);
  }
}

async function fetchLedger() {
  try {
    const res = await fetch("/api/dashboard/ledger?limit=50");
    if (!res.ok) return;
    state.ledger = await res.json();
    renderLedgerTable();
  } catch (e) {
    console.error(e);
  }
}

async function fetchTopology() {
  try {
    const res = await fetch("/api/dashboard/topology");
    if (!res.ok) return;
    state.warehouses = await res.json();
    renderWarehouseTopology();
  } catch (e) {
    console.error(e);
  }
}

// 2. Charts Implementation
function initCharts() {
  // Inventory Health Donut
  const donutCtx = document.getElementById("healthDonutChart")?.getContext("2d");
  if (donutCtx) {
    healthDonutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Healthy', 'Low Stock', 'Critical', 'Out of Stock'],
        datasets: [{
          data: [184, 37, 12, 8],
          backgroundColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '72%'
      }
    });
  }

  // Stock Movement Chart
  const moveCtx = document.getElementById("movementChart")?.getContext("2d");
  if (moveCtx) {
    movementChart = new Chart(moveCtx, {
      type: 'line',
      data: {
        labels: ['Mon 22', 'Tue 23', 'Wed 24', 'Thu 25', 'Fri 26 (Today)'],
        datasets: [
          {
            label: 'Incoming (Receipts)',
            data: [45, 120, 80, 150, 100],
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Outgoing (Deliveries)',
            data: [20, 65, 40, 95, 20],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Internal Transfers',
            data: [15, 30, 25, 45, 50],
            borderColor: '#0284c7',
            borderDash: [4, 4],
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }
}

function updateChartRange(range) {
  if (!movementChart) return;
  if (range === 'today') {
    movementChart.data.labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
    movementChart.data.datasets[0].data = [10, 40, 20, 80, 50, 20];
    movementChart.data.datasets[1].data = [5, 15, 30, 25, 10, 15];
  } else {
    movementChart.data.labels = ['Mon 22', 'Tue 23', 'Wed 24', 'Thu 25', 'Fri 26 (Today)'];
    movementChart.data.datasets[0].data = [45, 120, 80, 150, 100];
    movementChart.data.datasets[1].data = [20, 65, 40, 95, 20];
  }
  movementChart.update();
}

// 3. Render Views
function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  state.products.forEach(p => {
    let statusBadge = `<span class="badge badge-success">Healthy</span>`;
    if (p.is_low_stock) statusBadge = `<span class="badge badge-warning">Low Stock</span>`;
    if (p.on_hand === 0) statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;

    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openProductDrawer(p);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #1e40af;">${p.sku}</code></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-default">${p.category}</span></td>
      <td>₹${p.cost_price ? p.cost_price.toLocaleString('en-IN') : '450'}</td>
      <td><strong>${p.on_hand}</strong> <span style="font-size: 11px; color: var(--text-muted);">${p.uom}</span></td>
      <td>${p.min_reorder_qty} ${p.uom}</td>
      <td>${p.target_stock_qty} ${p.uom}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-default" onclick="event.stopPropagation(); inspectSkuModal('${p.sku}')">🔍 Racks</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReceiptsTable() {
  const tbody = document.getElementById("receiptsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const receipts = state.operations.filter(o => o.doc_type === 'receipt');
  receipts.forEach(r => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openDocDrawer(r);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #2563eb;">${r.doc_number}</code></td>
      <td><strong>${r.partner_name}</strong></td>
      <td>${r.items.map(i => `${i.product_name} (${i.sku})`).join(", ")}</td>
      <td><strong>${r.items.reduce((acc, curr) => acc + curr.quantity, 0)} units</strong></td>
      <td><code>${r.dest_location}</code></td>
      <td><span class="badge badge-success">${r.status.toUpperCase()}</span></td>
      <td style="color: var(--text-muted); font-size: 12px;">${r.created_at}</td>
      <td><button class="btn btn-sm btn-default" onclick="event.stopPropagation(); openDocDrawer('${r.doc_number}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDeliveriesTable() {
  const tbody = document.getElementById("deliveriesTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const deliveries = state.operations.filter(o => o.doc_type === 'delivery');
  deliveries.forEach(d => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openDocDrawer(d);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #7c3aed;">${d.doc_number}</code></td>
      <td><strong>${d.partner_name}</strong></td>
      <td>${d.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}</td>
      <td><code>${d.source_location}</code></td>
      <td>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: #16a34a;">
          <span>✓ Picked</span> <span>→</span> <span>✓ Packed</span> <span>→</span> <span>✓ Validated</span>
        </div>
      </td>
      <td><span class="badge badge-success">${d.status.toUpperCase()}</span></td>
      <td><button class="btn btn-sm btn-default" onclick="event.stopPropagation(); openDocDrawer('${d.doc_number}')">Details</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTransfersTable() {
  const tbody = document.getElementById("transfersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const transfers = state.operations.filter(o => o.doc_type === 'internal');
  transfers.forEach(t => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openDocDrawer(t);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #0284c7;">${t.doc_number}</code></td>
      <td>
        <div class="ledger-flow-pill">
          <span>${t.source_location}</span>
          <span class="flow-arrow">→</span>
          <span>${t.dest_location}</span>
        </div>
      </td>
      <td>${t.items.map(i => i.product_name).join(", ")}</td>
      <td><strong>${t.items.reduce((acc, curr) => acc + curr.quantity, 0)} units</strong></td>
      <td style="color: var(--text-muted); font-size: 12px;">${t.created_at}</td>
      <td><span class="badge badge-success">COMPLETED</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdjustmentsTable() {
  const tbody = document.getElementById("adjustmentsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const adjustments = state.operations.filter(o => o.doc_type === 'adjustment');
  adjustments.forEach(a => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openDocDrawer(a);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #d97706;">${a.doc_number}</code></td>
      <td><code>${a.source_location}</code></td>
      <td>${a.items.map(i => i.product_name).join(", ")}</td>
      <td><span class="badge badge-danger">Variance Logged</span></td>
      <td><strong>${a.partner_name}</strong></td>
      <td style="color: var(--text-muted); font-size: 12px;">${a.created_at}</td>
      <td><code>${a.dest_location}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLedgerTable() {
  const tbody = document.getElementById("ledgerTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  state.ledger.forEach(m => {
    const isIncoming = m.to_location.includes("WH");
    const isOutgoing = m.from_location.includes("WH");
    
    let qtyHtml = `<strong style="color: var(--text-base);">${m.quantity} ${m.uom}</strong>`;
    if (isIncoming && !isOutgoing) {
       qtyHtml = `<strong style="color: #16a34a;">+${m.quantity} ${m.uom}</strong>`;
    } else if (isOutgoing && !isIncoming) {
       qtyHtml = `<strong style="color: #dc2626;">-${m.quantity} ${m.uom}</strong>`;
    }

    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openMoveDrawer(m);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #2563eb;">${m.reference || `MOV-${m.id}`}</code></td>
      <td><strong>${m.product_name}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${m.sku})</span></td>
      <td>${qtyHtml}</td>
      <td><code style="color: #475569;">${m.from_location}</code></td>
      <td><code style="color: #16a34a; font-weight: 600;">${m.to_location}</code></td>
      <td><span class="badge badge-default">Double-Entry</span></td>
      <td><span class="badge badge-success">VALIDATED</span></td>
      <td style="color: var(--text-muted); font-size: 12px;">${m.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReorderTable() {
  const tbody = document.getElementById("reorderTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  state.alerts.forEach(a => {
    const needed = Math.max(0, a.target - a.current);
    const estCost = (needed * a.cost).toLocaleString('en-IN');
    let badgeClass = a.status === 'Critical' ? 'badge-danger' : (a.status === 'Low' ? 'badge-warning' : 'badge-success');

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${a.name}</strong></td>
      <td><code>${a.sku}</code></td>
      <td><strong style="color: ${a.status === 'Critical' ? 'var(--danger)' : 'var(--text-main)'};">${a.current} units</strong></td>
      <td>${a.min} units</td>
      <td>${a.target} units</td>
      <td><strong style="color: #2563eb;">+${needed} units</strong></td>
      <td>₹${estCost}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="quickReorderProduct('${a.sku}', ${needed})">⚡ Auto-PO</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWarehouseTopology() {
  const container = document.getElementById("warehouseTopologyGrid");
  if (!container) return;

  container.innerHTML = "";
  state.warehouses.forEach(wh => {
    const card = document.createElement("div");
    card.className = "card";
    const locRows = wh.locations.map(l => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); font-size: 12.5px;">
        <span style="display: flex; align-items: center; gap: 6px;">📍 <strong>${l.name}</strong></span>
        <code style="font-size: 11.5px; color: #2563eb;">${l.full_path}</code>
      </div>
    `).join("");

    card.innerHTML = `
      <div class="card-header">
        <h3><span>🏭</span> ${wh.name} (${wh.code})</h3>
        <span class="badge badge-info">Active Node</span>
      </div>
      <div class="card-body">
        <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px;">${wh.address}</p>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Sub-locations & Racks:</div>
        <div style="display: flex; flex-direction: column;">
          ${locRows}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAuditLogs() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  state.auditLogs.forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 12px;">${log.time}</td>
      <td><strong>${log.user}</strong></td>
      <td>${log.action}</td>
      <td><code>${log.entity}</code></td>
      <td><strong style="color: #16a34a;">${log.delta}</strong></td>
      <td><code>${log.location}</code></td>
      <td><span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${log.ip}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Slide-out Drawers for Move and Product Inspection
function openMoveDrawer(m) {
  document.getElementById("drawerTitle").innerText = `Stock Movement: ${m.reference || `MOV-${m.id}`}`;
  const body = document.getElementById("drawerBody");
  body.innerHTML = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-success" style="margin-bottom: 12px;">DOUBLE-ENTRY TRANSACTION VALIDATED</span>
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${m.product_name}</h3>
      <p style="font-size: 13px; color: var(--text-muted);">SKU: <code>${m.sku}</code> | Quantity: <strong>${m.quantity} ${m.uom}</strong></p>
    </div>

    <!-- Visual Movement Flow -->
    <div style="background: var(--bg-surface-subtle); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px;">Double-Entry Ledger Route:</div>
      <div style="display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); font-size: 12.5px;">
        <div style="background: #ffffff; padding: 8px 12px; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle);">
          <div style="font-size: 10px; color: var(--text-muted);">SOURCE</div>
          <strong>${m.from_location}</strong>
        </div>
        <span style="font-size: 20px; color: var(--primary);">➔</span>
        <div style="background: #ffffff; padding: 8px 12px; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle);">
          <div style="font-size: 10px; color: var(--text-muted);">DESTINATION</div>
          <strong>${m.to_location}</strong>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
      <div>
        <label style="color: var(--text-muted); font-size: 11px; font-weight: 600;">DATE & TIME</label>
        <div>${m.date}</div>
      </div>
      <div>
        <label style="color: var(--text-muted); font-size: 11px; font-weight: 600;">OPERATOR</label>
        <div>${state.currentUser.name}</div>
      </div>
      <div>
        <label style="color: var(--text-muted); font-size: 11px; font-weight: 600;">ACID COMPLIANCE</label>
        <div style="color: #16a34a; font-weight: 600;">Strict Consistency</div>
      </div>
      <div>
        <label style="color: var(--text-muted); font-size: 11px; font-weight: 600;">AUDIT TRANSACTION ID</label>
        <div><code>TXN-${m.id}-9942B</code></div>
      </div>
    </div>
  `;
  document.getElementById("detailDrawerBackdrop").classList.add("active");
  document.getElementById("detailDrawerPanel").classList.add("active");
}

function openProductDrawer(p) {
  document.getElementById("drawerTitle").innerText = `Product: ${p.name}`;
  const body = document.getElementById("drawerBody");
  body.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${p.name}</h3>
      <p style="font-size: 13px; color: var(--text-muted);">SKU: <code>${p.sku}</code> | Category: <strong>${p.category}</strong></p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
      <div class="card" style="padding: 12px;">
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">TOTAL ON HAND</span>
        <div style="font-size: 20px; font-weight: 700; color: #16a34a;">${p.on_hand} ${p.uom}</div>
      </div>
      <div class="card" style="padding: 12px;">
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">VALUATION (EST)</span>
        <div style="font-size: 20px; font-weight: 700;">₹${((p.cost_price || 450) * p.on_hand).toLocaleString('en-IN')}</div>
      </div>
    </div>

    <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px;">Stock Distribution across Physical Racks:</h4>
    <div id="drawerRackBreakdown" style="font-size: 13px; color: var(--text-muted);">Loading locations...</div>
  `;

  document.getElementById("detailDrawerBackdrop").classList.add("active");
  document.getElementById("detailDrawerPanel").classList.add("active");

  fetch(`/api/products/${p.id}/locations`)
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("drawerRackBreakdown");
      if (!container) return;
      container.innerHTML = data.breakdown.map(b => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>${b.full_path}</span>
          <strong style="color: ${b.quantity > 0 ? '#16a34a' : 'var(--text-muted)'};">${b.quantity} ${p.uom}</strong>
        </div>
      `).join("");
    });
}

function openDocDrawer(docOrId) {
  let doc = typeof docOrId === 'object' ? docOrId : state.operations.find(o => o.doc_number === docOrId);
  if (!doc) return;

  document.getElementById("drawerTitle").innerText = `Document: ${doc.doc_number}`;
  const body = document.getElementById("drawerBody");
  body.innerHTML = `
    <div style="margin-bottom: 16px;">
      <span class="badge badge-success" style="margin-bottom: 8px;">STATUS: ${doc.status.toUpperCase()}</span>
      <h3 style="font-size: 16px; font-weight: 700;">${doc.doc_type.toUpperCase()} ORDER</h3>
      <p style="font-size: 13px; color: var(--text-muted);">Partner / Reason: <strong>${doc.partner_name}</strong></p>
    </div>

    <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 13px;">
      <div>Source: <code>${doc.source_location}</code></div>
      <div style="margin-top: 4px;">Destination: <code>${doc.dest_location}</code></div>
      <div style="margin-top: 4px;">Created: <strong>${doc.created_at}</strong></div>
    </div>

    <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Line Items:</h4>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      ${doc.items.map(i => `
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); font-size: 13px;">
          <span>${i.product_name} (${i.sku})</span>
          <strong>${i.quantity} ${i.uom}</strong>
        </div>
      `).join("")}
    </div>
  `;
  document.getElementById("detailDrawerBackdrop").classList.add("active");
  document.getElementById("detailDrawerPanel").classList.add("active");
}

function closeDrawer() {
  document.getElementById("detailDrawerBackdrop").classList.remove("active");
  document.getElementById("detailDrawerPanel").classList.remove("active");
}

// 5. Barcode Scanner Simulation
async function executeBarcodeScan() {
  const input = document.getElementById("barcodeScanInput").value.trim().toUpperCase();
  const resBox = document.getElementById("scannerResultBox");
  if (!input || !resBox) return;

  const product = state.products.find(p => p.sku === input);
  if (!product) {
    resBox.style.display = "block";
    resBox.innerHTML = `<div style="color: var(--danger); font-weight: 600;">❌ Barcode "${input}" not registered in master catalog.</div>`;
    return;
  }

  const res = await fetch(`/api/products/${product.id}/locations`);
  const data = await res.json();

  resBox.style.display = "block";
  resBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
      <div>
        <h4 style="font-size: 16px; font-weight: 700; color: #1e40af;">Barcode Verified: ${data.sku}</h4>
        <p style="font-size: 13px; font-weight: 600;">${data.product_name}</p>
      </div>
      <span class="badge badge-success">Active SKU</span>
    </div>

    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Available Rack Breakdown:</div>
    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
      ${data.breakdown.map(b => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>${b.full_path}</span>
          <strong style="color: ${b.quantity > 0 ? '#16a34a' : 'var(--text-muted)'};">${b.quantity} ${product.uom}</strong>
        </div>
      `).join("")}
    </div>

    <div style="display: flex; gap: 8px;">
      <button class="btn btn-sm btn-primary" onclick="openReceiptModal()">Receive Goods</button>
      <button class="btn btn-sm btn-default" onclick="openTransferModal()">Transfer Location</button>
      <button class="btn btn-sm btn-default" onclick="openAdjustmentModal()">Count Physical</button>
    </div>
  `;
}

// 6. Modal Operations
function openReceiptModal() { openModal('modalReceipt'); }
function openDeliveryModal() { openModal('modalDelivery'); }
function openTransferModal() { openModal('modalTransfer'); }
function openAdjustmentModal() { openModal('modalAdjustment'); }
function openCreateProductModal() { openModal('modalCreateProduct'); }
function openAuthModal() { openModal('modalAuth'); }

function openModal(id) { document.getElementById(id)?.classList.add("active"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("active"); }

function populateModalDropdowns() {
  const selects = [
    document.getElementById("modalRecProduct"),
    document.getElementById("modalDelProduct"),
    document.getElementById("modalTransProduct"),
    document.getElementById("modalAdjProduct")
  ];

  selects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = "";
    state.products.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.innerText = `${p.sku} — ${p.name} (${p.on_hand} ${p.uom} on-hand)`;
      sel.appendChild(opt);
    });
  });
}

async function submitModalReceipt() {
  const vendor = document.getElementById("modalRecVendor").value.trim() || "Vendor Co.";
  const locId = parseInt(document.getElementById("modalRecLocation").value);
  const prodId = parseInt(document.getElementById("modalRecProduct").value);
  const qty = parseFloat(document.getElementById("modalRecQty").value);

  const res = await fetch("/api/operations/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier_name: vendor,
      dest_location_id: locId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  if (res.ok) {
    const data = await res.json();
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modalReceipt");
    loadAllData();
  }
}

async function submitModalDelivery() {
  const customer = document.getElementById("modalDelCustomer").value.trim() || "Customer Dispatch";
  const locId = parseInt(document.getElementById("modalDelLocation").value);
  const prodId = parseInt(document.getElementById("modalDelProduct").value);
  const qty = parseFloat(document.getElementById("modalDelQty").value);

  const res = await fetch("/api/operations/deliveries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: customer,
      source_location_id: locId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  if (res.ok) {
    const data = await res.json();
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modalDelivery");
    loadAllData();
  } else {
    const err = await res.json();
    alert(`Error: ${err.detail || 'Insufficient stock'}`);
  }
}

async function submitModalTransfer() {
  const srcId = parseInt(document.getElementById("modalTransSource").value);
  const destId = parseInt(document.getElementById("modalTransDest").value);
  const prodId = parseInt(document.getElementById("modalTransProduct").value);
  const qty = parseFloat(document.getElementById("modalTransQty").value);

  if (srcId === destId) return alert("Source and Destination locations cannot be the same.");

  const res = await fetch("/api/operations/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_location_id: srcId,
      dest_location_id: destId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  if (res.ok) {
    const data = await res.json();
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modalTransfer");
    loadAllData();
  } else {
    const err = await res.json();
    alert(`Error: ${err.detail || 'Transfer failed'}`);
  }
}

async function submitModalAdjustment() {
  const locId = parseInt(document.getElementById("modalAdjLocation").value);
  const prodId = parseInt(document.getElementById("modalAdjProduct").value);
  const count = parseFloat(document.getElementById("modalAdjCounted").value);
  const reason = document.getElementById("modalAdjReason").value;

  const res = await fetch("/api/operations/adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location_id: locId,
      product_id: prodId,
      counted_quantity: count,
      reason: reason
    })
  });
  if (res.ok) {
    const data = await res.json();
    alert(`Stock Adjustment Posted: ${data.message} (${data.doc_number})`);
    closeModal("modalAdjustment");
    loadAllData();
  }
}

async function submitCreateProduct() {
  const name = document.getElementById("newProdName").value.trim();
  const sku = document.getElementById("newProdSKU").value.trim().toUpperCase();
  const category = document.getElementById("newProdCategory").value;
  const uom = document.getElementById("newProdUOM").value;
  const cost = parseFloat(document.getElementById("newProdCost").value);
  const min = parseFloat(document.getElementById("newProdMin").value);

  if (!name || !sku) return alert("Please fill Product Name and SKU.");

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      sku: sku,
      category_name: category,
      uom: uom,
      cost_price: cost,
      min_reorder_qty: min,
      target_stock_qty: min * 4
    })
  });
  if (res.ok) {
    alert("Product created successfully!");
    closeModal("modalCreateProduct");
    loadAllData();
  } else {
    const err = await res.json();
    alert(`Error: ${err.detail || 'Creation failed'}`);
  }
}

// 7. Role & Auth Switch
function toggleUserRole() {
  if (state.currentUser.role === 'Inventory Manager') {
    setDemoUser('Jordan Cole', 'Warehouse Staff');
  } else {
    setDemoUser('Alex Vance', 'Inventory Manager');
  }
}

function setDemoUser(name, role) {
  state.currentUser = { name, role };
  document.getElementById("userNameDisplay").innerText = name;
  document.getElementById("userRoleDisplay").innerText = role;
  document.getElementById("avatarLetter").innerText = name.charAt(0);
  closeModal('modalAuth');
}

async function requestOTP() {
  const email = document.getElementById("otpEmailInput").value.trim();
  const res = await fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email })
  });
  const data = await res.json();
  if (res.ok) {
    document.getElementById("otpInputSection").style.display = "block";
    document.getElementById("otpCodeInput").value = data.otp_preview || "";
    alert(`OTP Code generated: ${data.otp_preview}\n(Preview auto-filled for instant hackathon demonstration)`);
  } else {
    alert(`Error: ${data.detail || 'Failed to generate OTP'}`);
  }
}

async function verifyAndResetPassword() {
  const email = document.getElementById("otpEmailInput").value.trim();
  const otp = document.getElementById("otpCodeInput").value.trim();
  const pw = document.getElementById("otpNewPassword").value.trim() || "newsecret123";

  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, otp: otp, new_password: pw })
  });
  const data = await res.json();
  if (res.ok) {
    alert("Password reset verified successfully!");
    closeModal('modalAuth');
  } else {
    alert(`Error: ${data.detail || 'OTP verification failed'}`);
  }
}

function toggleQuickMenu() {
  const m = document.getElementById("quickActionMenu");
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function handleGlobalSearch(term) {
  if (!term) return;
  const q = term.trim().toUpperCase();
  const match = state.products.find(p => p.sku.includes(q) || p.name.toUpperCase().includes(q));
  if (match) {
    navigate('products');
  }
}

function handleWarehouseChange(val) {
  state.selectedWarehouse = val;
  loadDashboardKPIs();
}

function exportLedgerCSV() {
  let csv = "Move ID,Reference,Product,SKU,Quantity,UOM,Source Location,Destination Location,Date\n";
  state.ledger.forEach(m => {
    csv += `MOV-${m.id},"${m.reference || ''}","${m.product_name}","${m.sku}",${m.quantity},"${m.uom}","${m.from_location}","${m.to_location}","${m.date}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `StockSense_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// -- NEW STATE MACHINE ACTIONS --
async function markDocReady(id) {
  try {
    const res = await fetch(`/api/operations/${id}/mark_ready`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) alert("Error: " + (data.detail || "Failed to mark ready"));
    else {
      showToast("Operation updated: " + data.status, "success");
      await fetchOperations(); // Refresh lists
      await loadDashboardKPIs();
    }
  } catch (e) {
    console.error(e);
  }
}

async function validateDoc(id) {
  try {
    const res = await fetch(`/api/operations/${id}/validate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) alert("Validation Error: " + (data.detail || "Insufficient stock or error"));
    else {
      showToast("Validated Successfully! Stock moved.", "success");
      await loadAllData(); // Refresh everything since stock changed
    }
  } catch (e) {
    console.error(e);
  }
}

function printReceipt(id) {
    const doc = state.operations.find(o => o.id === id);
    if (!doc) return;
    
    // Fill the animated receipt DOM
    document.getElementById("receipt-number").innerText = doc.doc_number;
    document.getElementById("receipt-partner").innerText = doc.partner_name;
    document.getElementById("receipt-date").innerText = new Date().toLocaleString();
    
    const tbody = document.getElementById("receipt-items-body");
    tbody.innerHTML = "";
    
    doc.items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.product_name} <br><small>${item.sku}</small></td>
            <td style="text-align: right; font-weight: bold;">${item.quantity} ${item.uom}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Show overlay
    const overlay = document.getElementById("receipt-overlay");
    overlay.style.display = "flex";
    
    // Trigger animations
    const paper = document.getElementById("receipt-paper");
    paper.classList.remove("print-animate");
    void paper.offsetWidth; // trigger reflow
    paper.classList.add("print-animate");
}

function closeReceipt() {
    document.getElementById("receipt-overlay").style.display = "none";
}
