import re

with open("frontend/index.html", "r") as f:
    html = f.read()

# 1. Update Title and Favicon
html = html.replace('<title>StockSense - Enterprise Inventory Management System</title>', '<title>StockSense</title>\n  <link rel="icon" type="image/svg+xml" href="/static/assets/favicon.svg">')

# 2. Add Auth Views
auth_html = """
<div id="auth-container" style="display:none; flex: 1; justify-content: center; align-items: center; background: var(--bg-app); width: 100vw;">
  <div id="view-login" style="background: var(--bg-surface); padding: 40px; border-radius: 12px; box-shadow: var(--shadow-md); width: 100%; max-width: 400px; text-align: center;">
    <div style="background: var(--primary); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin: 0 auto 16px auto;">S</div>
    <h2 style="margin-bottom: 8px; color: var(--text-main);">Welcome Back</h2>
    <p style="margin-bottom: 24px; color: var(--text-secondary); font-size: 14px;">Sign in to StockSense</p>
    <form id="login-form" onsubmit="handleLogin(event)">
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Email</label>
        <input type="email" id="login-email" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px;" required placeholder="manager@stocksense.com">
      </div>
      <div style="text-align: left; margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Password</label>
        <input type="password" id="login-password" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px;" required placeholder="••••••••">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; margin-bottom: 16px;">Sign In</button>
    </form>
    <p style="font-size: 13px; color: var(--text-secondary);">Don't have an account? <a href="javascript:void(0)" onclick="showAuthView('signup')" style="color: var(--primary); font-weight: 500;">Sign up</a></p>
  </div>

  <div id="view-signup" style="display:none; background: var(--bg-surface); padding: 40px; border-radius: 12px; box-shadow: var(--shadow-md); width: 100%; max-width: 400px; text-align: center;">
    <div style="background: var(--primary); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin: 0 auto 16px auto;">S</div>
    <h2 style="margin-bottom: 8px; color: var(--text-main);">Create Account</h2>
    <p style="margin-bottom: 24px; color: var(--text-secondary); font-size: 14px;">Join StockSense</p>
    <form id="signup-form" onsubmit="handleSignup(event)">
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Full Name</label>
        <input type="text" id="signup-name" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px;" required placeholder="John Doe">
      </div>
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Email</label>
        <input type="email" id="signup-email" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px;" required placeholder="name@company.com">
      </div>
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Password</label>
        <input type="password" id="signup-password" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px;" required placeholder="••••••••">
      </div>
      <div style="text-align: left; margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Role</label>
        <select id="signup-role" style="width: 100%; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 14px; background: white;" required>
          <option value="warehouse_staff">Warehouse Staff</option>
          <option value="inventory_manager">Inventory Manager</option>
          <option value="admin">System Admin</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; margin-bottom: 16px;">Sign Up</button>
    </form>
    <p style="font-size: 13px; color: var(--text-secondary);">Already have an account? <a href="javascript:void(0)" onclick="showAuthView('login')" style="color: var(--primary); font-weight: 500;">Sign in</a></p>
  </div>
</div>
"""

# Wrap existing app and insert auth
html = html.replace('<body>', f'<body>\n{auth_html}\n<div id="authenticated-app" style="display:none; flex:1; width:100vw; height:100vh; overflow:hidden;">')

# Insert Admin Nav link in Sidebar
admin_nav = """
      <div class="nav-item" data-page="admin" onclick="navigate('admin')" id="nav-admin" style="display:none;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span>Admin Panel</span>
      </div>
"""
html = html.replace('<div class="sidebar-section">Modules</div>', '<div class="sidebar-section">Modules</div>\n' + admin_nav)

# Insert Admin View
admin_view = """
    <!-- Admin View -->
    <div id="view-admin" class="page-view" style="display: none;">
      <header class="page-header">
        <div class="header-left">
          <h2>Admin Control Panel</h2>
          <p>Manage system users and access roles.</p>
        </div>
      </header>
      <div class="page-content">
        <div class="card">
          <div class="card-header">
            <h3>Registered Users</h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="erp-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody id="admin-users-tbody">
                  <tr><td colspan="4" style="text-align:center; padding: 20px;">Admins only can view this.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
"""
html = html.replace('<!-- Dashboard View -->', admin_view + '\n    <!-- Dashboard View -->')

# Fix logout dropdown to actually logout
html = html.replace('<li><a href="#">Sign out</a></li>', '<li><a href="javascript:void(0)" onclick="logout()">Sign out</a></li>')

html = html.replace('</body>', '</div>\n</body>')

with open("frontend/index.html", "w") as f:
    f.write(html)
