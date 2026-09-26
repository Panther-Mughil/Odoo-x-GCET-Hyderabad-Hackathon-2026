with open("frontend/index.html", "r") as f:
    html = f.read()

dark_mode_btn = """
        <!-- Dark Mode Toggle -->
        <button class="btn btn-outline" style="padding: 6px 12px; margin-right: 16px; border-radius: 20px; font-size: 13px;" onclick="toggleDarkMode()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>
"""

html = html.replace('<div class="header-right">', '<div class="header-right">\n' + dark_mode_btn)

with open("frontend/index.html", "w") as f:
    f.write(html)
