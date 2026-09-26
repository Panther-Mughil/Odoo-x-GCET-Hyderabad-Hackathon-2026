/**
 * StockSense - Clean, Modern, Simple Inventory Management System UI
 * "Know your stock. Move it smarter."
 */

// ==========================================================================
// 1. Initial State & Realistic Demo Data
// ==========================================================================

const INITIAL_DATA = {
  products: [
    {
      id: 'prod-1',
      name: 'Wireless Mouse',
      sku: 'WM-1042',
      category: 'Accessories',
      stock: 12,
      minStock: 50,
      price: 899,
      warehouse: 'Main Warehouse',
      location: 'Rack A',
      status: 'Low',
      description: 'Ergonomic 2.4GHz wireless optical mouse with USB nano receiver.',
      reserved: 5
    },
    {
      id: 'prod-2',
      name: 'Mechanical Keyboard',
      sku: 'KB-2011',
      category: 'Accessories',
      stock: 8,
      minStock: 30,
      price: 2499,
      warehouse: 'Main Warehouse',
      location: 'Rack B',
      status: 'Low',
      description: 'Tenkeyless RGB mechanical keyboard with tactile brown switches.',
      reserved: 2
    },
    {
      id: 'prod-3',
      name: 'USB-C Hub',
      sku: 'UH-3320',
      category: 'Electronics',
      stock: 3,
      minStock: 20,
      price: 1499,
      warehouse: 'Main Warehouse',
      location: 'Rack C',
      status: 'Critical',
      description: '7-in-1 USB-C multiport adapter with 4K HDMI, PD 100W, and SD card reader.',
      reserved: 0
    },
    {
      id: 'prod-4',
      name: 'HDMI Cable (2m)',
      sku: 'HD-4401',
      category: 'Cables',
      stock: 85,
      minStock: 25,
      price: 499,
      warehouse: 'Production Store',
      location: 'Bin 1',
      status: 'In Stock',
      description: 'High speed 4K 60Hz braided HDMI 2.0 cable with gold plated connectors.',
      reserved: 10
    },
    {
      id: 'prod-5',
      name: 'Laptop Stand',
      sku: 'LS-5502',
      category: 'Office',
      stock: 19,
      minStock: 15,
      price: 1899,
      warehouse: 'Dispatch Center',
      location: 'Staging Bay',
      status: 'In Stock',
      description: 'Adjustable aluminum ergonomic laptop riser for 10-16 inch notebooks.',
      reserved: 4
    },
    {
      id: 'prod-6',
      name: 'Ethernet Cable (5m)',
      sku: 'ET-6603',
      category: 'Cables',
      stock: 120,
      minStock: 40,
      price: 299,
      warehouse: 'Main Warehouse',
      location: 'Rack D',
      status: 'In Stock',
      description: 'Cat6 UTP snagless Gigabit RJ45 network patch cable.',
      reserved: 15
    }
  ],
  receipts: [
    {
      id: 'REC-1001',
      vendor: 'TechSource',
      items: 5,
      productName: 'Wireless Mouse & Peripherals',
      quantity: 100,
      destination: 'Main Warehouse / Rack A',
      date: 'Today, 10:15 AM',
      status: 'Completed'
    },
    {
      id: 'REC-1002',
      vendor: 'Metro Supplies',
      items: 3,
      productName: 'Cat6 Cables & Hubs',
      quantity: 50,
      destination: 'Production Store / Bin 1',
      date: 'Yesterday, 04:30 PM',
      status: 'Pending'
    },
    {
      id: 'REC-1003',
      vendor: 'Nova Components',
      items: 2,
      productName: 'Mechanical Keyboards',
      quantity: 40,
      destination: 'Main Warehouse / Rack B',
      date: '24 Sep 2026',
      status: 'Completed'
    }
  ],
  deliveries: [
    {
      id: 'DEL-1001',
      customer: 'ABC Electronics',
      items: 3,
      productName: 'Wireless Mouse (WM-1042)',
      quantity: 20,
      source: 'Main Warehouse / Rack A',
      status: 'Ready',
      workflowStep: 'Pick' // Pick -> Pack -> Complete
    },
    {
      id: 'DEL-1002',
      customer: 'XYZ Store',
      items: 5,
      productName: 'Keyboards & Cables',
      quantity: 35,
      source: 'Main Warehouse / Rack B',
      status: 'Picking',
      workflowStep: 'Pack'
    },
    {
      id: 'DEL-1003',
      customer: 'Apex Retailers',
      items: 2,
      productName: 'Laptop Stands',
      quantity: 15,
      source: 'Dispatch Center / Staging Bay',
      status: 'Packed',
      workflowStep: 'Complete'
    }
  ],
  transfers: [
    {
      id: 'TRF-501',
      productName: 'Mechanical Keyboard',
      from: 'Main Warehouse / Rack A',
      to: 'Main Warehouse / Rack B',
      quantity: 20,
      timestamp: '25 min ago',
      status: 'Completed'
    },
    {
      id: 'TRF-500',
      productName: 'HDMI Cable',
      from: 'Production Store / Bin 1',
      to: 'Dispatch Center / Staging Bay',
      quantity: 15,
      timestamp: '3 hours ago',
      status: 'Completed'
    }
  ],
  history: [
    {
      id: 'MOV-1026',
      product: 'Wireless Mouse',
      type: 'Receipt',
      from: 'Vendor (TechSource)',
      to: 'Main Warehouse / Rack A',
      quantity: '+50',
      date: '10 min ago'
    },
    {
      id: 'MOV-1025',
      product: 'Mechanical Keyboard',
      type: 'Transfer',
      from: 'Main Warehouse / Rack A',
      to: 'Main Warehouse / Rack B',
      quantity: '20',
      date: '25 min ago'
    },
    {
      id: 'MOV-1024',
      product: 'Wireless Mouse',
      type: 'Delivery',
      from: 'Main Warehouse / Rack A',
      to: 'Customer (Order #DEL-1042)',
      quantity: '-15',
      date: '1 hour ago'
    },
    {
      id: 'MOV-1023',
      product: 'HDMI Cable',
      type: 'Receipt',
      from: 'Vendor (Nova Components)',
      to: 'Production Store / Bin 1',
      quantity: '+100',
      date: '3 hours ago'
    }
  ],
  activities: [
    {
      type: 'green',
      text: 'Received 50 Wireless Mouse',
      meta: 'Main Warehouse • 10 min ago'
    },
    {
      type: 'blue',
      text: 'Transferred 20 Keyboards',
      meta: 'Rack A → Rack B • 25 min ago'
    },
    {
      type: 'orange',
      text: 'Delivery created',
      meta: 'Order #DEL-1042 • 1 hour ago'
    }
  ]
};

