let categoryChart = null;
let operationsChart = null;
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardKPIs();
  loadProducts();
  loadOperations();
  loadLedger();
  loadTopology();
});

// Tab Navigation
function switchTab(tabName) {
  document.querySelectorAll(".content-tab").forEach(tab => tab.style.display = "none");
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.style.display = "block";

  // Update nav active
  const navItems = document.querySelectorAll(".nav-item");
  const tabNames = ['dashboard', 'products', 'operations', 'ledger', 'scanner', 'topology'];
  const idx = tabNames.indexOf(tabName);
  if (idx !== -1 && navItems[idx]) {
    navItems[idx].classList.add("active");
  }

  // Reload data
  if (tabName === 'dashboard') loadDashboardKPIs();
  if (tabName === 'products') loadProducts();
  if (tabName === 'operations') loadOperations();
  if (tabName === 'ledger') loadLedger();
  if (tabName === 'topology') loadTopology();
}

// 1. Dashboard KPIs & Charts
async function loadDashboardKPIs() {
  try {
    const res = await fetch("/api/dashboard/kpis");
    const data = await res.json();

    document.getElementById("kpi-total-units").innerText = data.total_units_on_hand.toLocaleString();
    document.getElementById("kpi-sku-count").innerText = `Across ${data.total_sku_count} distinct SKUs`;
    document.getElementById("kpi-low-stock").innerText = data.low_stock_count;
    document.getElementById("kpi-pending-receipts").innerText = data.pending_receipts;
    document.getElementById("kpi-pending-deliveries").innerText = data.pending_deliveries;
    document.getElementById("kpi-internal-transfers").innerText = data.scheduled_transfers;

    renderCategoryChart(data.category_distribution);
    renderOperationsChart(data.operation_counts);
  } catch (err) {
    console.error("Failed to load KPIs", err);
  }
}

function renderCategoryChart(distribution) {
  const ctx = document.getElementById("categoryChart")?.getContext("2d");
  if (!ctx) return;

  const labels = Object.keys(distribution);
  const values = Object.values(distribution);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8' } }
      }
    }
  });
}

