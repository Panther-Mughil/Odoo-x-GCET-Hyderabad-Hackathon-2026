import re

with open("frontend/index.html", "r") as f:
    html = f.read()

# 1. Hide the sidebar by default and wrap authenticated stuff
html = html.replace('<aside class="app-sidebar" id="appSidebar">', '<aside class="app-sidebar" id="appSidebar" style="display:none;">')
html = html.replace('<main class="app-main">', '<main class="app-main" id="appMain" style="display:none;">')

# 2. Add Login and Signup Views right inside <div class="app-container">
auth_html = """
    <!-- AUTH VIEWS -->
    <div id="auth-container" class="auth-wrapper" style="display:flex; justify-content:center; align-items:center; width: 100vw; height: 100vh; background: var(--bg-body);">
      <div id="view-login" class="auth-card" style="background: var(--bg-card); padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <div style="background: var(--primary); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin: 0 auto 16px auto;">S</div>
        <h2 style="margin-bottom: 8px; color: var(--text-primary);">Welcome Back</h2>
        <p style="margin-bottom: 24px; color: var(--text-secondary); font-size: 14px;">Sign in to StockSense</p>
        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group" style="text-align: left; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Email</label>
            <input type="email" id="login-email" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;" required placeholder="manager@stocksense.com">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Password</label>
            <input type="password" id="login-password" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; margin-bottom: 16px;">Sign In</button>
        </form>
        <p style="font-size: 13px; color: var(--text-secondary);">Don't have an account? <a href="javascript:void(0)" onclick="showAuthView('signup')" style="color: var(--primary); font-weight: 500;">Sign up</a></p>
      </div>

      <div id="view-signup" class="auth-card" style="display:none; background: var(--bg-card); padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <div style="background: var(--primary); width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin: 0 auto 16px auto;">S</div>
        <h2 style="margin-bottom: 8px; color: var(--text-primary);">Create Account</h2>
        <p style="margin-bottom: 24px; color: var(--text-secondary); font-size: 14px;">Join StockSense</p>
        <form id="signup-form" onsubmit="handleSignup(event)">
          <div class="form-group" style="text-align: left; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Full Name</label>
            <input type="text" id="signup-name" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;" required placeholder="John Doe">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Email</label>
            <input type="email" id="signup-email" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;" required placeholder="name@company.com">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Password</label>
            <input type="password" id="signup-password" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;" required placeholder="••••••••">
          </div>
          <div class="form-group" style="text-align: left; margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500;">Role</label>
            <select id="signup-role" class="form-control" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: white;" required>
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
html = html.replace('<div class="app-container">', '<div class="app-container">\n' + auth_html)

# 3. Add Admin view in appMain
admin_nav_link = """
        <div class="nav-item" data-page="admin" onclick="navigate('admin')" id="nav-admin" style="display:none;">
          <div class="nav-item-left">
            <span class="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </span>
            <span>Admin</span>
          </div>
        </div>
"""
html = html.replace('<!-- Settings/Divider -->', admin_nav_link + '\n        <!-- Settings/Divider -->')

admin_view = """
      <section class="page-container page-view" id="view-admin" style="display: none;">
        <div class="page-header">
          <div>
            <h2 class="page-title">Admin Dashboard</h2>
            <p class="page-subtitle">Manage users and system configuration</p>
          </div>
        </div>
        <div class="content-body">
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-header">
              <h3>Registered Users</h3>
            </div>
            <div class="card-body">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody id="admin-users-tbody">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
"""
html = html.replace('<!-- ========================== END SETTINGS VIEW ========================== -->', '<!-- ========================== END SETTINGS VIEW ========================== -->\n' + admin_view)

# Remove Sign Out button from user profile dropdown and place it where it makes sense
html = html.replace('<button class="logout-btn">Log out</button>', '<button class="logout-btn" onclick="logout()">Log out</button>')

with open("frontend/index.html", "w") as f:
    f.write(html)