// ==========================================================================
// 2. State Controller with LocalStorage Persistence
// ==========================================================================

class StockSenseStore {
  constructor() {
    this.STORAGE_KEY = 'stocksense_data_v1';
    this.data = this.loadData();
    this.activeTimeframe = '7d'; // 'today', '7d', '30d'
    this.chartInstance = null;
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage error, using defaults', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  resetData() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
  }

  getProducts() { return this.data.products; }
  getReceipts() { return this.data.receipts; }
  getDeliveries() { return this.data.deliveries; }
  getTransfers() { return this.data.transfers; }
  getHistory() { return this.data.history; }
  getActivities() { return this.data.activities; }

  // Recalculate status of product
  updateProductStatus(prod) {
    if (prod.stock <= 0) {
      prod.status = 'Out of Stock';
    } else if (prod.stock <= prod.minStock * 0.25) {
      prod.status = 'Critical';
    } else if (prod.stock <= prod.minStock) {
      prod.status = 'Low';
    } else {
      prod.status = 'In Stock';
    }
  }

  // Stock operations
  receiveStock(productSku, quantity, vendor, destination) {
    const qty = parseInt(quantity, 10);
    const prod = this.data.products.find(p => p.sku === productSku);
    if (!prod) return false;

    prod.stock += qty;
    this.updateProductStatus(prod);

    // Add Receipt record
    const recId = 'REC-' + Math.floor(1000 + Math.random() * 9000);
    this.data.receipts.unshift({
      id: recId,
      vendor: vendor || 'TechSource',
      items: 1,
      productName: prod.name,
      quantity: qty,
      destination: destination || prod.warehouse + ' / ' + prod.location,
      date: 'Just now',
      status: 'Completed'
    });

    // Add History
    this.data.history.unshift({
      id: 'MOV-' + Math.floor(1000 + Math.random() * 9000),
      product: prod.name,
      type: 'Receipt',
      from: `Vendor (${vendor || 'TechSource'})`,
      to: destination || `${prod.warehouse} / ${prod.location}`,
      quantity: `+${qty}`,
      date: 'Just now'
    });

    // Add Activity
    this.data.activities.unshift({
      type: 'green',
      text: `Received ${qty} ${prod.name}`,
      meta: `${destination || prod.warehouse} • Just now`
    });

    this.saveData();
    return true;
  }

  transferStock(productSku, quantity, fromLoc, toLoc) {
    const qty = parseInt(quantity, 10);
    const prod = this.data.products.find(p => p.sku === productSku);
    if (!prod) return false;

    // Log Transfer
    const trfId = 'TRF-' + Math.floor(500 + Math.random() * 500);
    this.data.transfers.unshift({
      id: trfId,
      productName: prod.name,
      from: fromLoc,
      to: toLoc,
      quantity: qty,
      timestamp: 'Just now',
      status: 'Completed'
    });

    // Add History
    this.data.history.unshift({
      id: 'MOV-' + Math.floor(1000 + Math.random() * 9000),
      product: prod.name,
      type: 'Transfer',
      from: fromLoc,
      to: toLoc,
      quantity: `${qty}`,
      date: 'Just now'
    });

    // Add Activity
    this.data.activities.unshift({
      type: 'blue',
      text: `Transferred ${qty} ${prod.name}`,
      meta: `${fromLoc} → ${toLoc} • Just now`
    });

    this.saveData();
    return true;
  }

  createDelivery(customer, productSku, quantity, source) {
    const qty = parseInt(quantity, 10);
    const prod = this.data.products.find(p => p.sku === productSku);
    if (!prod) return false;

    const delId = 'DEL-' + Math.floor(1000 + Math.random() * 9000);
    this.data.deliveries.unshift({
      id: delId,
      customer: customer || 'Customer',
      items: 1,
      productName: prod.name,
      quantity: qty,
      source: source || `${prod.warehouse} / ${prod.location}`,
      status: 'Ready',
      workflowStep: 'Pick'
    });

    // Add Activity
    this.data.activities.unshift({
      type: 'orange',
      text: `Delivery created`,
      meta: `Order #${delId} • Just now`
    });

    this.saveData();
    return delId;
  }

  advanceDeliveryWorkflow(deliveryId) {
    const del = this.data.deliveries.find(d => d.id === deliveryId);
    if (!del) return null;

    if (del.workflowStep === 'Pick') {
      del.workflowStep = 'Pack';
      del.status = 'Picking';
    } else if (del.workflowStep === 'Pack') {
      del.workflowStep = 'Complete';
      del.status = 'Packed';
    } else if (del.workflowStep === 'Complete') {
      del.status = 'Completed';

      // Deduct stock upon final completion!
      const prod = this.data.products.find(p => del.productName.includes(p.name));
      if (prod) {
        prod.stock = Math.max(0, prod.stock - del.quantity);
        this.updateProductStatus(prod);
      }

      // Add History
      this.data.history.unshift({
        id: 'MOV-' + Math.floor(1000 + Math.random() * 9000),
        product: del.productName,
        type: 'Delivery',
        from: del.source,
        to: `Customer (${del.customer})`,
        quantity: `-${del.quantity}`,
        date: 'Just now'
      });

      // Add Activity
      this.data.activities.unshift({
        type: 'orange',
        text: `Dispatched order #${del.id}`,
        meta: `${del.customer} • Just now`
      });
    }

    this.saveData();
    return del;
  }

