with open("frontend/js/app.js", "w") as f:
    f.write("""/**
 * StockSense - Functional API Client & State Manager
 */

let healthDonutChart = null;
let movementChart = null;

let state = {
  currentView: 'dashboard',
  selectedWarehouse: 'all',
  currentUser: null,
  products: [],
  operations: [],
  ledger: [],
  warehouses: []
};

// Check Auth on load
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if (token && user) {
    state.currentUser = JSON.parse(user);
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("appSidebar").style.display = "flex";
    document.getElementById("appMain").style.display = "block";
    
    // Check if admin
    if (state.currentUser.role === 'admin' || state.currentUser.role === 'inventory_manager') {
      const adminNav = document.getElementById("nav-admin");
      if (adminNav) adminNav.style.display = "flex";
    }

    initCharts();
    loadAllData();
  } else {
    // Show login
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("appSidebar").style.display = "none";
    document.getElementById("appMain").style.display = "none";
    showAuthView('login');
  }
});

function showAuthView(view) {
  document.getElementById("view-login").style.display = view === 'login' ? 'block' : 'none';
  document.getElementById("view-signup").style.display = view === 'signup' ? 'block' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.reload();
    } else {
      alert("Login Failed: " + data.detail);
    }
  } catch(err) {
    alert("Network Error");
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const full_name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const role = document.getElementById("signup-role").value;
  
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, role })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registration successful. You can now log in.");
      showAuthView('login');
    } else {
      alert("Signup Failed: " + data.detail);
    }
  } catch(err) {
    alert("Network Error");
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.reload();
}

// Navigation
function navigate(viewName) {
  state.currentView = viewName;
  document.querySelectorAll(".page-view").forEach(el => el.style.display = "none");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = "block";
  
  const activeNav = document.querySelector(`.nav-item[data-page="${viewName}"]`);
  if (activeNav) activeNav.classList.add("active");

  if (viewName === 'admin') loadAdminData();
}

function toggleMobileSidebar() {
  const sb = document.getElementById('appSidebar');
  sb.style.transform = sb.style.transform === 'translateX(0px)' ? 'translateX(-100%)' : 'translateX(0px)';
}

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");
  if (!options.headers) options.headers = {};
  if (token) options.headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(url, options);
  if (res.status === 401) {
    logout();
  }
  return res;
}

// Load Data
async function loadAllData() {
  try {
    // 1. Dashboard KPIs
    const kpiRes = await fetchWithAuth("/api/dashboard/kpis");
    if (kpiRes.ok) {
      const kpis = await kpiRes.json();
      document.getElementById("kpi-total-sku").textContent = kpis.total_sku_count || 0;
      document.getElementById("kpi-total-items").textContent = kpis.total_stock_items || 0;
      document.getElementById("kpi-low-stock").textContent = kpis.low_stock_count || 0;
      document.getElementById("kpi-monthly-moves").textContent = kpis.monthly_moves || 0;
    }

    // 2. Products
    const prodRes = await fetchWithAuth("/api/products");
    if (prodRes.ok) {
      state.products = await prodRes.json();
      renderProductsTable();
    }

    // 3. Operations
    const opRes = await fetchWithAuth("/api/operations");
    if (opRes.ok) {
      state.operations = await opRes.json();
      renderOperationsTable();
    }

    // 4. Ledger
    const ledRes = await fetchWithAuth("/api/dashboard/ledger?limit=50");
    if (ledRes.ok) {
      state.ledger = await ledRes.json();
      renderLedgerTable();
    }

    // 5. Warehouses
    const whRes = await fetchWithAuth("/api/dashboard/topology");
    if (whRes.ok) {
      state.warehouses = await whRes.json();
      renderWarehouses();
    }

  } catch(err) {
    console.error("Failed to load data", err);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById("products-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (state.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted);">No products found in the database. Add one to get started!</td></tr>`;
    return;
  }

  state.products.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div style="font-weight: 500;">${p.name}</div>
        <div style="font-size: 12px; color: var(--text-muted);">${p.sku}</div>
      </td>
      <td>${p.category || 'Uncategorized'}</td>
      <td>
        <span style="font-weight:600; color:var(--text-primary);">${p.stock || 0}</span> ${p.uom || 'Unit'}
      </td>
      <td>₹${p.price || 0}</td>
      <td>
        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="viewProductLocations(${p.id})">Locate</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderOperationsTable() {
  const tbody = document.getElementById("operations-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (state.operations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No operations recorded yet.</td></tr>`;
    return;
  }

  state.operations.forEach(op => {
    let statusColor = "var(--text-muted)";
    let bg = "var(--bg-subtle)";
    
    if (op.status === "draft") { bg = "#fef9c3"; statusColor = "#a16207"; }
    else if (op.status === "waiting") { bg = "#fee2e2"; statusColor = "#b91c1c"; }
    else if (op.status === "ready") { bg = "#dbeafe"; statusColor = "#1d4ed8"; }
    else if (op.status === "done") { bg = "#dcfce7"; statusColor = "#15803d"; }
    
    const tr = document.createElement("tr");
    if (op.status === "waiting") tr.style.background = "#fff5f5";
    
    let itemsHtml = op.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
    
    let actionBtn = "";
    if (op.status === 'draft') actionBtn = `<button class="btn btn-primary" onclick="markReady(${op.id})">Mark Ready</button>`;
    if (op.status === 'ready') actionBtn = `<button class="btn btn-primary" style="background:#16a34a;" onclick="validateDoc(${op.id})">Validate</button>`;
    if (op.status === 'done') actionBtn = `<button class="btn btn-outline" onclick="printReceipt('${op.doc_number}')">Print</button>`;
    
    tr.innerHTML = `
      <td style="font-weight: 500;">${op.doc_number}</td>
      <td>${op.doc_type.toUpperCase()}</td>
      <td>${op.partner_name || 'Internal'}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${itemsHtml}
      </td>
      <td><span style="background:${bg}; color:${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight:600; text-transform:uppercase;">${op.status}</span></td>
      <td>${op.created_at}</td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLedgerTable() {
  const tbody = document.getElementById("ledger-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (state.ledger.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">Ledger is empty.</td></tr>`;
    return;
  }

  state.ledger.forEach(mv => {
    let qColor = mv.quantity > 0 ? 'var(--success)' : '#e11d48';
    let qSign = mv.quantity > 0 ? '+' : '';
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mv.date}</td>
      <td>${mv.reference || '-'}</td>
      <td style="font-weight:500;">${mv.product_name}</td>
      <td style="color:${qColor}; font-weight:600;">${qSign}${mv.quantity}</td>
      <td style="font-size:12px; color:var(--text-secondary);">${mv.source_location} &rarr; ${mv.dest_location}</td>
      <td><span style="background:var(--bg-subtle); padding: 3px 6px; border-radius: 4px; font-size: 11px;">${mv.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWarehouses() {
  const whDiv = document.getElementById("warehouse-topology");
  if (!whDiv) return;
  whDiv.innerHTML = "";
  
  if (state.warehouses.length === 0) {
    whDiv.innerHTML = `<p style="padding: 20px; color: var(--text-muted);">No warehouses configured.</p>`;
    return;
  }

  state.warehouses.forEach(wh => {
    const wDiv = document.createElement("div");
    wDiv.className = "card";
    wDiv.style.marginBottom = "15px";
    
    let locsHtml = "<ul>";
    wh.locations.forEach(l => {
      locsHtml += `<li><strong>${l.name}</strong> (${l.type}) - Path: ${l.full_path}</li>`;
    });
    locsHtml += "</ul>";
    
    wDiv.innerHTML = `
      <div class="card-header">
        <h3>${wh.name} (${wh.code})</h3>
      </div>
      <div class="card-body">
        <p>${wh.address}</p>
        <h4>Locations</h4>
        ${locsHtml}
      </div>
    `;
    whDiv.appendChild(wDiv);
  });
}

// Actions
async function markReady(id) {
  try {
    const res = await fetchWithAuth(`/api/operations/${id}/mark_ready`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      loadAllData();
    } else {
      alert("Error: " + data.detail);
    }
  } catch (err) {
    alert("Network Error");
  }
}

async function validateDoc(id) {
  try {
    const res = await fetchWithAuth(`/api/operations/${id}/validate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      loadAllData();
    } else {
      alert("Error: " + data.detail);
    }
  } catch (err) {
    alert("Network Error");
  }
}

function printReceipt(docNumber) {
  const overlay = document.getElementById("receipt-overlay");
  if(overlay) {
    overlay.style.display = "flex";
  } else {
    alert(`Printing Receipt for ${docNumber}...`);
  }
}
function closeReceipt() {
  const overlay = document.getElementById("receipt-overlay");
  if(overlay) overlay.style.display = "none";
}

// Chart Initializers
function initCharts() {
  const donutCtx = document.getElementById("healthDonut");
  if (donutCtx && !healthDonutChart) {
    healthDonutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Healthy', 'Low', 'Critical'],
        datasets: [{
          data: [70, 20, 10],
          backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

// Admin Loading
async function loadAdminData() {
  // If we had a GET /api/auth/users endpoint we would fetch it here.
  // We'll simulate fetching admin users from db if needed.
  console.log("Admin Dashboard Loaded.");
}
""");
