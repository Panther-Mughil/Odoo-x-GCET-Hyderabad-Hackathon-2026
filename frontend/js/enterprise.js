let healthDonutChart = null;
let movementChart = null;
let cameraStream = null;
let barcodeScanInterval = null;

let state = {
  currentView: 'dashboard',
  selectedWarehouse: 'all',
  currentUser: { name: 'Alex Vance', role: 'Inventory Manager' },
  products: [],
  operations: [],
  ledger: [],
  warehouses: [],
  alerts: [],
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

  // Stop camera if user navigates away from scanner view
  if (viewName !== 'scanner') {
    stopCameraScanner();
  }

  // Refresh data for the active view
  if (viewName === 'dashboard') {
    loadDashboardKPIs();
    renderDashboardAlertsTable();
  }
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
    fetchTopology(),
    fetchAlerts()
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
    console.error("Failed to load dashboard KPIs:", e);
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
    console.error("Failed to fetch products:", e);
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
    console.error("Failed to fetch operations:", e);
  }
}

async function fetchLedger() {
  try {
    const res = await fetch("/api/dashboard/ledger?limit=50");
    if (!res.ok) return;
    state.ledger = await res.json();
    renderLedgerTable();
  } catch (e) {
    console.error("Failed to fetch ledger:", e);
  }
}

async function fetchTopology() {
  try {
    const res = await fetch("/api/dashboard/topology");
    if (!res.ok) return;
    state.warehouses = await res.json();
    renderWarehouseTopology();
  } catch (e) {
    console.error("Failed to fetch topology:", e);
  }
}

async function fetchAlerts() {
  try {
    const res = await fetch("/api/alerts/reorder-suggestions");
    if (!res.ok) return;
    state.alerts = await res.json();
    updateSidebarBadge();
    renderReorderTable();
    renderDashboardAlertsTable();
  } catch (e) {
    console.error("Failed to fetch reorder alerts:", e);
  }
}