  addProduct(productObj) {
    const id = 'prod-' + (this.data.products.length + 1);
    const prod = {
      id,
      name: productObj.name,
      sku: productObj.sku.toUpperCase(),
      category: productObj.category || 'Accessories',
      stock: parseInt(productObj.stock, 10) || 0,
      minStock: parseInt(productObj.minStock, 10) || 20,
      price: parseInt(productObj.price, 10) || 499,
      warehouse: productObj.warehouse || 'Main Warehouse',
      location: productObj.location || 'Rack A',
      status: 'In Stock',
      description: productObj.description || 'Quality inventory item.',
      reserved: 0
    };
    this.updateProductStatus(prod);
    this.data.products.unshift(prod);

    this.data.activities.unshift({
      type: 'green',
      text: `Added new product ${prod.name}`,
      meta: `${prod.sku} • Just now`
    });

    this.saveData();
    return prod;
  }
}

// Global Store Instance
const store = new StockSenseStore();

// ==========================================================================
// 3. UI Navigation & Page Controller
// ==========================================================================

let activePage = 'dashboard';

function navigate(pageId) {
  activePage = pageId;
  if (window.location.hash !== '#' + pageId) {
    history.replaceState(null, null, '#' + pageId);
  }

  // Update sidebar active classes
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-page') === pageId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Update mobile bottom nav active classes
  document.querySelectorAll('.mobile-nav-item').forEach(el => {
    if (el.getAttribute('data-page') === pageId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Toggle pages visibility
  document.querySelectorAll('.page-view').forEach(el => {
    el.style.display = 'none';
  });

  const targetView = document.getElementById(`view-${pageId}`);
  if (targetView) {
    targetView.style.display = 'block';
  }

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Render content for this page
  renderActivePage(pageId);
}

function renderActivePage(pageId) {
  switch (pageId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'products':
      renderProductsTable();
      break;
    case 'receipts':
      renderReceiptsTable();
      break;
    case 'deliveries':
      renderDeliveriesTable();
      break;
    case 'transfers':
      renderTransfersPage();
      break;
    case 'stock':
      renderStockPage();
      break;
    case 'history':
      renderHistoryPage();
      break;
    case 'settings':
      renderSettingsPage();
      break;
  }
}

// Mobile sidebar drawer
function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  sidebar.classList.toggle('open');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// ==========================================================================
// 4. Page: Dashboard Rendering
// ==========================================================================

function renderDashboard() {
  const products = store.getProducts();

  // 1. Calculate KPI cards
  const totalStockCount = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  // Set card values (with clean formatting as requested)
  // Total Products: 1,248 (demo base + local items)
  const elTotProd = document.getElementById('kpiTotalProducts');
  if (elTotProd) elTotProd.textContent = (1248 + (products.length - 6)).toLocaleString();

  // Total Stock: 24,892 + diff
  const elTotStock = document.getElementById('kpiTotalStock');
  if (elTotStock) elTotStock.textContent = (24892 + (totalStockCount - 247)).toLocaleString();

  // Low Stock: 37 + diff
  const elLowStock = document.getElementById('kpiLowStock');
  if (elLowStock) elLowStock.textContent = (37 + (lowStockCount - 2)).toString();

  // Out of Stock: 8 + diff
  const elOutStock = document.getElementById('kpiOutStock');
  if (elOutStock) elOutStock.textContent = (8 + (outOfStockCount - 0)).toString();

  // 2. Render Smart Stock Alert Banner
  const mouseProd = products.find(p => p.sku === 'WM-1042') || products[0];
  const alertBanner = document.getElementById('smartStockAlert');
  if (alertBanner && mouseProd) {
    if (mouseProd.stock < mouseProd.minStock) {
      alertBanner.style.display = 'flex';
      const nameEl = document.getElementById('alertProdName');
      const stockEl = document.getElementById('alertProdStock');
      const minEl = document.getElementById('alertProdMin');
      if (nameEl) nameEl.textContent = mouseProd.name;
      if (stockEl) stockEl.textContent = mouseProd.stock;
      if (minEl) minEl.textContent = mouseProd.minStock;
    } else {
      alertBanner.style.display = 'none';
    }
  }

  // 3. Render Stock Movement Chart
  renderStockMovementChart(store.activeTimeframe);

  // 4. Render Low Stock Items Table
  renderLowStockTable();

  // 5. Render Recent Activity List
  renderActivityList();
}

// Chart rendering
function setChartTimeframe(tf) {
  store.activeTimeframe = tf;
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tf') === tf);
  });
  renderStockMovementChart(tf);
}

function renderStockMovementChart(timeframe) {
  const canvas = document.getElementById('stockMovementChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Chart datasets based on timeframe
  let labels = [];
  let incoming = [];
  let outgoing = [];

  if (timeframe === 'today') {
    labels = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    incoming = [40, 65, 30, 95, 20, 50];
    outgoing = [20, 35, 45, 60, 40, 25];
  } else if (timeframe === '7d') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    incoming = [120, 180, 90, 240, 160, 110, 140];
    outgoing = [90, 140, 110, 190, 130, 85, 105];
  } else { // 30d
    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    incoming = [780, 920, 650, 1100];
    outgoing = [620, 810, 740, 890];
  }

  if (store.chartInstance) {
    store.chartInstance.destroy();
  }

  if (window.Chart) {
    store.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Incoming',
            data: incoming,
            backgroundColor: '#2563eb', // Blue Primary
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Outgoing',
            data: outgoing,
            backgroundColor: '#94a3b8', // Clean slate gray
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 12, weight: '500' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 6,
            titleFont: { family: 'Inter', size: 12, weight: '600' },
            bodyFont: { family: 'Inter', size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' },
            border: { dash: [4, 4] }
          }
        }
      }
    });
  }
}

