with open("frontend/js/enterprise.js", "r") as f:
    js = f.read()

js = js.replace("let state = {", "let state = {\n  currentUser: null,\n  token: null,")

auth_init = """
  state.token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  if (state.token && savedUser) {
    state.currentUser = JSON.parse(savedUser);
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("authenticated-app").style.display = "flex";
    
    // Set user profile in header
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
  }
"""
js = js.replace("initCharts();\n  loadAllData();", auth_init)

auth_funcs = """
// --- AUTHENTICATION ---
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
      alert("Registration successful. Please log in.");
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
"""

with open("frontend/js/enterprise.js", "a") as f:
    f.write(auth_funcs)

