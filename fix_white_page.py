import re

with open("frontend/js/enterprise.js", "r") as f:
    js = f.read()

# Try to find the exact DOMContentLoaded block and replace it using regex
pattern = r'document\.addEventListener\("DOMContentLoaded",\s*\(\)\s*=>\s*\{[\s\S]*?\}\);'

auth_block = """document.addEventListener("DOMContentLoaded", () => {
  state.token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  
  // Dark mode init
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
  }

  if (state.token && savedUser) {
    state.currentUser = JSON.parse(savedUser);
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("authenticated-app").style.display = "flex";
    
    const profileName = document.getElementById("userProfileName");
    const profileRole = document.getElementById("userProfileRole");
    if(profileName) profileName.textContent = state.currentUser.full_name;
    if(profileRole) profileRole.textContent = state.currentUser.role.replace('_', ' ').toUpperCase();
    
    if (state.currentUser.role === "admin" || state.currentUser.role === "inventory_manager") {
      const adminNav = document.getElementById("nav-admin");
      if (adminNav) adminNav.style.display = "flex";
    }
    
    initCharts();
    loadAllData();
  } else {
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("authenticated-app").style.display = "none";
    showAuthView('login');
  }
});

function toggleDarkMode() {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
"""

js = re.sub(pattern, auth_block, js)

with open("frontend/js/enterprise.js", "w") as f:
    f.write(js)