// Low Stock Items Table on Dashboard
function renderLowStockTable() {
  const tbody = document.getElementById('lowStockTableBody');
  if (!tbody) return;

  const lowItems = store.getProducts().filter(p => p.stock <= p.minStock);

  if (lowItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">All inventory items are at healthy levels.</td></tr>`;
    return;
  }

  tbody.innerHTML = lowItems.slice(0, 4).map(item => {
    let badgeClass = 'badge-warning';
    let badgeText = 'Low';
    if (item.stock === 0) {
      badgeClass = 'badge-danger';
      badgeText = 'Critical';
    } else if (item.stock <= item.minStock * 0.25) {
      badgeClass = 'badge-danger';
      badgeText = 'Critical';
    }

    return `
      <tr>
        <td class="font-medium">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${getProductIcon(item.category)}</span>
            <span>${item.name}</span>
          </div>
        </td>
        <td><span class="sku-badge">${item.sku}</span></td>
        <td class="text-right font-semibold">${item.stock}</td>
        <td class="text-right text-muted">${item.minStock}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="text-right">
          <button class="btn btn-sm btn-outline-primary" onclick="openReorderModal('${item.sku}')">
            Reorder
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Recent Activity List
function renderActivityList() {
  const container = document.getElementById('dashboardActivityList');
  if (!container) return;

  const activities = store.getActivities();
  container.innerHTML = activities.slice(0, 5).map(act => {
    let dotClass = 'dot-green';
    if (act.type === 'blue') dotClass = 'dot-blue';
    if (act.type === 'orange') dotClass = 'dot-orange';
    if (act.type === 'red') dotClass = 'dot-red';

    return `
      <div class="activity-item">
        <div class="activity-dot ${dotClass}"></div>
        <div class="activity-content">
          <div class="activity-title">${act.text}</div>
          <div class="activity-meta">${act.meta}</div>
        </div>
      </div>
    `;
  }).join('');
}

function getProductIcon(category) {
  switch (category) {
    case 'Accessories':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); vertical-align: middle;"><rect x="5" y="2" width="14" height="20" rx="7"></rect><path d="M12 6v4"></path></svg>`;
    case 'Electronics':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1; vertical-align: middle;"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"></path></svg>`;
    case 'Cables':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0ea5e9; vertical-align: middle;"><path d="M12 22v-5"></path><path d="M9 8V2"></path><path d="M15 8V2"></path><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path></svg>`;
    case 'Office':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #8b5cf6; vertical-align: middle;"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path></svg>`;
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); vertical-align: middle;"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>`;
  }
}

// ==========================================================================
// 5. Page: Products Table & Details
// ==========================================================================

let productSearchQuery = '';
let productStatusFilter = 'all';

function setProductStatusFilter(status) {
  productStatusFilter = status;
  document.querySelectorAll('#productFilterTabs .filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-status') === status);
  });
  renderProductsTable();
}