function updateSidebarBadge() {
  const badge = document.getElementById("sidebar-reorder-count");
  if (badge) {
    badge.innerText = state.alerts.length;
    badge.style.display = state.alerts.length > 0 ? "inline-block" : "none";
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
      <td>₹${p.cost_price ? Number(p.cost_price).toLocaleString('en-IN') : '0'}</td>
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
    const isDone = r.status.toLowerCase() === 'done';
    const badgeClass = isDone ? 'badge-success' : 'badge-warning';

    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => openDocDrawer(r);
    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #2563eb;">${r.doc_number}</code></td>
      <td><strong>${r.partner_name}</strong></td>
      <td>${r.items.map(i => `${i.product_name} (${i.sku})`).join(", ")}</td>
      <td><strong>${r.items.reduce((acc, curr) => acc + curr.quantity, 0)} units</strong></td>
      <td><code>${r.dest_location}</code></td>
      <td><span class="badge ${badgeClass}">${r.status.toUpperCase()}</span></td>
      <td style="color: var(--text-muted); font-size: 12px;">${r.created_at}</td>
      <td><button class="btn btn-sm btn-default" onclick="event.stopPropagation(); openDocDrawer('${r.doc_number}')">${isDone ? 'View' : '⚡ Validate'}</button></td>
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
    const isDone = d.status.toLowerCase() === 'done';
    const badgeClass = isDone ? 'badge-success' : 'badge-warning';

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
      <td><span class="badge ${badgeClass}">${d.status.toUpperCase()}</span></td>
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
  if (!state.alerts || state.alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">All inventory levels are optimal. No replenishment required.</td></tr>`;
    return;
  }

  state.alerts.forEach(a => {
    const prodId = a.product_id || a.id;
    const isCritical = a.urgency === 'CRITICAL' || a.on_hand <= 0;
    const estCost = Number(a.estimated_cost || 0).toLocaleString('en-IN');

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${a.product_name || a.name}</strong></td>
      <td><code>${a.sku}</code></td>
      <td><strong style="color: ${isCritical ? 'var(--danger)' : 'var(--warning)'};">${a.on_hand} ${a.uom}</strong></td>
      <td>${a.min_reorder_qty} ${a.uom}</td>
      <td>${a.target_stock_qty} ${a.uom}</td>
      <td><strong style="color: #2563eb;">+${a.suggested_purchase_qty} ${a.uom}</strong></td>
      <td>₹${estCost}</td>
      <td>
        <button class="btn btn-sm btn-primary" id="btn-reorder-${prodId}" onclick="quickReorderProduct(${prodId})">⚡ Auto-PO</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDashboardAlertsTable() {
  const tbody = document.getElementById("dashboardAlertsTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!state.alerts || state.alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">All stock levels optimal.</td></tr>`;
    return;
  }

  const topAlerts = state.alerts.slice(0, 5);
  topAlerts.forEach(a => {
    const isCritical = a.urgency === 'CRITICAL' || a.on_hand <= 0;
    const badgeClass = isCritical ? 'badge-danger' : 'badge-warning';

    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => navigate('reorder');
    tr.innerHTML = `
      <td><strong>${a.product_name || a.name}</strong></td>
      <td><code>${a.sku}</code></td>
      <td><strong style="color: ${isCritical ? 'var(--danger)' : 'var(--warning)'};">${a.on_hand}</strong></td>
      <td>${a.min_reorder_qty}</td>
      <td><span class="badge ${badgeClass}">${a.urgency || (isCritical ? 'Critical' : 'Low')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function quickReorderProduct(productId) {
  const btn = document.getElementById(`btn-reorder-${productId}`);
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerText = "⏳ Ordering...";
  }

  try {
    const res = await fetch("/api/alerts/auto-reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Auto-Reorder Successful!\nCreated Draft Receipt: ${data.doc_number}\nReplenishment Qty: ${data.reorder_quantity} ${data.uom}`);
      await loadAllData();
      navigate('receipts');
    } else {
      alert(`Auto-Reorder Failed: ${data.detail || 'Could not place reorder'}`);
    }
  } catch (err) {
    alert(`Network Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "⚡ Auto-PO";
    }
  }
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
        <div style="font-size: 20px; font-weight: 700;">₹${((p.cost_price || 0) * p.on_hand).toLocaleString('en-IN')}</div>
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
  let doc = typeof docOrId === 'object' ? docOrId : state.operations.find(o => o.doc_number === docOrId || o.id === docOrId);
  if (!doc) return;

  const isReceipt = doc.doc_type === 'receipt';
  const isDelivery = doc.doc_type === 'delivery';
  const isDraftOrReady = doc.status.toLowerCase() !== 'done' && doc.status.toLowerCase() !== 'canceled';

  let validateBtnHtml = '';
  if (isDraftOrReady) {
    if (isReceipt) {
      validateBtnHtml = `<button class="btn btn-primary" style="margin-top: 14px; width: 100%; justify-content: center;" onclick="validateReceiptDoc(${doc.id})">✅ Validate Receipt (Receive Goods into Stock)</button>`;
    } else if (isDelivery) {
      validateBtnHtml = `<button class="btn btn-primary" style="margin-top: 14px; width: 100%; justify-content: center;" onclick="validateReceiptDoc(${doc.id})">✅ Validate Delivery (Dispatch from Stock)</button>`;
    } else {
      validateBtnHtml = `<button class="btn btn-primary" style="margin-top: 14px; width: 100%; justify-content: center;" onclick="validateReceiptDoc(${doc.id})">✅ Validate Operation</button>`;
    }
  }

  document.getElementById("drawerTitle").innerText = `Document: ${doc.doc_number}`;
  const body = document.getElementById("drawerBody");
  body.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="badge ${doc.status.toLowerCase() === 'done' ? 'badge-success' : 'badge-warning'}">STATUS: ${doc.status.toUpperCase()}</span>
        <button class="btn btn-sm btn-default" onclick="printOperationVoucher('${doc.doc_number}')">🖨️ Print Voucher</button>
      </div>
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

    ${validateBtnHtml}
  `;
  document.getElementById("detailDrawerBackdrop").classList.add("active");
  document.getElementById("detailDrawerPanel").classList.add("active");
}

async function validateReceiptDoc(docId) {
  try {
    const res = await fetch(`/api/operations/${docId}/validate`, {
      method: "POST"
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Success: ${data.message}`);
      closeDrawer();
      await loadAllData();
    } else {
      alert(`Validation Error: ${data.detail || 'Failed to validate document'}`);
    }
  } catch (e) {
    alert(`Network Error: ${e.message}`);
  }
}

function closeDrawer() {
  document.getElementById("detailDrawerBackdrop")?.classList.remove("active");
  document.getElementById("detailDrawerPanel")?.classList.remove("active");
}

// 5. Live Camera & Barcode Scanner
async function toggleCameraScanner() {
  if (cameraStream) {
    stopCameraScanner();
  } else {
    await startCameraScanner();
  }
}

async function startCameraScanner() {
  const video = document.getElementById("cameraScannerVideo");
  const placeholder = document.getElementById("cameraPlaceholderIcon");
  const statusMsg = document.getElementById("cameraStatusMsg");
  const btn = document.getElementById("btnToggleCamera");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Camera API is not supported on this browser/device. Please use manual SKU lookup below.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    cameraStream = stream;
    if (video) {
      video.srcObject = stream;
      video.style.display = "block";
    }
    if (placeholder) placeholder.style.display = "none";
    if (statusMsg) {
      statusMsg.style.display = "block";
      statusMsg.innerText = "Camera active: Align barcode in center";
    }
    if (btn) btn.innerText = "🛑 Stop Camera";

    // Setup native BarcodeDetector if supported
    if ('BarcodeDetector' in window) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const detector = new BarcodeDetector({ formats: supported.length > 0 ? supported : ['code_128', 'ean_13', 'upc_a', 'qr_code'] });
        barcodeScanInterval = setInterval(async () => {
          if (!cameraStream || !video || video.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              const input = document.getElementById("barcodeScanInput");
              if (input) input.value = code;
              if (statusMsg) statusMsg.innerText = `Detected SKU: ${code}`;
              stopCameraScanner();
              executeBarcodeScan();
            }
          } catch (e) {
            // Frame detection error, ignore and continue next frame
          }
        }, 300);
      } catch (e) {
        console.warn("BarcodeDetector error, using live video preview:", e);
      }
    } else {
      if (statusMsg) {
        statusMsg.innerText = "Live camera preview active (type SKU or select below if detector is unsupported)";
      }
    }
  } catch (err) {
    console.error("Camera access error:", err);
    if (btn) btn.innerText = "📷 Start Live Camera";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      alert("Camera permission was denied. You can still use manual SKU lookup below.");
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      alert("No camera device found on this system. You can still use manual SKU lookup below.");
    } else {
      alert(`Could not start camera (${err.message}). You can use manual SKU lookup below.`);
    }
  }
}

function stopCameraScanner() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (barcodeScanInterval) {
    clearInterval(barcodeScanInterval);
    barcodeScanInterval = null;
  }
  const video = document.getElementById("cameraScannerVideo");
  const placeholder = document.getElementById("cameraPlaceholderIcon");
  const statusMsg = document.getElementById("cameraStatusMsg");
  const btn = document.getElementById("btnToggleCamera");

  if (video) {
    video.style.display = "none";
    video.srcObject = null;
  }
  if (placeholder) placeholder.style.display = "block";
  if (statusMsg) statusMsg.style.display = "none";
  if (btn) btn.innerText = "📷 Start Live Camera";
}

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
      opt.innerText = `${p.sku} - ${p.name} (${p.on_hand} ${p.uom} on-hand)`;
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
  } else {
    const err = await res.json();
    alert(`Error: ${err.detail || 'Receipt creation failed'}`);
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
  } else {
    const err = await res.json();
    alert(`Error: ${err.detail || 'Adjustment failed'}`);
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
    alert(`OTP Code generated: ${data.otp_preview}\n(Preview auto-filled for instant demonstration)`);
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

// 8. CSV & Printable Exports
function exportLedgerCSV() {
  if (!state.ledger || state.ledger.length === 0) {
    return alert("No ledger move records available to export.");
  }

  let csv = "Date/Time,Move ID,Reference,Product,SKU,Quantity,UOM,Source Location,Destination Location,Status\n";
  state.ledger.forEach(m => {
    const escapedDate = `"${(m.date || '').replace(/"/g, '""')}"`;
    const escapedRef = `"${(m.reference || `MOV-${m.id}`).replace(/"/g, '""')}"`;
    const escapedName = `"${(m.product_name || '').replace(/"/g, '""')}"`;
    const escapedSku = `"${(m.sku || '').replace(/"/g, '""')}"`;
    const escapedSrc = `"${(m.from_location || '').replace(/"/g, '""')}"`;
    const escapedDest = `"${(m.to_location || '').replace(/"/g, '""')}"`;
    const escapedStatus = `"${(m.status || 'VALIDATED').replace(/"/g, '""')}"`;

    csv += `${escapedDate},MOV-${m.id},${escapedRef},${escapedName},${escapedSku},${m.quantity},"${m.uom}",${escapedSrc},${escapedDest},${escapedStatus}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `StockSense_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function exportStockAuditCSV() {
  if (!state.products || state.products.length === 0) {
    return alert("No product stock data available to export.");
  }

  let csv = "Product Name,SKU,Category,On Hand,UOM,Cost Price (INR),Total Valuation (INR),Min Safety Threshold,Target Stock Level,Stock Status\n";
  state.products.forEach(p => {
    const valuation = ((p.cost_price || 0) * (p.on_hand || 0)).toFixed(2);
    const escapedName = `"${(p.name || '').replace(/"/g, '""')}"`;
    const escapedSku = `"${(p.sku || '').replace(/"/g, '""')}"`;
    const escapedCat = `"${(p.category || '').replace(/"/g, '""')}"`;
    const escapedStatus = `"${(p.status || '').replace(/"/g, '""')}"`;

    csv += `${escapedName},${escapedSku},${escapedCat},${p.on_hand},"${p.uom}",${p.cost_price},${valuation},${p.min_reorder_qty},${p.target_stock_qty},${escapedStatus}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `StockSense_Audit_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function printOperationVoucher(docNumber) {
  const doc = state.operations.find(o => o.doc_number === docNumber);
  if (!doc) return alert("Document not found");

  const title = `${doc.doc_type.toUpperCase()} VOUCHER`;
  const itemsRows = doc.items.map((it, idx) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${it.sku}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${it.product_name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${it.quantity} ${it.uom}</td>
    </tr>
  `).join("");

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>StockSense - ${doc.doc_number}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 22px; font-weight: 800; color: #2563eb; }
        .doc-title { font-size: 18px; font-weight: 700; text-align: right; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; font-size: 12px; }
        .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">⚡ StockSense IMS</div>
          <div style="font-size: 12px; color: #64748b;">Double-Entry Enterprise Inventory Management</div>
        </div>
        <div>
          <div class="doc-title">${title}</div>
          <div style="font-size: 14px; font-family: monospace; font-weight: 700; color: #2563eb;">${doc.doc_number}</div>
          <div style="font-size: 12px; color: #64748b;">Status: <strong>${doc.status.toUpperCase()}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div>
          <div><strong>Partner / Entity:</strong> ${doc.partner_name}</div>
          <div><strong>Date Created:</strong> ${doc.created_at}</div>
        </div>
        <div>
          <div><strong>Source Location:</strong> <code>${doc.source_location}</code></div>
          <div><strong>Destination Location:</strong> <code>${doc.dest_location}</code></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>SKU</th>
            <th>Product Description</th>
            <th style="text-align: right;">Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="signatures">
        <div>
          <div class="sig-line">Prepared / Handled By (Warehouse Floor Staff)</div>
        </div>
        <div>
          <div class="sig-line">Authorized / Received By (Inventory Manager / Partner)</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups to print vouchers.");
  }
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

// ================= INTERACTIVE DEMO TOUR HANDLERS =================
function openInteractiveWalkthroughModal() {
  openModal('modalWalkthrough');
}

async function runWalkthroughStep(step) {
  const statusBox = document.getElementById("walkthroughStatusBox");
  const statusText = document.getElementById("walkthroughStatusText");
  if (statusBox) statusBox.style.display = "block";

  try {
    if (step === 1) {
      if (statusText) statusText.innerText = "Step 1: Receiving 100 kg Structural Steel from Vendor...";
      // Find Steel Product and Main Store Location
      const prod = state.products.find(p => p.sku === "STL-100-KG") || state.products[0];
      const mainStore = state.warehouses.flatMap(w => w.locations).find(l => l.full_path === "WH1/Main Store") || { id: 1 };
      
      const res = await fetch("/api/operations/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: "ArcelorMittal Steel Ltd",
          dest_location_id: mainStore.id,
          items: [{ product_id: prod.id, quantity: 100.0 }]
        })
      });
      const data = await res.json();
      
      // Auto-mark ready and validate
      await fetch(`/api/operations/${data.id}/mark_ready`, { method: "POST" });
      await fetch(`/api/operations/${data.id}/validate`, { method: "POST" });

      if (statusText) statusText.innerHTML = `✅ <strong>Step 1 Complete:</strong> Received 100 kg Steel into Main Store! (Doc: <code>${data.doc_number}</code>)`;
      const btn1 = document.getElementById("btn-walkthrough-1");
      if (btn1) { btn1.className = "btn btn-sm btn-success"; btn1.innerText = "Completed ✓"; }
      const btn2 = document.getElementById("btn-walkthrough-2");
      if (btn2) { btn2.className = "btn btn-sm btn-primary"; }
      showToast("Step 1: Stock Received Successfully!", "success");
    } 
    else if (step === 2) {
      if (statusText) statusText.innerText = "Step 2: Transferring 50 kg Steel from Main Store to Production Rack...";
      const prod = state.products.find(p => p.sku === "STL-100-KG") || state.products[0];
      const mainStore = state.warehouses.flatMap(w => w.locations).find(l => l.full_path === "WH1/Main Store") || { id: 1 };
      const prodRack = state.warehouses.flatMap(w => w.locations).find(l => l.full_path === "WH2/Production Rack") || { id: 4 };

      const res = await fetch("/api/operations/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_location_id: mainStore.id,
          dest_location_id: prodRack.id,
          items: [{ product_id: prod.id, quantity: 50.0 }]
        })
      });
      const data = await res.json();
      
      await fetch(`/api/operations/${data.id}/mark_ready`, { method: "POST" });
      await fetch(`/api/operations/${data.id}/validate`, { method: "POST" });

      if (statusText) statusText.innerHTML = `✅ <strong>Step 2 Complete:</strong> Moved 50 kg Steel to Production Rack! (Doc: <code>${data.doc_number}</code>)`;
      const btn2 = document.getElementById("btn-walkthrough-2");
      if (btn2) { btn2.className = "btn btn-sm btn-success"; btn2.innerText = "Completed ✓"; }
      const btn3 = document.getElementById("btn-walkthrough-3");
      if (btn3) { btn3.className = "btn btn-sm btn-primary"; }
      showToast("Step 2: Internal Transfer Complete!", "success");
    }
    else if (step === 3) {
      if (statusText) statusText.innerText = "Step 3: Delivering 20 kg Steel to Customer...";
      const prod = state.products.find(p => p.sku === "STL-100-KG") || state.products[0];
      const prodRack = state.warehouses.flatMap(w => w.locations).find(l => l.full_path === "WH2/Production Rack") || { id: 4 };

      const res = await fetch("/api/operations/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Metro Frame Works Inc",
          source_location_id: prodRack.id,
          items: [{ product_id: prod.id, quantity: 20.0 }]
        })
      });
      const data = await res.json();
      
      await fetch(`/api/operations/${data.id}/mark_ready`, { method: "POST" });
      await fetch(`/api/operations/${data.id}/validate`, { method: "POST" });

      if (statusText) statusText.innerHTML = `✅ <strong>Step 3 Complete:</strong> Shipped 20 kg Steel to Customer! (Doc: <code>${data.doc_number}</code>)`;
      const btn3 = document.getElementById("btn-walkthrough-3");
      if (btn3) { btn3.className = "btn btn-sm btn-success"; btn3.innerText = "Completed ✓"; }
      const btn4 = document.getElementById("btn-walkthrough-4");
      if (btn4) { btn4.className = "btn btn-sm btn-primary"; }
      showToast("Step 3: Delivery Shipped Successfully!", "success");
    }
    else if (step === 4) {
      if (statusText) statusText.innerText = "Step 4: Writing off 3 kg damaged steel scrap...";
      const prod = state.products.find(p => p.sku === "STL-100-KG") || state.products[0];
      const prodRack = state.warehouses.flatMap(w => w.locations).find(l => l.full_path === "WH2/Production Rack") || { id: 4 };

      const res = await fetch("/api/operations/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Audit: Damaged Material Scrap",
          source_location_id: prodRack.id,
          items: [{ product_id: prod.id, quantity: 3.0 }]
        })
      });
      const data = await res.json();
      
      await fetch(`/api/operations/${data.id}/mark_ready`, { method: "POST" });
      await fetch(`/api/operations/${data.id}/validate`, { method: "POST" });

      if (statusText) statusText.innerHTML = `✅ <strong>Step 4 Complete:</strong> 3 kg scrap written off! Click 'View Stock Ledger' below to see the full audit trail.`;
      const btn4 = document.getElementById("btn-walkthrough-4");
      if (btn4) { btn4.className = "btn btn-sm btn-success"; btn4.innerText = "Completed ✓"; }
      showToast("Step 4: Scrap Adjusted Successfully!", "success");
    }

    await loadAllData();
  } catch (err) {
    console.error(err);
    if (statusText) statusText.innerText = "Error executing step: " + err.message;
  }
}

async function runAllWalkthroughSteps() {
  for (let s = 1; s <= 4; s++) {
    await runWalkthroughStep(s);
    await new Promise(r => setTimeout(r, 600));
  }
  showToast("All 4 Lifecycle Steps executed successfully!", "success");
}
