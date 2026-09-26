import re

with open("frontend/js/enterprise.js", "r") as f:
    content = f.read()

# Fix Ledger Table Colors
ledger_replacement = """
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
"""
content = re.sub(r'tbody\.innerHTML = "";\n  state\.ledger\.forEach\(m => \{.*?tbody\.appendChild\(tr\);\n  \}\);', ledger_replacement.strip(), content, flags=re.DOTALL)


# Fix renderOperationsTable
operations_replacement = """
  tbody.innerHTML = "";
  const docs = state.operations.filter(o => o.doc_type === type);
  
  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">No ${type} operations found.</td></tr>`;
    return;
  }

  docs.forEach(r => {
    const tr = document.createElement("tr");
    if (r.status === 'waiting') {
        tr.style.backgroundColor = '#fef2f2';
        tr.style.color = '#991b1b';
    }
    
    let badgeClass = "badge-default";
    if (r.status === 'ready') badgeClass = "badge-success";
    if (r.status === 'done') badgeClass = "badge-success";
    if (r.status === 'waiting') badgeClass = "badge-danger";
    
    let actionHtml = "";
    if (r.status === 'draft') {
        actionHtml = `<button class="btn btn-sm" onclick="markDocReady(${r.id})" style="background: #eab308; color: white;">Mark Ready</button>`;
    } else if (r.status === 'ready') {
        actionHtml = `<button class="btn btn-sm btn-primary" onclick="validateDoc(${r.id})">Validate</button>`;
    } else if (r.status === 'done') {
        actionHtml = `<button class="btn btn-sm btn-outline" onclick="printReceipt(${r.id})" style="background: #0f172a; color: white;">Print Receipt</button>`;
    }

    tr.innerHTML = `
      <td><code style="font-weight: 700; color: #2563eb;">${r.doc_number}</code></td>
      <td><strong>${r.partner_name}</strong></td>
      <td>${r.items.map(i => `${i.product_name} (${i.sku})`).join(", ")}</td>
      <td><strong>${r.items.reduce((acc, curr) => acc + curr.quantity, 0)} units</strong></td>
      <td><code>${r.dest_location || r.source_location}</code></td>
      <td><span class="badge ${badgeClass}">${r.status.toUpperCase()}</span></td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
"""
content = re.sub(r'tbody\.innerHTML = "";\n  const docs = state\.operations\.filter\(o => o\.doc_type === type\);.*?tbody\.appendChild\(tr\);\n  \}\);', operations_replacement.strip(), content, flags=re.DOTALL)


with open("frontend/js/enterprise.js", "w") as f:
    f.write(content)