function filterProducts(query) {
  productSearchQuery = query.toLowerCase();
  renderProductsTable();
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  let products = store.getProducts();

  // Search filter
  if (productSearchQuery) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(productSearchQuery) ||
      p.sku.toLowerCase().includes(productSearchQuery) ||
      p.category.toLowerCase().includes(productSearchQuery)
    );
  }

  // Status tab filter
  if (productStatusFilter === 'in-stock') {
    products = products.filter(p => p.stock > p.minStock);
  } else if (productStatusFilter === 'low-stock') {
    products = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  } else if (productStatusFilter === 'out-of-stock') {
    products = products.filter(p => p.stock === 0);
  }

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No products match your filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(prod => {
    let badgeClass = 'badge-in-stock';
    let badgeText = 'In Stock';
    if (prod.stock === 0) {
      badgeClass = 'badge-out-of-stock';
      badgeText = 'Out of Stock';
    } else if (prod.stock <= prod.minStock) {
      badgeClass = 'badge-low-stock';
      badgeText = 'Low Stock';
    }

    return `
      <tr style="cursor: pointer;" onclick="openProductDetailsModal('${prod.sku}')">
        <td class="font-medium">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">${getProductIcon(prod.category)}</span>
            <div>
              <div style="font-weight: 600; color: var(--text-primary);">${prod.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${prod.warehouse}</div>
            </div>
          </div>
        </td>
        <td><span class="sku-badge">${prod.sku}</span></td>
        <td>${prod.category}</td>
        <td class="font-medium">₹${prod.price.toLocaleString('en-IN')}</td>
        <td class="text-right font-bold" style="font-size: 0.95rem;">${prod.stock}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="text-right" onclick="event.stopPropagation();">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-sm btn-secondary" onclick="openProductDetailsModal('${prod.sku}')">
              View
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="openTransferWithProduct('${prod.sku}')" title="Transfer">
              Transfer
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openProductDetailsModal(sku) {
  const prod = store.getProducts().find(p => p.sku === sku);
  if (!prod) return;

  const modal = document.getElementById('productDetailsModal');
  if (!modal) return;

  document.getElementById('modalProdName').textContent = prod.name;
  document.getElementById('modalProdSku').textContent = prod.sku;
  document.getElementById('modalProdCategory').textContent = prod.category;
  document.getElementById('modalProdPrice').textContent = `₹${prod.price.toLocaleString('en-IN')}`;
  document.getElementById('modalProdStock').textContent = prod.stock;
  document.getElementById('modalProdMin').textContent = prod.minStock;
  document.getElementById('modalProdLocation').textContent = `${prod.warehouse} / ${prod.location}`;
  document.getElementById('modalProdDesc').textContent = prod.description;

  const statusBadge = document.getElementById('modalProdStatus');
  if (statusBadge) {
    if (prod.stock === 0) {
      statusBadge.className = 'badge badge-out-of-stock';
      statusBadge.textContent = 'Out of Stock';
    } else if (prod.stock <= prod.minStock) {
      statusBadge.className = 'badge badge-low-stock';
      statusBadge.textContent = 'Low Stock';
    } else {
      statusBadge.className = 'badge badge-in-stock';
      statusBadge.textContent = 'In Stock';
    }
  }

  // Quick actions setup
  const btnReceive = document.getElementById('modalBtnReceive');
  if (btnReceive) {
    btnReceive.onclick = () => {
      closeModal('productDetailsModal');
      openReceiptModalWithProduct(prod.sku);
    };
  }

  const btnTransfer = document.getElementById('modalBtnTransfer');
  if (btnTransfer) {
    btnTransfer.onclick = () => {
      closeModal('productDetailsModal');
      openTransferWithProduct(prod.sku);
    };
  }

  openModal('productDetailsModal');
}

// Add Product form handler
function handleAddProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('addProdName').value.trim();
  const sku = document.getElementById('addProdSku').value.trim();
  const category = document.getElementById('addProdCategory').value;
  const stock = parseInt(document.getElementById('addProdStock').value, 10);
  const minStock = parseInt(document.getElementById('addProdMinStock').value, 10);
  const price = parseInt(document.getElementById('addProdPrice').value, 10);
  const warehouse = document.getElementById('addProdWarehouse').value;
  const location = document.getElementById('addProdLocation').value;

  if (!name || !sku) {
    alert('Please enter product name and SKU.');
    return;
  }

  store.addProduct({ name, sku, category, stock, minStock, price, warehouse, location });
  closeModal('addProductModal');
  e.target.reset();
  showToast(`Product "${name}" added successfully!`, 'success');
  renderProductsTable();
  renderDashboard();
}

// ==========================================================================
// 6. Page: Receipts (Inward Stock) & 3-Step Wizard
// ==========================================================================

let receiptStep = 1;
let receiptWizardData = {
  vendor: 'TechSource',
  warehouse: 'Main Warehouse / Rack A',
  poNumber: 'PO-8921',
  productSku: 'WM-1042',
  quantity: 50,
  unitCost: 650
};

function renderReceiptsTable() {
  const tbody = document.getElementById('receiptsTableBody');
  if (!tbody) return;

  const receipts = store.getReceipts();
  tbody.innerHTML = receipts.map(rec => {
    let badgeClass = rec.status === 'Completed' ? 'badge-completed' : 'badge-pending';
    return `
      <tr>
        <td class="font-semibold" style="color: var(--primary);">${rec.id}</td>
        <td class="font-medium">${rec.vendor}</td>
        <td>${rec.items} items <span class="text-muted">(${rec.productName})</span></td>
        <td class="text-right font-bold">${rec.quantity}</td>
        <td><span class="badge ${badgeClass}">${rec.status}</span></td>
        <td class="text-right">
          <button class="btn btn-sm btn-secondary" onclick="showReceiptDetails('${rec.id}')">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openNewReceiptModal() {
  receiptStep = 1;
  updateReceiptStepUI();
  openModal('newReceiptModal');
}

function openReceiptModalWithProduct(sku) {
  receiptStep = 2; // Jump directly to products step
  receiptWizardData.productSku = sku;
  const prodSelect = document.getElementById('recWizardProduct');
  if (prodSelect) prodSelect.value = sku;
  updateReceiptStepUI();
  openModal('newReceiptModal');
}

function openReorderModal(sku) {
  openReceiptModalWithProduct(sku);
}

function updateReceiptStepUI() {
  // Stepper circle state
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`recStepIndicator${i}`);
    if (stepEl) {
      stepEl.classList.remove('active', 'completed');
      if (i === receiptStep) stepEl.classList.add('active');
      else if (i < receiptStep) stepEl.classList.add('completed');
    }
    const pane = document.getElementById(`recStepPane${i}`);
    if (pane) pane.style.display = i === receiptStep ? 'block' : 'none';
  }

  // Footer buttons
  const btnBack = document.getElementById('recBtnBack');
  const btnNext = document.getElementById('recBtnNext');
  const btnConfirm = document.getElementById('recBtnConfirm');

  if (btnBack) btnBack.style.display = receiptStep > 1 ? 'inline-flex' : 'none';
  if (btnNext) btnNext.style.display = receiptStep < 3 ? 'inline-flex' : 'none';
  if (btnConfirm) btnConfirm.style.display = receiptStep === 3 ? 'inline-flex' : 'none';

  if (receiptStep === 3) {
    populateReceiptReview();
  }
}

function receiptGoNext() {
  if (receiptStep === 1) {
    receiptWizardData.vendor = document.getElementById('recWizardVendor').value;
    receiptWizardData.warehouse = document.getElementById('recWizardWarehouse').value;
    receiptStep = 2;
  } else if (receiptStep === 2) {
    receiptWizardData.productSku = document.getElementById('recWizardProduct').value;
    receiptWizardData.quantity = parseInt(document.getElementById('recWizardQty').value, 10) || 50;
    receiptWizardData.unitCost = parseInt(document.getElementById('recWizardCost').value, 10) || 600;
    receiptStep = 3;
  }
  updateReceiptStepUI();
}

function receiptGoBack() {
  if (receiptStep > 1) {
    receiptStep--;
    updateReceiptStepUI();
  }
}

