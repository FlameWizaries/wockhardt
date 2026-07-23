// ============================================================
// УНИВЕРСАЛЬНОЕ УПРАВЛЕНИЕ ТЕМОЙ
// ============================================================

const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

function updateThemeIcon() {
    const theme = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
        btn.textContent = theme === "dark" ? "🌙" : "☀️";
    });
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeIcon();
}

function initTheme() {
    updateThemeIcon();
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
        btn.addEventListener("click", toggleTheme);
    });
}

document.addEventListener("DOMContentLoaded", initTheme);
console.log("🎨 Тема инициализирована:", document.documentElement.getAttribute("data-theme"));
