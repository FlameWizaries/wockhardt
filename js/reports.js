// ============================================================
// МОДУЛЬ ОТЧЕТОВ
// ============================================================

import { supabaseClient } from './app.js';
import { currentUserId, currentUserNickname, currentUserRole } from './auth.js';

// ==================== ПЕРЕМЕННЫЕ ====================
let allReports = [];

// ==================== ЗАГРУЗКА ОТЧЕТОВ ====================
export async function loadReports() {
    try {
        let query = supabaseClient
            .from("reports")
            .select("*, users!user_id(username)");
        if (currentUserRole !== "leader") {
            query = query.eq("user_id", currentUserId);
        }
        const { data, error } = await query.order("date", { ascending: false });
        if (error) throw error;
        allReports = data || [];
        renderReports();
        updateStats();
    } catch (error) {
        console.error("Ошибка загрузки отчетов:", error);
        alert("❌ Ошибка загрузки отчетов: " + error.message);
    }
}

// ==================== ПОЛУЧЕНИЕ ФИЛЬТРОВАННЫХ ОТЧЕТОВ ====================
export function getFilteredReports() {
    let filtered = [...allReports];

    const startDate = document.getElementById("filterDateStart")?.value;
    const endDate = document.getElementById("filterDateEnd")?.value;
    const eventFilter = document.getElementById("filterEvent")?.value;
    const statusFilter = document.getElementById("filterStatus")?.value;
    const memberFilter = document.getElementById("filterMember")?.value;

    if (startDate) filtered = filtered.filter((r) => r.date >= startDate);
    if (endDate) filtered = filtered.filter((r) => r.date <= endDate);
    if (eventFilter) filtered = filtered.filter((r) => r.event === eventFilter);
    if (statusFilter === "pending") filtered = filtered.filter((r) => !r.is_approved);
    if (statusFilter === "approved") filtered = filtered.filter((r) => r.is_approved);
    if (memberFilter) filtered = filtered.filter((r) => r.user_id === memberFilter);

    return filtered;
}

// ==================== РЕНДЕРИНГ ====================
function renderReports() {
    const container = document.getElementById("reportsList");
    if (!container) return;

    const filtered = getFilteredReports();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-reports">
                <p>📭 ${allReports.length === 0 ? "Отчетов пока нет" : "Ничего не найдено"}</p>
                <span>${allReports.length === 0 ? "Добавьте первый отчет через форму выше" : "Попробуйте изменить фильтры"}</span>
            </div>
        `;
        const reportCount = document.getElementById("reportCount");
        if (reportCount) reportCount.textContent = "0 отчетов";
        return;
    }

    const reportCount = document.getElementById("reportCount");
    if (reportCount) reportCount.textContent = `${filtered.length} отчетов`;

    let html = "";
    filtered.forEach((report) => {
        const images = report.images || [];
        const isLeader = currentUserRole === "leader";

        let galleryHtml = "";
        images.forEach((imgUrl, imgIndex) => {
            galleryHtml += `<img src="${imgUrl}" alt="скриншот" onclick="window.openGallery('${report.id}', ${imgIndex})">`;
        });

        const displayDate = report.date
            ? new Date(report.date + "T00:00:00").toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
              })
            : "Нет даты";

        const approvedBadge = report.is_approved
            ? '<span class="badge-approved">✅ Утвержден</span>'
            : '<span class="badge-pending">⏳ Ожидает</span>';

        const approveBtn =
            isLeader && !report.is_approved
                ? `<button class="btn-action btn-approve" onclick="window.approveReport('${report.id}')">✅ Утвердить</button>`
                : "";

        const deleteBtn =
            isLeader || report.user_id === currentUserId
                ? `<button class="btn-action btn-delete" onclick="window.deleteReport('${report.id}')">🗑 Удалить</button>`
                : "";

        const authorName = report.users?.username || report.user_name || "Неизвестен";

        html += `
            <div class="block-report" data-report-id="${report.id}">
                <div class="report-text">
                    <div class="report-date-display">
                        <span class="report-date-label">📅 DATE</span>
                        <span class="report-date-value">${displayDate}</span>
                    </div>
                    <div class="event">
                        <p class="title-mptime">EVENT</p>
                        <p class="text-mptime">${report.event}</p>  
                    </div>
                    <div class="time">
                        <p class="title-mptime">TIME</p>
                        <p class="text-mptime">${report.time}</p>
                    </div>
                    ${report.description ? `<p class="report-description">${report.description}</p>` : ""}
                    <div class="report-meta">
                        <span class="report-author">👤 ${authorName}</span>
                        ${approvedBadge}
                    </div>
                    <div class="report-actions">
                        ${approveBtn}
                        ${deleteBtn}
                    </div>
                </div>
                <div class="report-gallery">
                    ${galleryHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==================== СТАТИСТИКА ====================
function updateStats() {
    const total = allReports.length;
    let totalImages = 0;
    const events = new Set();
    let pending = 0;

    allReports.forEach((r) => {
        totalImages += (r.images || []).length;
        events.add(r.event);
        if (!r.is_approved) pending++;
    });

    document.getElementById("totalReports").textContent = total;
    document.getElementById("totalImages").textContent = totalImages;
    document.getElementById("uniqueEvents").textContent = events.size;
    document.getElementById("pendingApproval").textContent = pending;
}