function populateReceiptReview() {
  const prod = store.getProducts().find(p => p.sku === receiptWizardData.productSku);
  const prodName = prod ? prod.name : 'Selected Product';
  const currentStock = prod ? prod.stock : 0;
  const newStock = currentStock + receiptWizardData.quantity;

  const reviewEl = document.getElementById('receiptReviewSummary');
  if (reviewEl) {
    reviewEl.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius); padding: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span class="text-secondary">Vendor:</span>
          <span class="font-semibold">${receiptWizardData.vendor}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span class="text-secondary">Destination Location:</span>
          <span class="font-semibold">${receiptWizardData.warehouse}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span class="text-secondary">Product:</span>
          <span class="font-semibold">${prodName} (${receiptWizardData.productSku})</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span class="text-secondary">Quantity to Receive:</span>
          <span class="font-bold text-primary-color">+${receiptWizardData.quantity} units</span>
        </div>
        <div style="border-top: 1px dashed var(--border-color); margin-top: 6px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span class="font-semibold">Stock Impact:</span>
          <span class="badge badge-success" style="font-size: 0.85rem;">
            ${currentStock} → ${newStock} units
          </span>
        </div>
      </div>
    `;
  }
}

function confirmReceipt() {
  store.receiveStock(
    receiptWizardData.productSku,
    receiptWizardData.quantity,
    receiptWizardData.vendor,
    receiptWizardData.warehouse
  );

  closeModal('newReceiptModal');
  showToast('Receipt completed successfully. Stock automatically increased.', 'success');

  renderReceiptsTable();
  renderProductsTable();
  renderDashboard();
  renderStockPage();
  renderHistoryPage();
}

function showReceiptDetails(id) {
  const rec = store.getReceipts().find(r => r.id === id);
  if (!rec) return;
  alert(`Receipt ${rec.id}\nVendor: ${rec.vendor}\nItems: ${rec.quantity} units of ${rec.productName}\nStatus: ${rec.status}`);
}

// ==========================================================================
// 7. Page: Deliveries & Interactive Workflow (Pick -> Pack -> Complete)
// ==========================================================================

function renderDeliveriesTable() {
  const tbody = document.getElementById('deliveriesTableBody');
  if (!tbody) return;

  const deliveries = store.getDeliveries();
  tbody.innerHTML = deliveries.map(del => {
    let statusBadge = 'badge-ready';
    if (del.status === 'Picking') statusBadge = 'badge-picking';
    if (del.status === 'Packed') statusBadge = 'badge-warning';
    if (del.status === 'Completed') statusBadge = 'badge-completed';

    // Workflow indicator
    const step1Class = del.workflowStep === 'Pick' ? 'active' : 'completed';
    const step2Class = del.workflowStep === 'Pack' ? 'active' : (del.workflowStep === 'Complete' || del.status === 'Completed' ? 'completed' : '');
    const step3Class = del.status === 'Completed' ? 'completed' : (del.workflowStep === 'Complete' ? 'active' : '');

    const isDone = del.status === 'Completed';

    return `
      <tr>
        <td class="font-semibold" style="color: var(--primary);">${del.id}</td>
        <td class="font-medium">${del.customer}</td>
        <td>${del.items} items <span class="text-muted">(${del.productName})</span></td>
        <td class="text-right font-bold">${del.quantity}</td>
        <td><span class="badge ${statusBadge}">${del.status}</span></td>
        <td>
          <div class="workflow-stepper">
            <span class="workflow-step ${step1Class}">Pick</span>
            <span class="workflow-arrow">→</span>
            <span class="workflow-step ${step2Class}">Pack</span>
            <span class="workflow-arrow">→</span>
            <span class="workflow-step ${step3Class}">Complete</span>
          </div>
        </td>
        <td class="text-right">
          ${isDone
            ? `<span class="badge badge-success">Dispatched</span>`
            : `<button class="btn btn-sm btn-primary" onclick="advanceDelivery('${del.id}')">
                Advance Stage →
               </button>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

function advanceDelivery(id) {
  const updated = store.advanceDeliveryWorkflow(id);
  if (!updated) return;

  if (updated.status === 'Completed') {
    showToast(`Order #${updated.id} completed! Stock deducted automatically.`, 'success');
  } else {
    showToast(`Order #${updated.id} advanced to ${updated.status}.`, 'info');
  }

  renderDeliveriesTable();
  renderProductsTable();
  renderDashboard();
  renderStockPage();
  renderHistoryPage();
}

function handleCreateDeliverySubmit(e) {
  e.preventDefault();
  const customer = document.getElementById('delCustomer').value.trim();
  const sku = document.getElementById('delProduct').value;
  const qty = parseInt(document.getElementById('delQty').value, 10);
  const source = document.getElementById('delSource').value;

  const prod = store.getProducts().find(p => p.sku === sku);
  if (prod && qty > prod.stock) {
    alert(`Cannot create delivery: Requested quantity (${qty}) exceeds available stock (${prod.stock})!`);
    return;
  }

  store.createDelivery(customer, sku, qty, source);
  closeModal('newDeliveryModal');
  e.target.reset();
  showToast('Delivery order created successfully.', 'success');

  renderDeliveriesTable();
  renderDashboard();
}

// ==========================================================================
// 8. Page: Internal Transfers
// ==========================================================================

function renderTransfersPage() {
  // Populate product dropdown
  const prodSelect = document.getElementById('trfProductSelect');
  if (prodSelect) {
    const products = store.getProducts();
    prodSelect.innerHTML = products.map(p =>
      `<option value="${p.sku}">${p.name} (${p.sku}) — Available: ${p.stock}</option>`
    ).join('');
  }

  renderTransfersTable();
}

function renderTransfersTable() {
  const tbody = document.getElementById('transfersTableBody');
  if (!tbody) return;

  const transfers = store.getTransfers();
  tbody.innerHTML = transfers.map(trf => `
    <tr>
      <td class="font-semibold" style="color: var(--primary);">${trf.id}</td>
      <td class="font-medium">${trf.productName}</td>
      <td>${trf.from}</td>
      <td>${trf.to}</td>
      <td class="text-right font-bold">${trf.quantity}</td>
      <td class="text-muted">${trf.timestamp}</td>
      <td><span class="badge badge-completed">Completed</span></td>
    </tr>
  `).join('');
}