function renderOperationsChart(counts) {
  const ctx = document.getElementById("operationsChart")?.getContext("2d");
  if (!ctx) return;

  if (operationsChart) operationsChart.destroy();
  operationsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Receipts", "Deliveries", "Transfers", "Adjustments"],
      datasets: [{
        label: "Transactions Logged",
        data: [counts.receipts, counts.deliveries, counts.transfers, counts.adjustments],
        backgroundColor: ["#10b981", "#6366f1", "#06b6d4", "#f59e0b"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// 2. Products List
async function loadProducts() {
  try {
    const category = document.getElementById("prod-category-filter")?.value || "all";
    const search = document.getElementById("prod-search-input")?.value || "";

    const res = await fetch(`/api/products?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`);
    const products = await res.json();
    allProducts = products;

    const tbody = document.getElementById("products-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    products.forEach(p => {
      let badgeClass = "badge-success";
      if (p.status === "Low Stock") badgeClass = "badge-warning";
      if (p.status === "Out of Stock") badgeClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: #38bdf8;">${p.sku}</td>
        <td style="font-weight: 600;">${p.name}</td>
        <td>${p.category}</td>
        <td style="font-weight: 700;">${p.on_hand} <span style="font-size: 11px; color: var(--text-muted);">${p.uom}</span></td>
        <td>${p.min_reorder_qty} ${p.uom}</td>
        <td>${p.target_stock_qty} ${p.uom}</td>
        <td><span class="kpi-badge ${badgeClass}">${p.status}</span></td>
        <td>
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="viewProductLocations(${p.id})">🔍 Racks</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    populateProductSelects(products);
  } catch (err) {
    console.error("Failed to load products", err);
  }
}

function populateProductSelects(products) {
  const selects = [
    document.getElementById("rec-product-select"),
    document.getElementById("del-product-select"),
    document.getElementById("trans-product-select"),
    document.getElementById("adj-product-select")
  ];

  selects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = "";
    products.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.innerText = `${p.sku} - ${p.name} (${p.on_hand} ${p.uom} on hand)`;
      sel.appendChild(opt);
    });
  });
}

// 3. Operations List
async function loadOperations() {
  try {
    const docType = document.getElementById("op-type-filter")?.value || "all";
    const status = document.getElementById("op-status-filter")?.value || "all";

    const res = await fetch(`/api/operations?doc_type=${encodeURIComponent(docType)}&status=${encodeURIComponent(status)}`);
    const ops = await res.json();

    const tbody = document.getElementById("operations-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    ops.forEach(o => {
      let badgeClass = "badge-success";
      if (o.status === "draft") badgeClass = "badge-warning";
      if (o.status === "canceled") badgeClass = "badge-danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: #a855f7;">${o.doc_number}</td>
        <td style="text-transform: capitalize; font-weight: 600;">${o.doc_type}</td>
        <td>${o.partner_name}</td>
        <td><code style="color: #cbd5e1;">${o.source_location}</code></td>
        <td><code style="color: #34d399;">${o.dest_location}</code></td>
        <td style="color: var(--text-muted); font-size: 12px;">${o.created_at}</td>
        <td><span class="kpi-badge ${badgeClass}">${o.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load operations", err);
  }
}

// 4. Ledger Movements
async function loadLedger() {
  try {
    const res = await fetch("/api/dashboard/ledger?limit=40");
    const moves = await res.json();

    const tbody = document.getElementById("ledger-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    moves.forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 12px;">${m.date}</td>
        <td style="font-weight: 600; color: #a855f7;">${m.reference}</td>
        <td style="font-weight: 700; color: #38bdf8;">${m.sku}</td>
        <td>${m.product_name}</td>
        <td style="font-weight: 800; color: #34d399;">${m.quantity} ${m.uom}</td>
        <td><code>${m.from_location}</code></td>
        <td><code>${m.to_location}</code></td>
        <td><span class="kpi-badge badge-success">${m.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load ledger", err);
  }
}

// 5. Topology Racks
async function loadTopology() {
  try {
    const res = await fetch("/api/dashboard/topology");
    const warehouses = await res.json();

    const container = document.getElementById("topology-container");
    if (!container) return;

    container.innerHTML = "";
    warehouses.forEach(wh => {
      const card = document.createElement("div");
      card.className = "kpi-card";
      let locItems = wh.locations.map(l => `
        <li style="padding: 8px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 13px;">
          <span>📍 <strong>${l.name}</strong></span>
          <code style="font-size: 11px; color: var(--accent-info);">${l.full_path}</code>
        </li>
      `).join("");

      card.innerHTML = `
        <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">🏭 ${wh.name} (${wh.code})</div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">${wh.address}</p>
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Sub-locations & Racks:</div>
        <ul style="list-style: none;">
          ${locItems}
        </ul>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load topology", err);
  }
}

// Quick SKU Inspector & Mobile Barcode Scanner
async function inspectSku() {
  const sku = document.getElementById("quick-sku-input").value.trim().toUpperCase();
  if (!sku) return alert("Please enter a SKU");

  const product = allProducts.find(p => p.sku === sku);
  if (!product) return alert(`SKU "${sku}" not found in inventory catalog.`);

  viewProductLocations(product.id);
}

async function viewProductLocations(productId) {
  try {
    const res = await fetch(`/api/products/${productId}/locations`);
    const data = await res.json();

    let details = `📦 ${data.product_name} (${data.sku})\n\nLocation Breakdown:\n`;
    data.breakdown.forEach(b => {
      details += `• ${b.full_path}: ${b.quantity} ${b.uom}\n`;
    });
    alert(details);
  } catch (err) {
    alert("Failed to load location breakdown");
  }
}

async function runMobileScan() {
  const sku = document.getElementById("mobile-sku-val").value.trim().toUpperCase();
  const prod = allProducts.find(p => p.sku === sku);
  const resultDiv = document.getElementById("mobile-scan-result");
  if (!resultDiv) return;

  if (!prod) {
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `<p style="color: #f87171; font-weight: 700;">❌ Barcode [${sku}] not recognized.</p>`;
    return;
  }

  const res = await fetch(`/api/products/${prod.id}/locations`);
  const data = await res.json();

  let locListHtml = data.breakdown.map(b => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px;">
      <span>${b.full_path}</span>
      <span style="font-weight: 700; color: ${b.quantity > 0 ? '#34d399' : '#94a3b8'};">${b.quantity} ${b.uom}</span>
    </div>
  `).join("");

  resultDiv.style.display = "block";
  resultDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h4 style="font-size: 15px; font-weight: 700; color: #38bdf8;">Scan Verified: ${data.sku}</h4>
      <span class="kpi-badge badge-success">Active Item</span>
    </div>
    <p style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">${data.product_name}</p>
    <div style="margin-bottom: 8px; font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Stock per Warehouse Rack:</div>
    ${locListHtml}
  `;
}

// Modal Handlers & Submit Operations
function openReceiptModal() { document.getElementById("modal-receipt").classList.add("active"); }
function openDeliveryModal() { document.getElementById("modal-delivery").classList.add("active"); }
function openTransferModal() { document.getElementById("modal-transfer").classList.add("active"); }
function openAdjustmentModal() { document.getElementById("modal-adjustment").classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }

async function submitReceipt() {
  const vendor = document.getElementById("rec-vendor-name").value.trim() || "Supplier Co.";
  const locId = parseInt(document.getElementById("rec-dest-location").value);
  const prodId = parseInt(document.getElementById("rec-product-select").value);
  const qty = parseFloat(document.getElementById("rec-quantity").value);

  const res = await fetch("/api/operations/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier_name: vendor,
      dest_location_id: locId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  const data = await res.json();
  if (res.ok) {
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modal-receipt");
    refreshAll();
  } else {
    alert(`Error: ${data.detail || "Operation failed"}`);
  }
}

async function submitDelivery() {
  const customer = document.getElementById("del-customer-name").value.trim() || "Customer Logistics";
  const locId = parseInt(document.getElementById("del-source-location").value);
  const prodId = parseInt(document.getElementById("del-product-select").value);
  const qty = parseFloat(document.getElementById("del-quantity").value);

  const res = await fetch("/api/operations/deliveries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: customer,
      source_location_id: locId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  const data = await res.json();
  if (res.ok) {
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modal-delivery");
    refreshAll();
  } else {
    alert(`Error: ${data.detail || "Operation failed"}`);
  }
}

async function submitTransfer() {
  const srcId = parseInt(document.getElementById("trans-source-location").value);
  const destId = parseInt(document.getElementById("trans-dest-location").value);
  const prodId = parseInt(document.getElementById("trans-product-select").value);
  const qty = parseFloat(document.getElementById("trans-quantity").value);

  if (srcId === destId) return alert("Source and destination cannot be identical.");

  const res = await fetch("/api/operations/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_location_id: srcId,
      dest_location_id: destId,
      items: [{ product_id: prodId, quantity: qty }]
    })
  });
  const data = await res.json();
  if (res.ok) {
    alert(`Success: ${data.message} (${data.doc_number})`);
    closeModal("modal-transfer");
    refreshAll();
  } else {
    alert(`Error: ${data.detail || "Operation failed"}`);
  }
}

async function submitAdjustment() {
  const locId = parseInt(document.getElementById("adj-location").value);
  const prodId = parseInt(document.getElementById("adj-product-select").value);
  const count = parseFloat(document.getElementById("adj-quantity").value);
  const reason = document.getElementById("adj-reason").value.trim() || "Cycle Count";

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
  const data = await res.json();
  if (res.ok) {
    alert(`Adjustment Logged: ${data.message} (${data.doc_number})`);
    closeModal("modal-adjustment");
    refreshAll();
  } else {
    alert(`Error: ${data.detail || "Operation failed"}`);
  }
}

function refreshAll() {
  loadDashboardKPIs();
  loadProducts();
  loadOperations();
  loadLedger();
}