function handleTransferSubmit(e) {
  e.preventDefault();
  const sku = document.getElementById('trfProductSelect').value;
  const fromLoc = document.getElementById('trfFromLocation').value;
  const toLoc = document.getElementById('trfToLocation').value;
  const qty = parseInt(document.getElementById('trfQuantity').value, 10);

  if (fromLoc === toLoc) {
    alert('Source and destination locations cannot be identical.');
    return;
  }

  if (!qty || qty <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }

  store.transferStock(sku, qty, fromLoc, toLoc);

  // Show inline success message as specifically requested
  const resultBox = document.getElementById('transferSuccessBox');
  if (resultBox) {
    resultBox.innerHTML = `<strong>${qty} units transferred successfully</strong> from ${fromLoc} to ${toLoc}.`;
    resultBox.style.display = 'flex';
    setTimeout(() => {
      if (resultBox) resultBox.style.display = 'none';
    }, 6000);
  }

  showToast(`${qty} units transferred successfully.`, 'success');

  renderTransfersTable();
  renderProductsTable();
  renderStockPage();
  renderHistoryPage();
  renderDashboard();
}

function openTransferWithProduct(sku) {
  navigate('transfers');
  setTimeout(() => {
    const prodSelect = document.getElementById('trfProductSelect');
    if (prodSelect) prodSelect.value = sku;
  }, 100);
}

// ==========================================================================
// 9. Page: Stock by Location
// ==========================================================================

let stockWarehouseFilter = 'all';
let stockSearchQuery = '';

function filterStockTable() {
  const query = document.getElementById('stockSearchInput')?.value.toLowerCase() || '';
  const wh = document.getElementById('stockWarehouseSelect')?.value || 'all';
  stockSearchQuery = query;
  stockWarehouseFilter = wh;
  renderStockPage();
}

function renderStockPage() {
  const tbody = document.getElementById('stockTableBody');
  if (!tbody) return;

  let products = store.getProducts();

  if (stockWarehouseFilter !== 'all') {
    products = products.filter(p => p.warehouse.includes(stockWarehouseFilter));
  }

  if (stockSearchQuery) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(stockSearchQuery) ||
      p.sku.toLowerCase().includes(stockSearchQuery) ||
      p.location.toLowerCase().includes(stockSearchQuery)
    );
  }

  tbody.innerHTML = products.map(p => {
    const total = p.stock + p.reserved;
    return `
      <tr>
        <td class="font-medium">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${getProductIcon(p.category)}</span>
            <span>${p.name}</span>
            <span class="sku-badge">${p.sku}</span>
          </div>
        </td>
        <td>${p.warehouse}</td>
        <td><span style="background: var(--bg-subtle); padding: 3px 8px; border-radius: 4px; font-weight: 500;">${p.location}</span></td>
        <td class="text-right font-bold" style="color: var(--primary);">${p.stock}</td>
        <td class="text-right text-muted">${p.reserved}</td>
        <td class="text-right font-bold">${total}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-outline-primary" onclick="openTransferWithProduct('${p.sku}')">
            Move Stock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 10. Page: Stock History
// ==========================================================================

let historyTypeFilter = 'all';

function setHistoryFilter(type) {
  historyTypeFilter = type;
  document.querySelectorAll('#historyFilterTabs .filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-type') === type);
  });
  renderHistoryPage();
}

function renderHistoryPage() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  let history = store.getHistory();

  if (historyTypeFilter !== 'all') {
    history = history.filter(h => h.type.toLowerCase() === historyTypeFilter.toLowerCase());
  }

  tbody.innerHTML = history.map(h => {
    let typeBadge = 'badge-neutral';
    let qtyColor = 'var(--text-primary)';

    if (h.type === 'Receipt') {
      typeBadge = 'badge-success';
      qtyColor = 'var(--success)';
    } else if (h.type === 'Delivery') {
      typeBadge = 'badge-danger';
      qtyColor = 'var(--danger)';
    } else if (h.type === 'Transfer') {
      typeBadge = 'badge-primary';
      qtyColor = 'var(--primary)';
    }

    return `
      <tr>
        <td class="font-semibold" style="font-family: monospace;">${h.id}</td>
        <td class="font-medium">${h.product}</td>
        <td><span class="badge ${typeBadge}">${h.type}</span></td>
        <td>${h.from}</td>
        <td>${h.to}</td>
        <td class="text-right font-bold" style="color: ${qtyColor};">${h.quantity}</td>
        <td class="text-muted">${h.date}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 11. Barcode Scanner Interface & Live Camera
// ==========================================================================

let currentScannedSku = null;
let scannerCameraStream = null;
let scannerBarcodeInterval = null;
let scannerDetector = null;

async function startModalCameraScanner() {
  const statusEl = document.getElementById('scannerCameraStatus');
  const btn = document.getElementById('btnToggleScannerCamera');
  const video = document.getElementById('scannerCameraVideo');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (statusEl) statusEl.innerHTML = '<span style="color: var(--danger);">Camera API unsupported (use manual entry)</span>';
    return;
  }

  if (statusEl) statusEl.textContent = 'Camera: Connecting...';

  try {
    // Try back/environment camera first
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (e) {
      // Fallback to any available video device
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    scannerCameraStream = stream;

    if (video) {
      video.srcObject = stream;
      video.style.display = 'block';
      await video.play().catch(e => console.warn('Video play prevented:', e));
    }

    if (btn) btn.textContent = '⏹ Stop Camera';
    if (statusEl) statusEl.innerHTML = '<span style="color: var(--success); font-weight: 600;">● Live Camera Active</span>';

    initLiveBarcodeDetection();
  } catch (err) {
    console.warn('Camera access denied or failed:', err);
    if (statusEl) statusEl.innerHTML = '<span style="color: var(--text-muted);">Camera off (permission required)</span>';
    if (btn) btn.textContent = '📷 Start Camera';
    if (video) video.style.display = 'none';
  }
}

function stopModalCameraScanner() {
  if (scannerBarcodeInterval) {
    clearInterval(scannerBarcodeInterval);
    scannerBarcodeInterval = null;
  }

  if (scannerCameraStream) {
    try {
      scannerCameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
    } catch (e) {}
    scannerCameraStream = null;
  }

  const video = document.getElementById('scannerCameraVideo');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.style.display = 'none';
  }

  const btn = document.getElementById('btnToggleScannerCamera');
  if (btn) btn.textContent = '📷 Start Camera';

  const statusEl = document.getElementById('scannerCameraStatus');
  if (statusEl) statusEl.textContent = 'Camera: Inactive';
}

function toggleModalCameraScanner() {
  if (scannerCameraStream) {
    stopModalCameraScanner();
  } else {
    startModalCameraScanner();
  }
}

function initLiveBarcodeDetection() {
  if ('BarcodeDetector' in window) {
    try {
      if (!scannerDetector) {
        scannerDetector = new BarcodeDetector({
          formats: ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
        });
      }

      if (scannerBarcodeInterval) clearInterval(scannerBarcodeInterval);

      scannerBarcodeInterval = setInterval(async () => {
        const video = document.getElementById('scannerCameraVideo');
        if (!video || !scannerCameraStream || video.readyState < 2) return;
        try {
          const barcodes = await scannerDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const val = barcodes[0].rawValue?.trim();
            if (val && val.toUpperCase() !== currentScannedSku) {
              simulateScan(val);
            }
          }
        } catch (err) {
          // Frame read skip
        }
      }, 400);
    } catch (err) {
      console.log('Native BarcodeDetector not available:', err);
    }
  }
}

function openBarcodeScannerModal() {
  currentScannedSku = null;
  const resultCard = document.getElementById('scannerResultCard');
  if (resultCard) resultCard.style.display = 'none';
  const input = document.getElementById('scannerManualInput');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 200);
  }
  openModal('barcodeScannerModal');
  startModalCameraScanner();
}

function simulateScan(sku) {
  if (!sku) return;
  const rawSku = sku.trim().toUpperCase();
  const prod = store.getProducts().find(p => 
    p.sku.toUpperCase() === rawSku || 
    p.id.toString() === rawSku || 
    p.name.toUpperCase().includes(rawSku)
  );

  if (!prod) {
    showToast(`SKU "${sku}" not found in inventory catalog.`, 'warning');
    return;
  }

  currentScannedSku = prod.sku;
  const resultCard = document.getElementById('scannerResultCard');
  if (!resultCard) return;

  document.getElementById('scannedProdName').textContent = prod.name;
  document.getElementById('scannedProdSku').textContent = prod.sku;
  document.getElementById('scannedProdStock').textContent = prod.stock;
  document.getElementById('scannedProdLocation').textContent = `${prod.warehouse} / ${prod.location}`;
  document.getElementById('scannedProdPrice').textContent = `₹${(prod.price || 0).toLocaleString('en-IN')}`;

  resultCard.style.display = 'block';

  // Audio feedback using Web Audio API
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}

  // Visual laser flash feedback
  const laser = document.querySelector('.scanner-laser');
  if (laser) {
    laser.style.background = '#22c55e';
    laser.style.boxShadow = '0 0 16px #22c55e';
    setTimeout(() => {
      laser.style.background = '#ef4444';
      laser.style.boxShadow = '0 0 10px #ef4444';
    }, 450);
  }

  showToast(`Scanned: ${prod.name} (${prod.sku})`, 'success');
}

function handleScannerManualInput(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim().toUpperCase();
    if (val) simulateScan(val);
  }
}

function scannerAction(action) {
  if (!currentScannedSku) return;
  const sku = currentScannedSku;
  closeModal('barcodeScannerModal');

  if (action === 'receive') {
    openReceiptModalWithProduct(sku);
  } else if (action === 'transfer') {
    openTransferWithProduct(sku);
  } else if (action === 'deliver') {
    openModal('newDeliveryModal');
    setTimeout(() => {
      const pSelect = document.getElementById('delProduct');
      if (pSelect) pSelect.value = sku;
    }, 100);
  }
}

// ==========================================================================
// 12. Settings Page & Demo Reset
// ==========================================================================

function renderSettingsPage() {
  // Can display environment info and reset option
}

function resetDemoData() {
  if (confirm('Reset StockSense to initial default demo data?')) {
    store.resetData();
    showToast('Data reset to default demo values.', 'info');
    renderActivePage(activePage);
  }
}

// ==========================================================================
// 13. Modal & Toast Infrastructure
// ==========================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  if (modalId === 'barcodeScannerModal') {
    stopModalCameraScanner();
  }
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// Close modal when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    if (e.target.id === 'barcodeScannerModal') {
      stopModalCameraScanner();
    }
    e.target.classList.remove('open');
  }
});

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--success);"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  } else if (type === 'danger') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger);"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  }

  toast.innerHTML = `
    <span class="toast-icon" style="display: flex; align-items: center;">${iconSvg}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Global Search
function handleGlobalSearch(query) {
  if (!query) return;
  navigate('products');
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) {
    searchInput.value = query;
    filterProducts(query);
  }
}

// ==========================================================================
// 14. Initialization on DOM Load
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Check hash on load
  const hash = window.location.hash.replace('#', '');
  if (['dashboard', 'products', 'receipts', 'deliveries', 'transfers', 'stock', 'history', 'settings'].includes(hash)) {
    navigate(hash);
  } else {
    renderActivePage('dashboard');
  }

  if (hash === 'scanner') {
    openBarcodeScannerModal();
  }

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (['dashboard', 'products', 'receipts', 'deliveries', 'transfers', 'stock', 'history', 'settings'].includes(newHash)) {
      navigate(newHash);
    }
  });

  // Setup form submit listeners
  const addProdForm = document.getElementById('addProductForm');
  if (addProdForm) addProdForm.addEventListener('submit', handleAddProductSubmit);

  const transferForm = document.getElementById('transferStockForm');
  if (transferForm) transferForm.addEventListener('submit', handleTransferSubmit);

  const deliveryForm = document.getElementById('createDeliveryForm');
  if (deliveryForm) deliveryForm.addEventListener('submit', handleCreateDeliverySubmit);

  // Esc key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => {
        if (m.id === 'barcodeScannerModal') {
          stopModalCameraScanner();
        }
        m.classList.remove('open');
      });
    }
  });
});
