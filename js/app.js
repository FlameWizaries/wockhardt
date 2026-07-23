// ============================================================
// APPWRITE ВЕРСИЯ - ПОЛНЫЙ ФАЙЛ
// ============================================================

import { account, database, storage, APPWRITE_CONFIG } from "./config.js";

console.log("🚀 Приложение запускается...");

// ==================== ДЕЛАЕМ ПЕРЕМЕННЫЕ ГЛОБАЛЬНЫМИ ====================
window.currentUserId = null;
window.currentUserRole = null;
window.currentUserNickname = null;
window.currentUser = null;
window.allReports = [];
window.allUsers = [];

// ==================== ДЕЛАЕМ СЕРВИСЫ ГЛОБАЛЬНЫМИ ====================
window.account = account;
window.database = database;
window.storage = storage;
window.APPWRITE_CONFIG = APPWRITE_CONFIG;
window.formatCurrency = formatCurrency;

// ==================== DOM ЭЛЕМЕНТЫ ====================
const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authUsername = document.getElementById("authUsername");
const usernameField = document.getElementById("usernameField");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggle = document.getElementById("authToggle");
const authError = document.getElementById("authError");
const logoutBtn = document.getElementById("logoutBtn");
const headerUsername = document.getElementById("headerUsername");
const headerRole = document.getElementById("headerRole");
const sidebarUsername = document.getElementById("sidebarUsername");
const sidebarRole = document.getElementById("sidebarRole");
const skeletonContainer = document.getElementById("skeletonContainer");
const reportsContent = document.getElementById("reportsContent");

console.log("✅ Элементы страницы найдены");

// ==================== ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentUserRole = null;
let currentUserId = null;
let currentUserNickname = null;
let allReports = [];
let allUsers = [];
let allFines = [];
let isLoginMode = true;
let calculateBtn = null;
let isProcessingPayment = false;

// ==================== TOAST ====================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
        warning: "⚠️",
        info: "ℹ️",
    };

    if (type === "warning" || type === "info") {
        toast.innerHTML = `${icons[type] || ""} ${message}`;
    } else {
        toast.textContent = message;
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==================== SKELETON ====================
function showSkeleton() {
    const skeleton = document.getElementById("skeletonContainer");
    const content = document.getElementById("reportsContent");
    const reportsList = document.getElementById("reportsList");
    
    if (skeleton) {
        skeleton.style.display = "block";
        skeleton.classList.remove('hidden');
    }
    if (content) {
        content.style.display = "none";
        content.classList.remove('visible');
    }
    if (reportsList) {
        // Очищаем список, чтобы не показывать старые данные
        reportsList.innerHTML = '';
    }
    console.log('🔄 Показываем скелетон');
}

function hideSkeleton() {
    const skeleton = document.getElementById("skeletonContainer");
    const content = document.getElementById("reportsContent");
    
    if (skeleton) {
        skeleton.classList.add('hidden');
        setTimeout(() => {
            skeleton.style.display = "none";
        }, 300);
    }
    if (content) {
        content.style.display = "block";
        setTimeout(() => {
            content.classList.add('visible');
        }, 50);
    }
    console.log('✅ Скелетон скрыт');
}

// ==================== ЗАГРУЗКА ВСЕХ ДОКУМЕНТОВ (БЕЗ ЛИМИТА) ====================
async function loadAllDocuments(databaseId, collectionId, queries = []) {
    let allDocuments = [];
    let offset = 0;
    const limit = 100;
    
    try {
        while (true) {
            const queryWithPagination = [
                ...queries,
                Appwrite.Query.limit(limit),
                Appwrite.Query.offset(offset)
            ];
            
            const result = await database.listDocuments(
                databaseId,
                collectionId,
                queryWithPagination
            );
            
            if (result.documents.length === 0) break;
            
            allDocuments = [...allDocuments, ...result.documents];
            offset += limit;
            
            if (result.documents.length < limit) break;
        }
        
        console.log(`📋 Загружено документов: ${allDocuments.length}`);
        return allDocuments;
    } catch (error) {
        console.error('❌ Ошибка загрузки всех документов:', error);
        return allDocuments;
    }
}

// ==================== ФОРМАТИРОВАНИЕ ЧИСЕЛ ====================
function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    const number = Math.round(num);
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "0 Ꝑ";
    const number = Math.round(amount);
    const formatted = number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted} Ꝑ`;
}

window.formatCurrency = formatCurrency;

// ==================== ЦЕНЫ (С БД) ====================

// Ключ для хранения цен в коллекции settings
const PRICES_SETTINGS_KEY = 'eventPrices';

// Загрузка цен из БД
async function loadPricesFromDB() {
    try {
        console.log('🔄 Загрузка цен из БД...');
        
        const result = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'settings',
            [Appwrite.Query.equal("key", PRICES_SETTINGS_KEY)]
        );
        
        let prices = null;
        
        if (result.documents.length > 0) {
            // Цены найдены в БД - парсим JSON из строки
            const valueString = result.documents[0].value;
            try {
                prices = JSON.parse(valueString);
                console.log('📋 Цены загружены из БД:', prices);
            } catch (e) {
                console.error('❌ Ошибка парсинга цен из БД:', e);
                prices = null;
            }
        }
        
        if (!prices) {
            // Цен нет в БД или ошибка парсинга - создаем дефолтные
            const defaultPrices = {
                ФАМКАНТ: 100,
                ФАМКАПТ: 100,
                РЕЙД: 150,
                ФАМВАР: 200,
                ФАМБИЗВАР: 250,
                КОРАБЛЬ: 120,
                КЛАДЫ: 80,
                ЦЕХ: 90,
                ГРАФФИТИ: 100,
                "FAMILY CAPT": 100,
                RAID: 150,
                WAR: 200,
                FAMBIZWAR: 250,
                SHIP: 120,
                TREASURE: 80,
                WORKSHOP: 90,
                "FAMBIZ WAR": 250,
                "КОНТЕЙНЕРЫ": 100,
                "ЗАБИВ КАПТА": 100,
                "КАПТ": 80,
                "СУМКА С ПОЕЗДА": 90
            };
            
            await savePricesToDB(defaultPrices);
            prices = defaultPrices;
            console.log('📝 Созданы цены по умолчанию в БД');
        }
        
        // Сохраняем в window и localStorage
        window._prices = prices;
        localStorage.setItem("eventPrices", JSON.stringify(prices));
        
        // Обновляем поля ввода
        updatePriceInputs();
        
        return prices;
    } catch (error) {
        console.error('❌ Ошибка загрузки цен из БД:', error);
        // Fallback: загружаем из localStorage
        const localPrices = JSON.parse(localStorage.getItem("eventPrices") || "{}");
        window._prices = localPrices;
        return localPrices;
    }
}

// Сохранение цен в БД
async function savePricesToDB(prices) {
    try {
        console.log('💾 Сохранение цен в БД:', prices);
        
        // Преобразуем объект в JSON строку
        const valueString = JSON.stringify(prices);
        
        // Ищем существующий документ
        const result = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'settings',
            [Appwrite.Query.equal("key", PRICES_SETTINGS_KEY)]
        );
        
        if (result.documents.length > 0) {
            // Обновляем существующий документ
            const docId = result.documents[0].$id;
            await database.updateDocument(
                APPWRITE_CONFIG.databaseId,
                'settings',
                docId,
                {
                    value: valueString,
                    updatedAt: Date.now()
                }
            );
            console.log('✅ Цены обновлены в БД');
        } else {
            // Создаем новый документ
            await database.createDocument(
                APPWRITE_CONFIG.databaseId,
                'settings',
                'unique()',
                {
                    key: PRICES_SETTINGS_KEY,
                    value: valueString,
                    updatedAt: Date.now()
                }
            );
            console.log('✅ Цены созданы в БД');
        }
        
        // Обновляем локальные копии
        window._prices = prices;
        localStorage.setItem("eventPrices", JSON.stringify(prices));
        
        // Обновляем поля ввода
        updatePriceInputs();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения цен в БД:', error);
        // Fallback: сохраняем в localStorage
        localStorage.setItem("eventPrices", JSON.stringify(prices));
        window._prices = prices;
        return false;
    }
}

// Сброс цен до стандартных
async function resetPricesToDefault() {
    if (!confirm("Сбросить все цены до значений по умолчанию?")) return;
    
    const defaultPrices = {
        ФАМКАНТ: 100,
        ФАМКАПТ: 100,
        РЕЙД: 150,
        ФАМВАР: 200,
        ФАМБИЗВАР: 250,
        КОРАБЛЬ: 120,
        КЛАДЫ: 80,
        ЦЕХ: 90,
        ГРАФФИТИ: 100,
        "FAMILY CAPT": 100,
        RAID: 150,
        WAR: 200,
        FAMBIZWAR: 250,
        SHIP: 120,
        TREASURE: 80,
        WORKSHOP: 90,
        "FAMBIZ WAR": 250,
        "КОНТЕЙНЕРЫ": 100,
        "ЗАБИВ КАПТА": 100,
        "КАПТ": 80,
        "СУМКА С ПОЕЗДА": 90
    };
    
    await savePricesToDB(defaultPrices);
    showToast("Цены сброшены до значений по умолчанию", "info");
}

function getEventPrice(eventName) {
    const prices = window._prices || JSON.parse(localStorage.getItem("eventPrices") || "{}");
    return prices[eventName] || 0;
}

// Делаем глобальной
window.getEventPrice = getEventPrice;

// Обновление полей ввода цен
function updatePriceInputs() {
    const prices = window._prices || JSON.parse(localStorage.getItem("eventPrices") || "{}");
    
    document.querySelectorAll(".price-input").forEach((input) => {
        const event = input.id.replace("price_", "");
        const price = prices[event];
        if (price !== undefined && price !== null) {
            input.value = price;
        } else {
            input.value = 0;
        }
    });
    console.log("✅ Цены обновлены в полях ввода");
}

// Делаем функцию глобальной
window.updatePriceInputs = updatePriceInputs;

async function loadPrices() {
    try {
        // Загружаем из localStorage для быстрого доступа
        const localPrices = JSON.parse(localStorage.getItem("eventPrices") || "{}");
        
        // Если в localStorage есть цены - используем их
        if (Object.keys(localPrices).length > 0) {
            window._prices = localPrices;
            updatePriceInputs();
            console.log('📥 Цены загружены из localStorage');
            
            // В фоне проверяем БД и синхронизируем
            loadPricesFromDB().then(dbPrices => {
                if (dbPrices) {
                    window._prices = dbPrices;
                    updatePriceInputs();
                    console.log('🔄 Цены синхронизированы с БД');
                }
            }).catch(e => console.warn('⚠️ Не удалось синхронизировать цены с БД:', e));
            
            return localPrices;
        }
        
        // Если в localStorage нет цен - загружаем из БД
        const dbPrices = await loadPricesFromDB();
        return dbPrices;
    } catch (error) {
        console.error('❌ Ошибка загрузки цен:', error);
        return {};
    }
}

// ==================== ШТРАФЫ (С БД) ====================

// Загрузка штрафов из БД
async function loadFines() {
    try {
        const fines = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            'fines',
            [Appwrite.Query.orderDesc("timestamp")]
        );
        
        window._fines = fines;
        
        const container = document.getElementById("finesList");
        if (!container) return;
        
        console.log('📋 Загрузка штрафов из БД:', fines.length);
        
        if (fines.length === 0) {
            container.innerHTML = '<p style="color: var(--gray); font-size: 14px;">📭 Штрафов нет</p>';
            return;
        }
        
        let html = "";
        let totalFines = 0;
        fines.forEach((fine) => {
            totalFines += fine.amount;
            let playerDisplay = '👥 Все игроки';
            if (fine.playerName && fine.playerName !== 'all') {
                const user = allUsers.find(u => u.$id === fine.playerId || u.username === fine.playerName);
                playerDisplay = user ? `👤 ${user.username || user.email}` : `👤 ${fine.playerName}`;
            }
            
            html += `
                <div class="fine-item">
                    <div class="fine-info">
                        <span class="fine-amount">-${formatCurrency(fine.amount)}</span>
                        <span class="fine-reason">${fine.reason || "Без причины"}</span>
                        <span class="fine-player">${playerDisplay}</span>
                        <span class="fine-date">${fine.date}</span>
                    </div>
                    <button class="fine-remove" data-id="${fine.$id}">✕</button>
                </div>
            `;
        });
        
        html += `
            <div class="fine-total">
                <span>💰 Итого штрафов: -${formatCurrency(totalFines)}</span>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.querySelectorAll(".fine-remove").forEach((btn) => {
            btn.addEventListener("click", function () {
                const id = this.dataset.id;
                removeFine(id);
            });
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки штрафов:', error);
    }
}

// Удаление штрафа из БД
async function removeFine(id) {
    if (!confirm("Удалить этот штраф?")) return;
    
    try {
        await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            'fines',
            id
        );
        
        await loadFines();
        refreshSalaryTable();
        showToast("Штраф удален", "info");
    } catch (error) {
        console.error('❌ Ошибка удаления штрафа:', error);
        showToast("Ошибка: " + error.message, "error");
    }
}

// Добавление штрафа в БД
async function addFine(amount, reason, playerId = 'all') {
    try {
        let playerName = 'all';
        let playerDisplayName = 'Все игроки';
        
        if (playerId !== 'all') {
            const user = allUsers.find(u => (u.$id || u.id) === playerId);
            if (user) {
                playerName = user.username || user.email || 'all';
                playerDisplayName = user.username || user.email || 'Все игроки';
            } else {
                playerName = playerId;
                playerDisplayName = playerId;
            }
        }
        
        const fineData = {
            playerId: playerId,
            playerName: playerName,
            amount: amount,
            reason: reason || "Штраф",
            date: new Date().toLocaleDateString("ru-RU"),
            timestamp: Date.now(),
        };
        
        console.log('📝 Добавление штрафа в БД:', fineData);
        
        await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            'fines',
            'unique()',
            fineData
        );
        
        await loadFines();
        refreshSalaryTable();
        showToast(`✅ Штраф добавлен для ${playerDisplayName}`, "success");
    } catch (error) {
        console.error('❌ Ошибка добавления штрафа:', error);
        showToast("Ошибка: " + error.message, "error");
    }
}


// Очистка всех штрафов из БД
async function clearAllFines() {
    if (!confirm("🗑 Удалить ВСЕ штрафы?")) return;
    
    try {
        const fines = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'fines'
        );
        
        console.log('🗑 Удаление всех штрафов:', fines.documents.length);
        
        for (const fine of fines.documents) {
            await database.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                'fines',
                fine.$id
            );
        }
        
        await loadFines();
        refreshSalaryTable();
        showToast("Все штрафы удалены", "success");
    } catch (error) {
        console.error('❌ Ошибка очистки штрафов:', error);
        showToast("Ошибка очистки: " + error.message, "error");
    }
}

// ==================== ДОПОЛНИТЕЛЬНЫЙ ЗАРАБОТОК (С БД) ====================

// Загрузка дополнительных заработков из БД
async function loadExtraEarnings() {
    try {
        const extras = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            'extraEarnings',
            [Appwrite.Query.orderDesc("timestamp")]
        );
        
        window._extraEarnings = extras;
        
        const container = document.getElementById("extraList");
        if (!container) return;
        
        console.log('📋 Загрузка дополнительных заработков из БД:', extras.length);
        
        if (extras.length === 0) {
            container.innerHTML = '<p style="color: var(--gray); font-size: 14px;">📭 Дополнительных заработков нет</p>';
            return;
        }
        
        let html = "";
        let totalExtra = 0;
        extras.forEach((item) => {
            totalExtra += item.amount;
            html += `
                <div class="extra-item">
                    <div class="extra-info">
                        <span class="extra-amount">+${formatCurrency(item.amount)}</span>
                        <span class="extra-player">👤 ${item.playerName || 'Неизвестен'}</span>
                        <span class="extra-event">📝 ${item.event || 'Без события'}</span>
                        <span class="extra-date">📅 ${item.date}</span>
                    </div>
                    <button class="extra-remove" data-id="${item.$id}">✕</button>
                </div>
            `;
        });
        
        html += `
            <div class="extra-total">
                <span>💰 Итого дополнительных: +${formatCurrency(totalExtra)}</span>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.querySelectorAll(".extra-remove").forEach((btn) => {
            btn.addEventListener("click", function () {
                const id = this.dataset.id;
                removeExtraEarning(id);
            });
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки доп. заработков:', error);
    }
}

// Добавление дополнительного заработка в БД
async function addExtraEarning(playerId, eventName, amount) {
    try {
        const user = allUsers.find(u => (u.$id || u.id) === playerId);
        const playerName = user?.username || user?.email || "Неизвестен";
        
        const extraData = {
            playerId: playerId,
            playerName: playerName,
            event: eventName || "Доп. заработок",
            amount: amount,
            date: new Date().toLocaleDateString("ru-RU"),
            timestamp: Date.now(),
        };
        
        console.log('📝 Добавление дополнительного заработка в БД:', extraData);
        
        await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            'extraEarnings',
            'unique()',
            extraData
        );
        
        await loadExtraEarnings();
        refreshSalaryTable();
        showToast(`✅ Доп. заработок добавлен для ${playerName}`, "success");
    } catch (error) {
        console.error('❌ Ошибка добавления доп. заработка:', error);
        showToast("Ошибка: " + error.message, "error");
    }
}

// Удаление дополнительного заработка из БД
async function removeExtraEarning(id) {
    if (!confirm("Удалить эту запись?")) return;
    
    try {
        await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            'extraEarnings',
            id
        );
        
        await loadExtraEarnings();
        refreshSalaryTable();
        showToast("Запись удалена", "info");
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        showToast("Ошибка: " + error.message, "error");
    }
}


// Очистка всех дополнительных заработков из БД
async function clearAllExtraEarnings() {
    if (!confirm("🗑 Удалить ВСЕ дополнительные заработки?")) return;
    
    try {
        const extras = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'extraEarnings'
        );
        
        console.log('🗑 Удаление всех доп. заработков:', extras.documents.length);
        
        for (const extra of extras.documents) {
            await database.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                'extraEarnings',
                extra.$id
            );
        }
        
        await loadExtraEarnings();
        refreshSalaryTable();
        showToast("Все дополнительные заработки удалены", "success");
    } catch (error) {
        console.error('❌ Ошибка очистки доп. заработков:', error);
        showToast("Ошибка очистки: " + error.message, "error");
    }
}

// Загрузка игроков для дополнительного заработка
async function loadPlayersForExtra() {
    const select = document.getElementById("extraPlayerSelect");
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">⏳ Загрузка...</option>';
    select.disabled = true;
    
    try {
        const startDate = document.getElementById("salaryDateStart")?.value;
        const endDate = document.getElementById("salaryDateEnd")?.value;
        
        let activePlayers = [];
        
        const users = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.usersCollectionId
        );
        allUsers = users.documents || [];
        window.allUsers = allUsers;
        
        if (startDate && endDate) {
            const reportsData = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.reportsCollectionId,
                [
                    Appwrite.Query.equal("is_approved", true),
                    Appwrite.Query.greaterThanEqual("date", startDate),
                    Appwrite.Query.lessThanEqual("date", endDate)
                ]
            );
            
            const activeUserIds = new Set();
            reportsData.documents.forEach(report => {
                if (report.user_id) {
                    let userId = report.user_id;
                    if (typeof userId === 'object' && userId !== null) {
                        userId = userId.$id || userId.id || String(userId);
                    } else {
                        userId = String(userId);
                    }
                    activeUserIds.add(userId);
                }
            });
            
            activePlayers = allUsers.filter(user => {
                const userId = user.$id || user.id || String(user);
                return activeUserIds.has(String(userId));
            });
        } else {
            activePlayers = allUsers;
        }
        
        select.innerHTML = '<option value="">Выберите игрока...</option>';
        
        if (activePlayers.length === 0) {
            select.innerHTML = '<option value="">📭 Нет активных игроков</option>';
            select.disabled = false;
            return;
        }
        
        activePlayers.sort((a, b) => {
            const nameA = a.username || a.email || '';
            const nameB = b.username || b.email || '';
            return nameA.localeCompare(nameB);
        });
        
        activePlayers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.$id || user.id;
            option.textContent = user.username || user.email || 'Без имени';
            select.appendChild(option);
        });
        
        if (currentValue) {
            const exists = activePlayers.some(u => (u.$id || u.id) === currentValue);
            if (exists) select.value = currentValue;
        }
        
        select.disabled = false;
        console.log('✅ Список игроков для доп. заработка загружен:', activePlayers.length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки игроков:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
        select.disabled = false;
    }
}

// Делаем функции глобальными
window.loadExtraEarnings = loadExtraEarnings;
window.addExtraEarning = addExtraEarning;
window.removeExtraEarning = removeExtraEarning;
window.clearAllExtraEarnings = clearAllExtraEarnings;
window.loadPlayersForExtra = loadPlayersForExtra;

document.addEventListener("DOMContentLoaded", function () {
    if (currentUserRole === "leader") {
        // Убираем отсюда вызов loadPlayersForFines()
        loadPrices();
        loadFines();
        console.log("📥 Цены и штрафы загружены при старте");
        
        // ====== ЗАГРУЖАЕМ ИСТОРИЮ ПОСЛЕ ЗАГРУЗКИ ДАННЫХ ======
        setTimeout(async () => {
            await loadUserData();
            if (currentUserRole === "leader") {
                await loadHistoryPlayers();
                await loadSalaryHistory();
            }
        }, 500);
    }
});

// ==================== АВТОРИЗАЦИЯ ====================
if (authToggle) {
    authToggle.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authSubmitBtn.textContent = isLoginMode ? "LOGIN" : "REGISTER";
        authToggle.innerHTML = isLoginMode
            ? 'Нет аккаунта? <a href="#">Зарегистрироваться</a>'
            : 'Уже есть аккаунт? <a href="#">Войти</a>';
        authError.textContent = "";
        authError.style.color = "#ff4444";
        if (usernameField)
            usernameField.style.display = isLoginMode ? "none" : "block";
        if (authUsername) {
            if (isLoginMode) {
                authUsername.removeAttribute("required");
                authUsername.value = "";
            } else {
                authUsername.setAttribute("required", "required");
            }
        }
    });
}

if (authForm) {
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authError.textContent = "";
        authError.style.color = "#ff4444";

        const email = authEmail.value.trim();
        const password = authPassword.value.trim();
        let username = "";

        if (!isLoginMode) {
            username = authUsername.value.trim();
            if (!username) {
                authError.textContent = "Введите ваш игровой ник!";
                showToast("Введите игровой ник", "warning");
                return;
            }
        }

        if (!email || !password) {
            authError.textContent = "Заполните все поля!";
            showToast("Заполните все поля", "warning");
            return;
        }

        try {
            if (isLoginMode) {
                console.log("🔐 Попытка входа:", email);

                try {
                    const currentUser = await account.get();
                    if (currentUser) {
                        console.log(
                            "🔄 Обнаружена активная сессия, завершаем...",
                        );
                        await account.deleteSession("current");
                        console.log("✅ Старая сессия завершена");
                    }
                } catch (e) {
                    console.log("ℹ️ Активной сессии нет");
                }

                await account.createEmailPasswordSession(email, password);
                console.log("✅ Сессия создана");

                const user = await account.get();
                console.log("👤 Пользователь:", user.email);

                currentUser = user;
                currentUserId = user.$id;
                currentUserNickname = user.name || email.split("@")[0];
                await loadUserData();
                showApp();
                showToast(
                    `Добро пожаловать, ${currentUserNickname}!`,
                    "success",
                );
            } else {
                console.log("📝 Регистрация:", email);

                await account.create("unique()", email, password, username);
                await database.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.usersCollectionId,
                    "unique()",
                    { username, email, role: "member" },
                );

                authError.style.color = "#4ade80";
                authError.textContent = "Регистрация успешна! Теперь войдите.";
                showToast("Регистрация успешна! Теперь войдите.", "success");
                isLoginMode = true;
                authSubmitBtn.textContent = "LOGIN";
                authToggle.innerHTML =
                    'Нет аккаунта? <a href="#">Зарегистрироваться</a>';
                authPassword.value = "";
                authUsername.value = "";
                if (usernameField) usernameField.style.display = "none";
                if (authUsername) authUsername.removeAttribute("required");
            }
        } catch (error) {
            console.error("❌ Ошибка авторизации:", error);
            authError.style.color = "#ff4444";

            let errorMessage = "Произошла ошибка. Попробуйте позже.";
            if (error.message) {
                const msg = error.message.toLowerCase();
                if (
                    msg.includes("invalid login credentials") ||
                    msg.includes("invalid credentials")
                ) {
                    errorMessage =
                        "Неверный email или пароль. Проверьте данные.";
                } else if (msg.includes("user already exists")) {
                    errorMessage = "Этот email уже зарегистрирован. Войдите.";
                } else if (msg.includes("password should be at least")) {
                    errorMessage = "Пароль должен быть минимум 6 символов.";
                } else if (msg.includes("rate limit")) {
                    errorMessage = "Слишком много попыток. Подождите немного.";
                } else if (
                    msg.includes("network error") ||
                    msg.includes("failed to fetch")
                ) {
                    errorMessage =
                        "Ошибка сети. Проверьте подключение к интернету.";
                } else if (msg.includes("session is active")) {
                    errorMessage =
                        "Сессия уже активна. Попробуйте обновить страницу.";
                } else {
                    errorMessage = error.message;
                }
            }
            authError.textContent = errorMessage;
            showToast(errorMessage, "error");
        }
    });
}

// ==================== ВЫХОД ====================
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await account.deleteSession("current");
            console.log("✅ Выход выполнен");
        } catch (error) {
            console.warn("⚠️ Ошибка выхода:", error);
        }
        currentUser = null;
        currentUserRole = null;
        currentUserId = null;
        currentUserNickname = null;
        allUsers = [];
        allReports = [];
        showAuth();
        showToast("Вы вышли из системы", "info");
        if (sidebar) sidebar.classList.remove("open");
    });
}

// ==================== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================
async function loadUserData() {
    try {
        console.log("🔍 Загрузка данных пользователя:", currentUser?.email);
        
        if (!currentUser || !currentUser.email) {
            console.warn("⚠️ currentUser не определен");
            // Пытаемся получить пользователя из сессии
            try {
                const user = await account.get();
                if (user) {
                    currentUser = user;
                    currentUserId = user.$id;
                    currentUserNickname = user.name || user.email.split("@")[0];
                    console.log("✅ Пользователь получен из сессии:", user.email);
                } else {
                    return;
                }
            } catch (e) {
                console.warn("⚠️ Не удалось получить пользователя из сессии:", e.message);
                return;
            }
        }

        if (!currentUser || !currentUser.email) {
            console.warn("⚠️ currentUser все еще не определен");
            return;
        }

        const users = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.usersCollectionId,
            [Appwrite.Query.equal("email", currentUser.email)]
        );

        console.log("📋 Найдено пользователей:", users.documents.length);

        if (users.documents.length > 0) {
            const userData = users.documents[0];
            currentUserRole = userData.role || "member";
            currentUserNickname = userData.username || currentUser.name || "Пользователь";
            currentUserId = userData.$id;
            
            window.currentUserId = currentUserId;
            window.currentUserRole = currentUserRole;
            window.currentUserNickname = currentUserNickname;
            window.currentUser = currentUser;
            
            console.log("👤 Данные из БД:", { 
                nickname: currentUserNickname, 
                role: currentUserRole,
                userId: currentUserId 
            });
        } else {
            console.log("⚠️ Пользователь не найден в БД, создаем...");
            try {
                const newUser = await database.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.usersCollectionId,
                    "unique()",
                    {
                        username: currentUser.name || currentUser.email.split("@")[0],
                        email: currentUser.email,
                        role: "member"
                    }
                );
                currentUserRole = "member";
                currentUserNickname = newUser.username;
                currentUserId = newUser.$id;
                
                window.currentUserId = currentUserId;
                window.currentUserRole = currentUserRole;
                window.currentUserNickname = currentUserNickname;
                window.currentUser = currentUser;
                
                console.log("✅ Пользователь создан в БД, ID:", currentUserId);
            } catch (e) {
                console.error("❌ Ошибка создания пользователя:", e);
                // Создаем локальные данные
                currentUserRole = "member";
                currentUserNickname = currentUser.name || currentUser.email.split("@")[0];
                currentUserId = currentUser.$id;
                
                window.currentUserId = currentUserId;
                window.currentUserRole = currentUserRole;
                window.currentUserNickname = currentUserNickname;
                window.currentUser = currentUser;
            }
        }

        forceUpdateHeader();
        console.log("✅ Заголовок обновлен:", { 
            nickname: currentUserNickname, 
            role: currentUserRole,
            userId: currentUserId 
        });

    } catch (error) {
        console.error("❌ Ошибка загрузки данных пользователя:", error);
        // Устанавливаем значения по умолчанию, если они еще не установлены
        if (!currentUserRole) {
            currentUserRole = "member";
        }
        if (!currentUserNickname && currentUser) {
            currentUserNickname = currentUser.name || currentUser.email?.split("@")[0] || "Пользователь";
        }
        if (!currentUserId && currentUser) {
            currentUserId = currentUser.$id;
        }
        
        window.currentUserId = currentUserId;
        window.currentUserRole = currentUserRole;
        window.currentUserNickname = currentUserNickname;
        window.currentUser = currentUser;
        
        forceUpdateHeader();
    }
}

// ==================== ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ЗАГОЛОВКА ====================
function forceUpdateHeader() {
    const displayName =
        currentUserNickname || currentUser?.email || "Пользователь";
    const displayRole =
        currentUserRole === "leader" ? "👑 Лидер" : "👤 Участник";

    const nameEl = document.getElementById("headerUsername");
    const roleEl = document.getElementById("headerRole");
    const sidebarNameEl = document.getElementById("sidebarUsername");
    const sidebarRoleEl = document.getElementById("sidebarRole");

    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = displayRole;
    if (sidebarNameEl) sidebarNameEl.textContent = displayName;
    if (sidebarRoleEl) sidebarRoleEl.textContent = displayRole;
}

// ==================== ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ ====================
function showAuth() {
    if (authPage) authPage.style.display = "flex";
    if (appPage) appPage.style.display = "none";
}

function showApp() {
    if (authPage) authPage.style.display = "none";
    if (appPage) appPage.style.display = "block";

    // ====== ЗАГРУЖАЕМ ЦЕНЫ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ======
    loadPrices();

    // ====== ДОБАВЛЯЕМ КЛАСС ДЛЯ ЛИДЕРА ======
    if (currentUserRole === "leader") {
        document.body.classList.add('leader-mode');
    } else {
        document.body.classList.remove('leader-mode');
    }

    const leaderPanel = document.getElementById("salaryLeaderPanel");
    if (leaderPanel) {
        if (currentUserRole === "leader") {
            leaderPanel.style.display = "block";
            setTimeout(() => {
                loadFines();
                loadExtraEarnings();
                // loadPrices(); // <-- УБИРАЕМ ОТСЮДА (уже загружено выше)
                setTimeout(() => {
                    updatePriceInputs();
                }, 100);
                loadUsers().then(() => {
                    loadPlayersForFines();
                    loadPlayersForExtra();
                });
                loadSalaryHistory();
                loadHistoryPlayers();
                
                const historyGroup = document.getElementById("historyPlayerGroup");
                if (historyGroup) {
                    historyGroup.style.display = "flex";
                }
                
                const savedPeriod = loadSalaryPeriod();
                if (savedPeriod.start && savedPeriod.end) {
                    document.getElementById("salaryDateStart").value = savedPeriod.start;
                    document.getElementById("salaryDateEnd").value = savedPeriod.end;
                    console.log('🔄 Восстановлен период:', savedPeriod.start, '—', savedPeriod.end);
                    
                    setTimeout(() => {
                        const calcBtn = document.getElementById("calculateSalaryBtn");
                        if (calcBtn) {
                            calcBtn.click();
                        }
                    }, 500);
                } else {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    document.getElementById("salaryDateStart").value = start.toISOString().split("T")[0];
                    document.getElementById("salaryDateEnd").value = end.toISOString().split("T")[0];
                }
            }, 300);
        } else {
            leaderPanel.style.display = "none";
            
            const historyGroup = document.getElementById("historyPlayerGroup");
            if (historyGroup) {
                historyGroup.style.display = "none";
            }
        }
    }

    forceUpdateHeader();
    setTimeout(() => forceUpdateHeader(), 500);

    renderNotifications();
    loadUsers();
    setupDefaultDate();
}

// ==================== НАСТРОЙКА ДАТЫ ====================
function setupDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("reportDate");
    if (dateInput) dateInput.value = today;
}

// ==================== ЗАГРУЗКА УЧАСТНИКОВ ====================
async function loadUsers() {
    try {
        const users = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.usersCollectionId
        );
        
        allUsers = users || [];
        allUsers.forEach(user => {
            user._id = user.$id || user.id || String(user);
        });
        window.allUsers = allUsers;
        updateFilter();
        return allUsers;
    } catch (error) {
        console.error("Ошибка загрузки участников:", error);
        return [];
    }
}


// ==================== ОБНОВЛЕНИЕ ФИЛЬТРА ====================
function updateFilter() {
    const filterSelect = document.getElementById("filterMember");
    const filterGroup = document.getElementById("filterMemberGroup");
    const refreshBtn = document.getElementById("refreshUsersBtn");
    if (!filterSelect) return;
    if (currentUserRole === "leader") {
        filterGroup.style.display = "flex";
        if (refreshBtn) refreshBtn.style.display = "inline-block";
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">👥 Все участники</option>';
        allUsers.forEach((user) => {
            const option = document.createElement("option");
            option.value = user.$id;
            option.textContent = user.username || "Без имени";
            filterSelect.appendChild(option);
        });
        if (currentValue) filterSelect.value = currentValue;
    } else {
        filterGroup.style.display = "none";
        if (refreshBtn) refreshBtn.style.display = "none";
    }
}

// ==================== ЗАГРУЗКА ОТЧЕТОВ ====================
let isLoadingReports = false;
async function loadReports() {
    if (isLoadingReports) {
        console.log('⏳ Загрузка отчетов уже выполняется...');
        return;
    }
    
    isLoadingReports = true;
    
    try {
        if (!currentUserId || !currentUser) {
            console.log('⏳ Ожидание загрузки пользователя...');
            await loadUserData();
        }
        
        if (!currentUserId) {
            console.error('❌ Невозможно загрузить отчеты: пользователь не авторизован');
            hideSkeleton();
            isLoadingReports = false;
            return;
        }
        
        console.log('🔍 Загрузка отчетов для userId:', currentUserId);
        console.log('🔍 Роль пользователя:', currentUserRole);
        
        const container = document.getElementById("reportsList");
        if (container) {
            container.innerHTML = '';
        }
        
        showSkeleton();
        
        let queries = [Appwrite.Query.orderDesc("date")];
        
        if (currentUserRole !== "leader" && currentUserId) {
            queries.push(Appwrite.Query.equal("user_id", currentUserId));
            console.log('👤 Обычный игрок, фильтр по user_id:', currentUserId);
        } else {
            console.log('👑 Лидер, загружаем ВСЕ отчеты');
        }
        
        const documents = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            queries
        );
        
        allReports = documents || [];
        window.allReports = allReports;
        
        console.log('📋 Всего загружено отчетов:', allReports.length);
        
        await loadPaymentsForReports();
        
        allReports.sort((a, b) => {
            if (a.is_approved !== b.is_approved) {
                return a.is_approved ? 1 : -1;
            }
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return b.$createdAt?.localeCompare(a.$createdAt || '') || 0;
        });
        
        renderReports();
        renderPlayersStats();
        await updateStats();
        hideSkeleton();
        
    } catch (error) {
        console.error("Ошибка загрузки отчетов:", error);
        showToast("Ошибка загрузки отчетов: " + error.message, "error");
        hideSkeleton();
    } finally {
        isLoadingReports = false;
    }
}


// ==================== ПОЛУЧЕНИЕ ФИЛЬТРОВАННЫХ ОТЧЕТОВ ====================
function getFilteredReports() {
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
    if (memberFilter) {
        const selectedUser = allUsers.find((u) => u.$id === memberFilter);
        if (selectedUser) {
            filtered = filtered.filter(
                (r) => r.user_name === selectedUser.username,
            );
        }
    }
    
    // ====== СОРТИРОВКА: СНАЧАЛА "ОЖИДАЕТ", ПОТОМ "УТВЕРЖДЕН" ======
    filtered.sort((a, b) => {
        // Сначала сортируем по статусу: false (ожидает) -> true (утвержден)
        if (a.is_approved !== b.is_approved) {
            return a.is_approved ? 1 : -1;
        }
        // Если статус одинаковый - сортируем по дате (новые сверху)
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        // Если дата одинаковая - по времени создания (новые сверху)
        return b.$createdAt?.localeCompare(a.$createdAt || '') || 0;
    });
    
    return filtered;
}

// ==================== РЕНДЕРИНГ ====================
// ====== ФУНКЦИЯ ДЛЯ ПОСТРОЕНИЯ КАРТОЧКИ ОТЧЕТА ======
function buildReportCard(report) {
    const images = report.images ? report.images.split(",") : [];
    const isLeader = currentUserRole === "leader";
    let galleryHtml = "";
    images.forEach((imgId, imgIndex) => {
        const fileUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${imgId}/view?project=${APPWRITE_CONFIG.projectId}`;
        galleryHtml += `<img src="${fileUrl}" alt="скриншот" onclick="window.openGallery('${report.$id}', ${imgIndex})">`;
    });
    
    const displayDate = report.date
        ? new Date(report.date + "T00:00:00").toLocaleDateString("ru-RU", {
              day: "2-digit", month: "2-digit", year: "numeric"
          })
        : "Нет даты";
    
    const timeDisplay = report.time_start && report.time_end
        ? `${report.time_start} — ${report.time_end}`
        : report.time || report.time_start || report.time_end || '';
    
    const userId = window.currentUserId || currentUserId;
    let authorId = report.user_id;
    if (typeof authorId === 'object' && authorId !== null) {
        authorId = authorId.$id || authorId.id || String(authorId);
    } else {
        authorId = String(authorId);
    }
    const isAuthor = String(authorId) === String(userId);
    
    const approveBtn = isLeader && !report.is_approved
        ? `<button class="btn-action btn-approve" onclick="window.approveReport('${report.$id}')">✅ Утвердить</button>`
        : "";
    
    const canEdit = isLeader || (isAuthor && !report.is_approved);
    const editBtn = canEdit
        ? `<button class="btn-action btn-edit" onclick="window.editReport('${report.$id}')">✏️ Редактировать</button>`
        : "";
    
    const canDelete = isLeader || (isAuthor && !report.is_approved);
    const deleteBtn = canDelete
        ? `<button class="btn-action btn-delete" onclick="window.deleteReport('${report.$id}')">🗑 Удалить</button>`
        : "";
    
    // ====== СТАТУС УТВЕРЖДЕНИЯ ======
    const approvedBadge = report.is_approved
        ? '<span class="badge-approved">✅ Утвержден</span>'
        : '<span class="badge-pending">⏳ Ожидает</span>';
    
    // ====== СТАТУС ВЫПЛАТЫ ======
    let paymentBadge = '';
    if (report.is_approved) {
        const isPaid = window._paidReportIds && window._paidReportIds.has(report.$id);
        
        // ====== ДОБАВЛЯЕМ ЛОГИРОВАНИЕ ======
        console.log(`🔍 Отчет ${report.$id}: isPaid = ${isPaid}`);
        
        if (isPaid) {
            paymentBadge = '<span class="badge-paid">💰 Выплачен</span>';
        } else {
            paymentBadge = '<span class="badge-unpaid">⏳ Ожидают выплаты</span>';
        }
    }
    
    const createdAt = report.$createdAt 
        ? new Date(report.$createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '';
    
    const updatedAt = report.$updatedAt && report.$updatedAt !== report.$createdAt
        ? new Date(report.$updatedAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '';

    return `
        <div class="block-report" data-report-id="${report.$id}">
            <div class="report-text">
                <div class="report-date-display">
                    <span class="report-date-label">📅 DATE</span>
                    <span class="report-date-value">${displayDate}</span>
                </div>
                <div class="event">
                    <p class="title-mptime">🎯 EVENT</p>
                    <p class="text-mptime">${report.event}</p>  
                </div>
                <div class="time">
                    <p class="title-mptime">⏰ TIME</p>
                    <p class="text-mptime">${timeDisplay}</p>
                </div>
                ${report.description ? `<p class="report-description">${report.description}</p>` : ""}
                <div class="report-meta">
                    <span class="report-author">👤 ${report.user_name || "Неизвестен"}</span>
                    ${approvedBadge}
                    ${paymentBadge}
                </div>
                <div class="report-timestamps">
                    <span class="report-created">📅 Создан: ${createdAt}</span>
                    ${updatedAt ? `<span class="report-edited">✏️ Изменен: ${updatedAt}</span>` : ''}
                </div>
                <div class="report-actions">
                    ${approveBtn}
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
            <div class="report-gallery">
                ${galleryHtml}
            </div>
        </div>
    `;
}

// ====== ОБНОВЛЕННАЯ ФУНКЦИЯ renderReports ======
function renderReports() {
    const container = document.getElementById("reportsList");
    if (!container) {
        console.warn('⚠️ Контейнер reportsList не найден');
        return;
    }
    
    // ====== ЕСЛИ НЕТ ОТЧЕТОВ ======
    if (!allReports || allReports.length === 0) {
        console.log('📭 Отчетов нет');
        container.innerHTML = `
            <div class="empty-reports">
                <p>📭 Отчетов пока нет</p>
                <span>Добавьте первый отчет через форму выше</span>
            </div>
        `;
        const reportCount = document.getElementById("reportCount");
        if (reportCount) reportCount.textContent = "0 отчетов";
        return;
    }
    
    const filtered = getFilteredReports();
    console.log('📋 Отфильтровано отчетов:', filtered.length);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-reports">
                <p>📭 Ничего не найдено</p>
                <span>Попробуйте изменить фильтры</span>
            </div>
        `;
        const reportCount = document.getElementById("reportCount");
        if (reportCount) reportCount.textContent = "0 отчетов";
        return;
    }
    
    const reportCount = document.getElementById("reportCount");
    if (reportCount) {
        const pendingCount = filtered.filter(r => !r.is_approved).length;
        const approvedCount = filtered.filter(r => r.is_approved).length;
        reportCount.innerHTML = `
            ${filtered.length} отчетов
            <span style="color: var(--yellow); margin-left: 10px;">⏳ ${pendingCount}</span>
            <span style="color: var(--green); margin-left: 5px;">✅ ${approvedCount}</span>
        `;
    }
    
    // ====== ЗАГРУЖАЕМ ВЫПЛАТЫ ДЛЯ СТАТУСА ======
    loadPaymentsForReports().then(() => {
        const pendingReports = filtered.filter(r => !r.is_approved);
        const approvedReports = filtered.filter(r => r.is_approved);
        
        let html = '';
        
        if (pendingReports.length > 0) {
            html += `<div class="report-status-divider">
                <span class="divider-label">⏳ Ожидают утверждения (${pendingReports.length})</span>
            </div>`;
            pendingReports.forEach(report => {
                html += buildReportCard(report);
            });
        }
        
        if (approvedReports.length > 0) {
            html += `<div class="report-status-divider">
                <span class="divider-label">✅ Утверждены (${approvedReports.length})</span>
            </div>`;
            approvedReports.forEach(report => {
                html += buildReportCard(report);
            });
        }
        
        container.innerHTML = html;
    }).catch(error => {
        console.warn('⚠️ Ошибка загрузки выплат:', error);
        const pendingReports = filtered.filter(r => !r.is_approved);
        const approvedReports = filtered.filter(r => r.is_approved);
        
        let html = '';
        if (pendingReports.length > 0) {
            html += `<div class="report-status-divider">
                <span class="divider-label">⏳ Ожидают утверждения (${pendingReports.length})</span>
            </div>`;
            pendingReports.forEach(report => {
                html += buildReportCard(report);
            });
        }
        if (approvedReports.length > 0) {
            html += `<div class="report-status-divider">
                <span class="divider-label">✅ Утверждены (${approvedReports.length})</span>
            </div>`;
            approvedReports.forEach(report => {
                html += buildReportCard(report);
            });
        }
        container.innerHTML = html;
    });
}

// ==================== СТАТИСТИКА ====================
async function updateStats() {
    const total = allReports.length;
    let totalImages = 0;
    const events = new Set();
    let pending = 0;
    let approved = 0;
    
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let weeklyReports = 0;
    let totalEarned = 0;
    const prices = window._prices || JSON.parse(localStorage.getItem('eventPrices') || '{}');
    
    const dayCounts = { 'Пн': 0, 'Вт': 0, 'Ср': 0, 'Чт': 0, 'Пт': 0, 'Сб': 0, 'Вс': 0 };
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const activeUsers = new Set();
    
    // ====== ПОДСЧЕТ ВЫПЛАЧЕННЫХ СУММ ======
    let totalPaid = 0;
    try {
        const paymentsData = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );
        paymentsData.forEach(p => {
            totalPaid += p.amount || 0;
        });
        console.log('💳 Всего выплачено:', totalPaid);
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить выплаты:', error);
    }
    
    allReports.forEach((r) => {
        if (r.images) totalImages += r.images.split(",").length;
        events.add(r.event);
        if (r.is_approved) approved++;
        else pending++;
        
        if (r.date) {
            const reportDate = new Date(r.date + 'T00:00:00');
            if (reportDate >= weekAgo && reportDate <= now) {
                weeklyReports++;
                if (r.user_id) {
                    activeUsers.add(r.user_id);
                }
                const dayIndex = reportDate.getDay();
                const dayName = dayNames[dayIndex];
                if (dayCounts[dayName] !== undefined) {
                    dayCounts[dayName]++;
                }
            }
        }
    });
    
    document.getElementById("totalReports").textContent = total;
    document.getElementById("totalImages").textContent = totalImages;
    document.getElementById("uniqueEvents").textContent = events.size;
    document.getElementById("pendingApproval").textContent = pending;
    
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    if (progressBar && progressText) {
        const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
        progressBar.style.width = percentage + "%";
        progressText.textContent = `${approved} из ${total} утверждены (${percentage}%)`;
    }
    
    document.getElementById("sidebarTotalReports").textContent = total;
    document.getElementById("sidebarPendingApproval").textContent = pending;
    
    const familyMembers = document.getElementById("familyMembers");
    if (familyMembers) {
        familyMembers.textContent = allUsers.length || 0;
    }
    
    const weeklyReportsEl = document.getElementById("weeklyReports");
    if (weeklyReportsEl) {
        weeklyReportsEl.textContent = weeklyReports;
    }
    
    // ====== ВСЕГО ВЫПЛАЧЕНО (сумма всех выплат) ======
    const totalEarnedEl = document.getElementById("totalEarned");
    if (totalEarnedEl) {
        totalEarnedEl.textContent = formatCurrency(totalPaid);
    }
    
    const activePlayersEl = document.getElementById("activePlayers");
    if (activePlayersEl) {
        activePlayersEl.textContent = activeUsers.size;
    }
    
    const maxCount = Math.max(...Object.values(dayCounts), 1);
    document.querySelectorAll('.day-bar').forEach(bar => {
        const day = bar.dataset.day;
        const count = dayCounts[day] || 0;
        const height = (count / maxCount) * 100;
        const barElement = bar.querySelector('.bar');
        if (barElement) {
            barElement.style.height = Math.max(height, 4) + '%';
            barElement.title = `${day}: ${count} отчетов`;
        }
    });
}

// ==================== ГАЛЕРЕЯ ====================
let currentImageList = [];
let currentImageIndex = 0;

window.openGallery = function (reportId, imageIndex) {
    const report = allReports.find((r) => r.$id === reportId);
    if (!report) return;
    currentImageList = report.images ? report.images.split(",") : [];
    currentImageIndex = imageIndex;
    showImage(currentImageIndex);
    const overlay = document.getElementById("globalOverlay");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
};

function showImage(index) {
    if (!currentImageList.length) return;
    if (index < 0) index = currentImageList.length - 1;
    if (index >= currentImageList.length) index = 0;
    currentImageIndex = index;
    const fullImage = document.getElementById("globalFullImage");
    const counter = document.getElementById("imageCounter");
    if (fullImage) {
        const fileUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${currentImageList[index]}/view?project=${APPWRITE_CONFIG.projectId}`;
        fullImage.src = fileUrl;
    }
    if (counter)
        counter.textContent = `${index + 1} / ${currentImageList.length}`;
}

function closeOverlayHandler() {
    const overlay = document.getElementById("globalOverlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
    currentImageList = [];
}

document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.getElementById("closeOverlay");
    const overlay = document.getElementById("globalOverlay");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");
    if (closeBtn) closeBtn.addEventListener("click", closeOverlayHandler);
    if (overlay)
        overlay.addEventListener("click", function (e) {
            if (e.target === this) closeOverlayHandler();
        });
    if (prevBtn)
        prevBtn.addEventListener("click", function () {
            showImage(currentImageIndex - 1);
        });
    if (nextBtn)
        nextBtn.addEventListener("click", function () {
            showImage(currentImageIndex + 1);
        });
});

// ==================== ДОБАВЛЕНИЕ ОТЧЕТА ====================
document.addEventListener("DOMContentLoaded", function () {
    const addBtn = document.getElementById("addReportBtn");
    if (addBtn) {
        addBtn.addEventListener("click", async function () {
            // ====== ЗАЩИТА ОТ ДВОЙНОГО КЛИКА ======
            if (this.disabled) {
                console.log('⏳ Отчет уже добавляется, подождите...');
                return;
            }
            
            // Блокируем кнопку
            this.disabled = true;
            const originalText = this.textContent;
            this.textContent = '⏳ Adding';
            
            try {
                const date = document.getElementById("reportDate")?.value;
                const event = document.getElementById("reportEvent")?.value;
                const timeStart = document.getElementById("reportTimeStart")?.value;
                const timeEnd = document.getElementById("reportTimeEnd")?.value;
                const description = document.getElementById("reportDescription")?.value.trim();
                const files = document.getElementById("reportImages")?.files;
                
                if (!date || !event || !timeStart || !timeEnd) {
                    showToast("Заполните ДАТУ, СОБЫТИЕ, ВРЕМЯ НАЧАЛА и ВРЕМЯ КОНЦА!", "warning");
                    this.disabled = false;
                    this.textContent = originalText;
                    return;
                }
                if (!files || files.length === 0) {
                    showToast("Выберите хотя бы один скриншот!", "warning");
                    this.disabled = false;
                    this.textContent = originalText;
                    return;
                }
                if (!currentUserId) {
                    showToast("Пользователь не авторизован!", "error");
                    console.error("❌ currentUserId =", currentUserId);
                    this.disabled = false;
                    this.textContent = originalText;
                    return;
                }
                
                const imageIds = [];
                for (const file of files) {
                    const result = await storage.createFile(
                        APPWRITE_CONFIG.bucketId,
                        "unique()",
                        file
                    );
                    imageIds.push(result.$id);
                }
                const imagesString = imageIds.join(",");
                const authorName = currentUserNickname || "Неизвестен";
                
                const timeString = `${timeStart} — ${timeEnd}`;
                
                console.log("📤 Создание отчета:");
                console.log("  user_id:", currentUserId);
                console.log("  user_name:", authorName);
                console.log("  date:", date);
                console.log("  event:", event);
                console.log("  time:", timeString);
                console.log("  time_start:", timeStart);
                console.log("  time_end:", timeEnd);
                
                const result = await database.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.reportsCollectionId,
                    "unique()",
                    {
                        user_id: String(currentUserId),
                        user_name: authorName,
                        date: date,
                        event: event,
                        time: timeString,
                        time_start: timeStart,
                        time_end: timeEnd,
                        description: description || "",
                        images: imagesString,
                        is_approved: false,
                    }
                );
                
                console.log("✅ Отчет создан:", result);
                showToast("Отчет успешно добавлен!", "success");
                clearForm();
                showSkeleton();
                loadReports();
                updateStats();
                
            } catch (error) {
                console.error("❌ Ошибка добавления отчета:", error);
                showToast("Ошибка добавления отчета: " + error.message, "error");
            } finally {
                // ====== РАЗБЛОКИРУЕМ КНОПКУ ======
                this.disabled = false;
                this.textContent = originalText;
            }
        });
    }
});

// ==================== УТВЕРЖДЕНИЕ ====================
window.approveReport = async function (id) {
    if (!confirm("Утвердить этот отчет?")) return;
    try {
        const report = allReports.find(r => r.$id === id);
        const result = await database.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            id,
            {
                is_approved: true
            }
        );
        console.log("✅ Отчет утвержден:", result);
        
        if (report && report.user_id) {
            let authorId = report.user_id;
            if (typeof authorId === 'object' && authorId !== null) {
                authorId = authorId.$id || authorId.id || String(authorId);
            } else {
                authorId = String(authorId);
            }
            
            const authorName = report.user_name || 'Игрок';
            const formattedDate = formatDateForNotification(report.date);
            const timeDisplay = report.time_start && report.time_end
                ? `${report.time_start} — ${report.time_end}`
                : report.time || report.time_start || report.time_end || 'время не указано';
            
            await addNotification(
                authorId,
                'Отчет утвержден',
                `<p сlass="addNotifName"><strong>${authorName}</strong>, ваш отчет от <strong>${formattedDate}</strong> (${report.event}) был утвержден! 🎉</p>
                <p class="addNotifTime">⏰ <strong>Время:</strong> ${timeDisplay}</p>
                `,
                'approved',
                id
            );
        }
        
        showToast("Отчет утвержден!", "success");
        loadReports();
        updateStats();
        renderNotifications();
    } catch (error) {
        console.error("❌ Ошибка утверждения:", error);
        showToast("Ошибка: " + error.message, "error");
    }
};

// ==================== УДАЛЕНИЕ ОТЧЕТА ====================
window.deleteReport = async function (id) {
    console.log('🗑 deleteReport вызван для ID:', id);
    
    // Находим отчет
    const report = allReports.find(r => r.$id === id);
    if (!report) {
        showToast('Отчет не найден', 'error');
        return;
    }
    
    console.log('📄 Найден отчет:', report);
    
    // Проверяем права
    const isLeader = currentUserRole === "leader";
    let authorId = report.user_id;
    if (typeof authorId === 'object' && authorId !== null) {
        authorId = authorId.$id || authorId.id || String(authorId);
    } else {
        authorId = String(authorId);
    }
    const isAuthor = String(authorId) === String(window.currentUserId || currentUserId);
    
    console.log('🔍 Права:', { isLeader, isAuthor, authorId, currentUserId: window.currentUserId || currentUserId });
    
    if (!isLeader && !isAuthor) {
        showToast('У вас нет прав на удаление этого отчета', 'error');
        return;
    }
    
    // Если лидер - показываем модальное окно с причиной
    if (isLeader) {
        console.log('👑 Лидер удаляет отчет, открываем модальное окно');
        
        const modal = document.getElementById('deleteReportModal');
        const closeBtn = document.getElementById('deleteReportModalClose');
        const cancelBtn = document.getElementById('deleteReportCancel');
        const form = document.getElementById('deleteReportForm');
        const reasonTextarea = document.getElementById('deleteReportReason');
        const errorEl = document.getElementById('deleteReportError');
        const submitBtn = document.getElementById('deleteReportSubmitBtn');
        
        // Проверяем, что все элементы найдены
        if (!modal) {
            console.error('❌ Модальное окно deleteReportModal не найдено!');
            showToast('Ошибка: модальное окно не найдено', 'error');
            // Используем обычный confirm как fallback
            if (!confirm('Удалить этот отчет?')) return;
            await performDeleteReport(id, report, 'Причина не указана', isLeader);
            return;
        }
        
        if (!form) {
            console.error('❌ Форма deleteReportForm не найдена!');
            showToast('Ошибка: форма не найдена', 'error');
            return;
        }
        
        // Очищаем поля
        reasonTextarea.value = '';
        errorEl.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = '🗑 DELETE';
        
        // Открываем модальное окно
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ Модальное окно открыто');
        
        const closeModal = function() {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            form.removeEventListener('submit', submitHandler);
            if (closeBtn) closeBtn.removeEventListener('click', closeModal);
            if (cancelBtn) cancelBtn.removeEventListener('click', closeModal);
            submitBtn.disabled = false;
            submitBtn.textContent = '🗑 DELETE';
            console.log('✅ Модальное окно закрыто');
        };
        
        const submitHandler = async function(e) {
            e.preventDefault();
            console.log('📝 Форма удаления отправлена');
            
            const reason = reasonTextarea.value.trim();
            
            if (!reason) {
                errorEl.textContent = '⚠️ Укажите причину удаления!';
                errorEl.style.display = 'block';
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Deleting...';
            
            try {
                await performDeleteReport(id, report, reason, isLeader);
                closeModal();
            } catch (error) {
                console.error('❌ Ошибка удаления:', error);
                errorEl.textContent = '❌ Ошибка: ' + error.message;
                errorEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '🗑 DELETE';
            }
        };
        
        // Назначаем обработчики
        form.addEventListener('submit', submitHandler);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        return;
    }
    
    // Если не лидер - просто confirm
    if (!confirm('Удалить этот отчет?')) return;
    await performDeleteReport(id, report, 'Отчет удален автором', false);
};

// Основная функция удаления
async function performDeleteReport(id, report, reason, isLeader = false) {
    try {
        console.log('🗑 Выполняется удаление отчета:', id);
        
        await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            id
        );
        
        if (isLeader && report.user_id) {
            let authorId = report.user_id;
            if (typeof authorId === 'object' && authorId !== null) {
                authorId = authorId.$id || authorId.id || String(authorId);
            } else {
                authorId = String(authorId);
            }
            
            const authorName = report.user_name || 'Игрок';
            const formattedDate = formatDateForNotification(report.date);
            const timeDisplay = report.time_start && report.time_end
                ? `${report.time_start} — ${report.time_end}`
                : report.time || report.time_start || report.time_end || 'время не указано';
            
            await addNotification(
                authorId,
                'Отчет удален',
                `<p class="addNotifName"><strong>${authorName}</strong>, ваш отчет от <strong>${formattedDate}</strong> (${report.event}) был удален лидером.</p>
                <p class="addNotifTime">⏰ <strong>Время:</strong> ${timeDisplay}</p>
                <p class="addNotifReason"><strong>Причина:</strong> ${reason}</p>`,
                'deleted',
                id
            );
            
            showToast(`Отчет удален! Уведомление отправлено автору.`, 'info');
        } else {
            showToast('Отчет удален', 'info');
        }
        
        await loadReports();
        await updateStats();
        await renderNotifications();
        
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        showToast('Ошибка: ' + error.message, 'error');
        throw error;
    }
}

// ==================== КЛЕАР ФОРМЫ ====================
function clearForm() {
    document.getElementById("reportEvent").value = "";
    document.getElementById("reportTimeStart").value = "";
    document.getElementById("reportTimeEnd").value = "";
    document.getElementById("reportDescription").value = "";
    document.getElementById("reportImages").value = "";
    document.getElementById("filePreview").innerHTML = "";
    setupDefaultDate();
}

// ==================== ПРЕДПРОСМОТР ====================
document.addEventListener("DOMContentLoaded", function () {
    const imagesInput = document.getElementById("reportImages");
    if (imagesInput) {
        imagesInput.addEventListener("change", function () {
            const preview = document.getElementById("filePreview");
            if (!preview) return;
            preview.innerHTML = "";
            Array.from(this.files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const item = document.createElement("div");
                    item.className = "preview-item";
                    item.innerHTML = `
                        <img src="${ev.target.result}" alt="превью">
                        <button class="preview-remove" data-index="${index}">✕</button>
                    `;
                    preview.appendChild(item);
                    item.querySelector(".preview-remove").addEventListener(
                        "click",
                        function () {
                            const dt = new DataTransfer();
                            const files = Array.from(imagesInput.files);
                            const idx = parseInt(this.dataset.index);
                            const remaining = files.filter((_, i) => i !== idx);
                            remaining.forEach((f) => dt.items.add(f));
                            imagesInput.files = dt.files;
                            this.closest(".preview-item").remove();
                            document
                                .querySelectorAll(".preview-remove")
                                .forEach((btn, i) => (btn.dataset.index = i));
                        },
                    );
                };
                reader.readAsDataURL(file);
            });
        });
    }
});

// ==================== ЭКСПОРТ ====================
document.addEventListener("DOMContentLoaded", function () {
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            if (allReports.length === 0) {
                showToast("Нет отчетов для экспорта!", "warning");
                return;
            }
            const data = {
                exportedAt: new Date().toISOString(),
                author: currentUserNickname || "Пользователь",
                totalReports: allReports.length,
                reports: allReports,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `отчеты_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Отчеты экспортированы!", "success");
        });
    }
});

// ==================== БЫСТРЫЕ ФИЛЬТРЫ ====================
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", function () {
            document
                .querySelectorAll(".chip")
                .forEach((c) => c.classList.remove("active"));
            this.classList.add("active");
            const filter = this.dataset.filter;
            const filterEvent = document.getElementById("filterEvent");
            const filterStatus = document.getElementById("filterStatus");
            const filterDateStart = document.getElementById("filterDateStart");
            const filterDateEnd = document.getElementById("filterDateEnd");
            if (filterEvent) filterEvent.value = "";
            if (filterStatus) filterStatus.value = "";
            if (filterDateStart) filterDateStart.value = "";
            if (filterDateEnd) filterDateEnd.value = "";
            if (filter === "all") {
            } else if (filter === "pending") {
                if (filterStatus) filterStatus.value = "pending";
            } else if (filter === "approved") {
                if (filterStatus) filterStatus.value = "approved";
            } else {
                if (filterEvent) filterEvent.value = filter;
            }
            renderReports();
        });
    });

    const filters = [
        "filterDateStart",
        "filterDateEnd",
        "filterEvent",
        "filterStatus",
        "filterMember",
    ];
    filters.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", function () {
                document
                    .querySelectorAll(".chip")
                    .forEach((c) => c.classList.remove("active"));
                renderReports();
            });
        }
    });

    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            [
                "filterDateStart",
                "filterDateEnd",
                "filterEvent",
                "filterStatus",
                "filterMember",
            ].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });
            document
                .querySelectorAll(".chip")
                .forEach((c) => c.classList.remove("active"));
            document
                .querySelector('.chip[data-filter="all"]')
                ?.classList.add("active");
            renderReports();
            showToast("Фильтры сброшены", "info");
        });
    }
});

// ==================== КНОПКА ОБНОВЛЕНИЯ СПИСКА ====================
document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refreshUsersBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", async function () {
            this.textContent = "⏳ Loading...";
            this.disabled = true;
            try {
                await loadUsers();
                showToast(
                    `Список обновлен! Загружено участников: ${allUsers.length}`,
                    "success",
                );
            } catch (error) {
                showToast("Ошибка загрузки: " + error.message, "error");
            } finally {
                this.textContent = "🔄 Update list";
                this.disabled = false;
            }
        });
    }
});

// ==================== КЛАВИАТУРА ====================
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeOverlayHandler();
        if (sidebar) sidebar.classList.remove("open");
    }
    if (
        e.key === "ArrowLeft" &&
        document.getElementById("globalOverlay")?.classList.contains("active")
    ) {
        showImage(currentImageIndex - 1);
    }
    if (
        e.key === "ArrowRight" &&
        document.getElementById("globalOverlay")?.classList.contains("active")
    ) {
        showImage(currentImageIndex + 1);
    }
});

// ==================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ====================
document.addEventListener("DOMContentLoaded", function () {
    const forgotPasswordBtn = document.getElementById("forgotPassword");
    const resetModal = document.getElementById("resetPasswordModal");
    const resetModalClose = document.getElementById("resetModalClose");
    const resetModalCancel = document.getElementById("resetModalCancel");
    const resetForm = document.getElementById("resetPasswordForm");
    const resetEmail = document.getElementById("resetEmail");
    const resetMessage = document.getElementById("resetMessage");
    const resetSubmitBtn = document.getElementById("resetSubmitBtn");

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (resetModal) {
                resetModal.style.display = "flex";
                resetEmail.value = "";
                resetMessage.textContent = "";
                resetMessage.style.color = "";
            }
        });
    }

    if (resetModalClose) {
        resetModalClose.addEventListener("click", function () {
            resetModal.style.display = "none";
        });
    }

    if (resetModalCancel) {
        resetModalCancel.addEventListener("click", function () {
            resetModal.style.display = "none";
        });
    }

    if (resetModal) {
        resetModal.addEventListener("click", function (e) {
            if (e.target === this) {
                resetModal.style.display = "none";
            }
        });
    }

    if (resetForm) {
        resetForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = resetEmail.value.trim();

            if (!email) {
                resetMessage.textContent = "⚠️ Введите ваш email";
                resetMessage.style.color = "var(--red)";
                return;
            }

            try {
                resetSubmitBtn.disabled = true;
                resetSubmitBtn.textContent = "⏳ Sending...";
                resetMessage.textContent = "⏳ Проверка email...";
                resetMessage.style.color = "var(--gray)";

                const users = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.usersCollectionId,
                    [Appwrite.Query.equal("email", email)],
                );

                if (users.documents.length === 0) {
                    resetMessage.textContent =
                        "Пользователь с таким email не найден";
                    resetMessage.style.color = "var(--red)";
                    resetSubmitBtn.disabled = false;
                    resetSubmitBtn.textContent = "📤 Send a link";
                    return;
                }

                const user = users.documents[0];
                console.log("👤 Пользователь найден:", user.username);

                const token =
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15);

                const tokens = JSON.parse(
                    localStorage.getItem("recovery_tokens") || "[]",
                );
                tokens.push({
                    userId: user.$id,
                    email: email,
                    token: token,
                    expiresAt: new Date(
                        Date.now() + 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    used: false,
                });
                localStorage.setItem("recovery_tokens", JSON.stringify(tokens));

                const resetLink =
                    window.location.origin +
                    "/reset-password.html?token=" +
                    token +
                    "&email=" +
                    encodeURIComponent(email);
                console.log("🔗 Ссылка для сброса:", resetLink);

                const templateParams = {
                    email: email,
                    reset_link: resetLink,
                    year: new Date().getFullYear(),
                    from_name: "THE WOCKHARDT MANDEM",
                };

                if (typeof emailjs !== "undefined") {
                    emailjs.init("w8UDmoZozOMrw4Wd8");

                    const result = await emailjs.send(
                        "service_8qzwnhj",
                        "template_a8285mp",
                        templateParams,
                    );

                    console.log("Письмо отправлено:", result);

                    resetMessage.textContent =
                        "Ссылка для восстановления отправлена на " + email;
                    resetMessage.style.color = "var(--green)";
                    resetSubmitBtn.textContent = "Send";

                    setTimeout(() => {
                        resetModal.style.display = "none";
                        resetSubmitBtn.disabled = false;
                        resetSubmitBtn.textContent = "📤 Отправить ссылку";
                    }, 3000);
                } else {
                    resetMessage.textContent =
                        "⚠️ EmailJS не загружен. Ссылка для отладки: " +
                        resetLink;
                    resetMessage.style.color = "var(--yellow)";
                    resetSubmitBtn.disabled = false;
                    resetSubmitBtn.textContent = "📤 Отправить ссылку";
                    console.log("🔗 Ссылка для отладки:", resetLink);
                }
            } catch (error) {
                console.error("❌ Ошибка:", error);
                resetMessage.textContent = "❌ Ошибка: " + error.message;
                resetMessage.style.color = "var(--red)";
                resetSubmitBtn.disabled = false;
                resetSubmitBtn.textContent = "📤 Отправить ссылку";
            }
        });
    }
});

// ==================== САЙДБАР ====================
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");

    if (!sidebar || !mobileMenuBtn) {
        console.warn("⚠️ Элементы сайдбара не найдены");
        return;
    }

    mobileMenuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const authPage = document.getElementById("authPage");
        if (authPage && authPage.style.display !== "none") {
            return;
        }
        sidebar.classList.toggle("open");
        console.log("Сайдбар toggled:", sidebar.classList.contains("open"));
    });

    if (sidebarClose) {
        sidebarClose.addEventListener("click", function () {
            sidebar.classList.remove("open");
            console.log("Сайдбар закрыт крестиком");
        });
    }

    document.addEventListener("click", function (e) {
        if (window.innerWidth <= 992) {
            const isClickInsideSidebar = sidebar?.contains(e.target);
            const isClickOnMenuBtn = mobileMenuBtn?.contains(e.target);

            if (
                !isClickInsideSidebar &&
                !isClickOnMenuBtn &&
                sidebar?.classList.contains("open")
            ) {
                sidebar.classList.remove("open");
                console.log("Сайдбар закрыт кликом вне");
            }
        }
    });

    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener("click", function () {
            const logoutMain = document.getElementById("logoutBtn");
            if (logoutMain) {
                logoutMain.click();
            }
            sidebar.classList.remove("open");
        });
    }
});

// ==================== ВКЛАДКИ (САЙДБАР) ====================
document.addEventListener("DOMContentLoaded", function () {
    const navBtns = document.querySelectorAll(".sidebar-nav-btn");
    const tabContents = {
        dashboard: document.getElementById("tab-dashboard"),
        reports: document.getElementById("tab-reports"),
        salary: document.getElementById("tab-salary"),
        academy: document.getElementById("tab-academy"),
        notifications: document.getElementById("tab-notifications"),
    };

    function switchTab(tabId) {
        localStorage.setItem("activeTab", tabId);

        navBtns.forEach((b) => b.classList.remove("active"));
        navBtns.forEach((b) => {
            if (b.dataset.tab === tabId) {
                b.classList.add("active");
            }
        });

        Object.keys(tabContents).forEach((key) => {
            if (tabContents[key]) {
                tabContents[key].style.display = "none";
            }
        });

        if (tabContents[tabId]) {
            tabContents[tabId].style.display = "block";
        }

        const sidebar = document.getElementById("sidebar");
        if (sidebar && window.innerWidth <= 992) {
            sidebar.classList.remove("open");
        }

        if (tabId === "dashboard") {
            setTimeout(() => {
                loadReports();
                updateStats();
            }, 50);
        }

        if (tabId === "reports") {
            console.log('📋 Переход на вкладку "Отчеты", обновляем данные...');
            setTimeout(async () => {
                // ====== ПРОВЕРЯЕМ, АВТОРИЗОВАН ЛИ ПОЛЬЗОВАТЕЛЬ ======
                if (!currentUserId || !currentUser) {
                    console.log('⏳ Ожидание загрузки пользователя...');
                    try {
                        await loadUserData();
                    } catch (e) {
                        console.error('❌ Ошибка загрузки пользователя:', e);
                        return;
                    }
                }
                
                // ====== ЕСЛИ ПОСЛЕ ЗАГРУЗКИ ВСЕ РАВНО НЕТ USER_ID ======
                if (!currentUserId) {
                    console.error('❌ Пользователь не авторизован, пропускаем загрузку отчетов');
                    hideSkeleton();
                    return;
                }
                
                console.log('👤 Загружаем отчеты для пользователя:', currentUserId, 'роль:', currentUserRole);
                await loadReports();
                renderPlayersStats();
                updateStats();
            }, 100);
        }

        if (tabId === "salary") {
            setTimeout(async () => {
                // ====== УБЕЖДАЕМСЯ, ЧТО ПОЛЬЗОВАТЕЛЬ ЗАГРУЖЕН ======
                if (!currentUserId || !currentUser) {
                    console.log('⏳ Ожидание загрузки пользователя...');
                    await loadUserData();
                }
                
                // ====== ЗАГРУЖАЕМ ЦЕНЫ ======
                loadPrices();
                
                // ====== СКРЫВАЕМ РЕЗУЛЬТАТЫ ======
                const salaryResults = document.getElementById("salaryResults");
                const salaryLoading = document.getElementById("salaryLoading");
                const totalSumEl = document.getElementById("totalSalarySum");
                const historyGroup = document.getElementById("historyPlayerGroup");
                
                if (currentUserRole !== "leader") {
                    if (salaryResults) salaryResults.style.display = "none";
                    if (salaryLoading) salaryLoading.style.display = "none";
                    if (totalSumEl) totalSumEl.parentElement.style.display = "none";
                    if (historyGroup) historyGroup.style.display = "none";
                    
                    console.log('👤 Загружаем зарплату для обычного игрока');
                    await loadPlayerSalary();
                    return;
                }
                
                // ====== ДЛЯ ЛИДЕРА ======
                if (currentUserRole === "leader") {
                    loadFines();
                    loadExtraEarnings();
                    setTimeout(() => {
                        updatePriceInputs();
                    }, 100);
                    await loadPlayersForFines();
                    await loadPlayersForExtra();
                    
                    if (historyGroup) {
                        historyGroup.style.display = "flex";
                    }
                    if (totalSumEl) {
                        totalSumEl.parentElement.style.display = "flex";
                    }
                }
                
                if (typeof loadHistoryPlayers === "function") {
                    await loadHistoryPlayers();
                }
                if (typeof loadSalaryHistory === "function") {
                    await loadSalaryHistory();
                }
                
                setTimeout(() => {
                    const calcBtn = document.getElementById("calculateSalaryBtn");
                    if (calcBtn) {
                        calcBtn.click();
                    }
                }, 300);
            }, 100);
        }



        if (tabId === "notifications") {
            setTimeout(async () => {
                document.querySelectorAll(".notification-filter").forEach(b => b.classList.remove("active"));
                const allFilter = document.querySelector('.notification-filter[data-filter="all"]');
                if (allFilter) allFilter.classList.add("active");
                await renderNotifications("all");
            }, 300);
        }
    }

    navBtns.forEach((btn) => {
        btn.addEventListener("click", function () {
            const tab = this.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });

    const savedTab = localStorage.getItem("activeTab");
    let targetTab = "dashboard";

    if (savedTab && tabContents[savedTab]) {
        targetTab = savedTab;
    }

    // При загрузке страницы сначала загружаем данные пользователя, потом вкладку
    setTimeout(async () => {
        await loadUserData();
        switchTab(targetTab);
    }, 100);

    window.switchTab = switchTab;
});

// ==================== ПРОВЕРКА АВТОРИЗАЦИИ ====================
async function checkAuth() {
    const loadingIndicator = document.getElementById("loadingIndicator");

    try {
        // ====== ПРОВЕРЯЕМ СЕССИЮ ======
        let session = null;
        try {
            session = await account.getSession("current");
        } catch (e) {
            console.log("ℹ️ Нет активной сессии:", e.message);
        }
        
        if (session) {
            console.log("✅ Сессия найдена:", session.userId);
            
            let user = null;
            try {
                user = await account.get();
            } catch (e) {
                console.log("❌ Ошибка получения пользователя:", e.message);
                showAuth();
                return;
            }
            
            if (!user) {
                console.log("❌ Пользователь не получен");
                showAuth();
                return;
            }
            
            console.log("👤 Пользователь авторизован:", user.email);
            currentUser = user;
            currentUserId = user.$id;
            currentUserNickname = user.name || user.email.split("@")[0];
            
            // ====== ЗАГРУЖАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ======
            try {
                await loadUserData();
                console.log("✅ Данные пользователя загружены:", { 
                    userId: currentUserId, 
                    role: currentUserRole,
                    nickname: currentUserNickname 
                });
            } catch (e) {
                console.error("❌ Ошибка загрузки данных пользователя:", e);
                // Если не удалось загрузить данные, создаем пользователя по умолчанию
                currentUserRole = "member";
                currentUserNickname = user.name || user.email.split("@")[0];
                window.currentUserRole = currentUserRole;
                window.currentUserNickname = currentUserNickname;
            }
            
            // ====== ПОКАЗЫВАЕМ ПРИЛОЖЕНИЕ ======
            showApp();
            
            // ====== ЗАГРУЖАЕМ ОТЧЕТЫ ======
            setTimeout(async () => {
                try {
                    await loadReports();
                    await updateStats();
                } catch (e) {
                    console.error("❌ Ошибка загрузки отчетов:", e);
                }
            }, 200);
            
            if (currentUserRole === "leader") {
                setTimeout(async () => {
                    try {
                        await loadHistoryPlayers();
                        await loadSalaryHistory();
                    } catch (e) {
                        console.error("❌ Ошибка загрузки истории:", e);
                    }
                }, 300);
            }
        } else {
            console.log("👤 Сессия не найдена, показываем авторизацию");
            showAuth();
        }
    } catch (error) {
        console.error("❌ Ошибка проверки авторизации:", error);
        showAuth();
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.opacity = "0";
            setTimeout(() => {
                loadingIndicator.style.display = "none";
            }, 500);
        }
    }
}


// ==================== ОТЛАДКА ====================
window.debugPayments = async function () {
    try {
        console.log("=== ОТЛАДКА ВЫПЛАТ ===");

        const allPayments = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            "payments",
        );
        console.log("Все выплаты:", allPayments.documents);
        console.log("currentUser:", currentUser);
        console.log("currentUserId:", currentUserId);
        console.log("currentUserNickname:", currentUserNickname);

        if (currentUser) {
            const users = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.usersCollectionId,
                [Appwrite.Query.equal("email", currentUser.email)],
            );
            console.log("Пользователь в БД:", users.documents[0]);

            if (users.documents[0]) {
                const userId = users.documents[0].$id;
                const username = users.documents[0].username;

                const byUserId = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    "payments",
                    [Appwrite.Query.equal("userId", userId)],
                );
                console.log("По userId:", byUserId.documents);

                const byName = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    "payments",
                    [Appwrite.Query.equal("playerName", username)],
                );
                console.log("По имени:", byName.documents);
            }
        }
    } catch (error) {
        console.error("Ошибка отладки:", error);
    }
};

// ==================== ЗАРПЛАТА ====================
let loadPlayerSalaryFn = null;
let loadSalaryHistoryFn = null;
let payPlayerFn = null;

// ==================== ПОСТРОЕНИЕ ТАБЛИЦЫ ЗАРПЛАТЫ ====================
function buildSalaryTable(playersList, playersData, allEvents, finePerPlayer) {
    const table = document.getElementById('salaryTable');
    if (!table) return;
    
    let html = `<table>
        <thead>
            <tr>
                <th>#</th>
                <th>Игрок</th>
                <th>✅ Утв.</th>
                <th>⏳ Ожид.</th>`;
    
    allEvents.forEach(e => {
        html += `<th>${e}</th>`;
    });
    
    html += `<th>💰 Зарплата</th>
                <th>⚖️ Штраф</th>
                <th>💵 Итого</th>
                <th>Статус</th>
                <th>Действие</th>
            </tr>
        </thead>
        <tbody>`;

    let totalSum = 0;
    playersList.forEach((name, index) => {
        const player = playersData[name];
        const afterFine = player.total - finePerPlayer;
        totalSum += afterFine;
        const isPaid = player.paid;
        
        html += `<tr>
            <td>${index + 1}</td>
            <td><strong>${name}</strong></td>
            <td style="color: var(--green);">${player.approvedCount}</td>
            <td style="color: var(--yellow);">${player.pendingCount}</td>`;
        
        allEvents.forEach(e => {
            const count = player.events[e] || 0;
            html += `<td>${count > 0 ? count : '-'}</td>`;
        });
        
        // ====== ИСПРАВЛЕННАЯ ЧАСТЬ ======
        html += `<td><strong>${formatCurrency(player.total)}</strong></td>
                <td style="color: var(--red);">-${formatCurrency(finePerPlayer)}</td>
                <td><strong style="color: ${afterFine >= 0 ? 'var(--green)' : 'var(--red)'};">${formatCurrency(afterFine)}</strong></td>
                <td><span class="${isPaid ? 'status-paid' : 'status-unpaid'}">${isPaid ? '✅ Выплачено' : '⏳ Ожидает'}</span></td>
                <td>
                    ${isPaid 
                        ? '<span class="btn-paid">Выплачено</span>'
                        : `<button class="btn-pay" data-player="${encodeURIComponent(name)}" data-amount="${afterFine}">💰 Выплатить</button>`
                    }
                </td>
            </tr>`;
    });

    html += `</tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="${allEvents.length + 4}" style="text-align: right;">💰 Общая сумма:</td>
                <td><strong>${formatCurrency(totalSum)}</strong></td>
                <td></td>
            </tr>
        </tfoot>
    </table>`;
    
    table.innerHTML = html;
    
    const totalSumEl = document.getElementById('totalSalarySum');
    if (totalSumEl) {
        totalSumEl.textContent = formatCurrency(totalSum);
    }
    
    // Обработчики кнопок выплаты
    document.querySelectorAll('.btn-pay').forEach(btn => {
        btn.addEventListener('click', function() {
            if (isProcessingPayment) {
                console.log('⏳ Выплата уже выполняется, игнорируем клик');
                return;
            }
            const playerName = decodeURIComponent(this.dataset.player);
            const amount = parseInt(this.dataset.amount);
            const startDate = document.getElementById('salaryDateStart').value;
            const endDate = document.getElementById('salaryDateEnd').value;
            payPlayer(playerName, amount, startDate, endDate);
        });
    });
}

// ====== ОБРАБОТЧИК КНОПКИ ВЫПЛАТЫ ======
function payHandler(e) {
    // Если уже идет выплата - игнорируем
    if (isPaying) {
        console.log('⏳ Выплата уже выполняется, игнорируем клик');
        return;
    }
    
    const btn = e.currentTarget;
    const playerName = decodeURIComponent(btn.dataset.player);
    const amount = parseInt(btn.dataset.amount);
    const startDate = document.getElementById('salaryDateStart').value;
    const endDate = document.getElementById('salaryDateEnd').value;
    
    // Блокируем кнопку
    btn.disabled = true;
    btn.textContent = '⏳';
    
    payPlayer(playerName, amount, startDate, endDate).finally(() => {
        // Разблокируем кнопку (если она еще существует)
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💰 Выплатить';
        }
    });
}

// ==================== ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ФИЛЬТРЕ ====================
function updateFilterInfo(filterValue, count) {
    const filterInfo = document.getElementById("salaryFilterInfo");
    if (!filterInfo) return;

    const labels = {
        all: "Все игроки",
        paid: "✅ Выплачено",
        unpaid: "⏳ Ожидают выплату",
    };

    filterInfo.textContent = `${labels[filterValue] || "Все игроки"} (${count})`;
}

// ==================== ИСТОРИЯ ВЫПЛАТ ====================
async function loadSalaryHistory() {
    const container = document.getElementById("salaryHistory");
    if (!container) {
        console.log("❌ Контейнер salaryHistory не найден");
        return;
    }

    try {
        if (!currentUserRole && currentUser?.email) {
            console.log("🔄 Роль не определена, загружаем...");
            await loadUserData();
            return loadSalaryHistory();
        }

        console.log("🔄 Загрузка истории...");

        const dateStart = document.getElementById("historyDateStart")?.value || "";
        const dateEnd = document.getElementById("historyDateEnd")?.value || "";
        
        const isLeader = currentUserRole === "leader";
        
        // ====== ДЛЯ ОБЫЧНОГО ИГРОКА - ТОЛЬКО ЕГО ВЫПЛАТЫ ======
        let userId = null;
        
        if (isLeader) {
            const select = document.getElementById("historyPlayerSelect");
            const selectedPlayerId = select?.value || "";
            if (selectedPlayerId) {
                userId = selectedPlayerId;
            }
            console.log("👑 Лидер, фильтр по игроку:", userId || "все");
        } else {
            userId = currentUserId;
            console.log("👤 Обычный игрок, только свои выплаты:", userId);
        }

        const historyGroup = document.getElementById("historyPlayerGroup");
        if (historyGroup) {
            if (isLeader) {
                historyGroup.style.display = "flex";
            } else {
                historyGroup.style.display = "none";
            }
        }

        const totalSumEl = document.getElementById("totalSalarySum");
        if (totalSumEl) {
            if (isLeader) {
                totalSumEl.parentElement.style.display = "flex";
            } else {
                totalSumEl.parentElement.style.display = "none";
            }
        }

        let queries = [Appwrite.Query.orderDesc("timestamp")];

        if (userId) {
            queries.push(Appwrite.Query.equal("userId", userId));
            console.log("🔍 Фильтр по userId:", userId);
        }

        let historyData = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            "payments",
            queries
        );
        let payments = historyData || [];

        if (dateStart) {
            const startDate = new Date(dateStart);
            payments = payments.filter((p) => {
                const pDate = new Date(p.timestamp || 0);
                return pDate >= startDate;
            });
        }

        if (dateEnd) {
            const endDate = new Date(dateEnd);
            endDate.setHours(23, 59, 59, 999);
            payments = payments.filter((p) => {
                const pDate = new Date(p.timestamp || 0);
                return pDate <= endDate;
            });
        }

        console.log("📋 Найдено записей после фильтрации:", payments.length);

        let totalAmount = 0;
        let paymentCount = payments.length;
        let lastPayment = null;

        if (payments.length > 0) {
            const sorted = [...payments].sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });

            lastPayment = sorted[0];

            payments.forEach((p) => {
                totalAmount += p.amount || 0;
            });
        }

        if (payments.length === 0) {
            let emptyMessage = "📭 История выплат пуста";
            if (isLeader && userId) {
                const foundUser = allUsers.find(
                    (u) => u.$id === userId,
                );
                emptyMessage = `📭 У игрока ${foundUser?.username || ""} нет выплат`;
            }
            container.innerHTML = `
                <div class="history-empty">
                    <span class="history-empty-icon">📭</span>
                    <p>${emptyMessage}</p>
                    ${dateStart || dateEnd ? `<p class="history-empty-sub">🔍 Фильтр по дате активен. Попробуйте сбросить фильтр.</p>` : ""}
                </div>
            `;
            return;
        }

        let html = `
            <div class="history-stats">
                <div class="history-stat">
                    <div class="history-stat-label">💰 Общая сумма</div>
                    <div class="history-stat-value">${formatCurrency(totalAmount)}</div>
                    ${dateStart || dateEnd ? `<div class="history-stat-sub">за выбранный период</div>` : '<div class="history-stat-sub">за всё время</div>'}
                </div>
                <div class="history-stat">
                    <div class="history-stat-label">📊 Количество выплат</div>
                    <div class="history-stat-value gray">${paymentCount}</div>
                </div>
                <div class="history-stat">
                    <div class="history-stat-label">📅 Последняя выплата</div>
                    <div class="history-stat-value green">${lastPayment ? formatCurrency(lastPayment.amount) : "—"}</div>
                    <div class="history-stat-sub">${lastPayment ? lastPayment.date : ""}</div>
                </div>
            </div>
        `;

        html += `<div class="history-list">`;
        
        payments.forEach((item) => {
            let playerDisplay = item.playerName || 'Неизвестен';
            if (item.userId) {
                const user = allUsers.find(u => u.$id === item.userId);
                if (user && user.username) {
                    playerDisplay = user.username;
                }
            }
            
            const reportCount = item.reportCount || (item.reportIds ? item.reportIds.split(',').length : 0);
            const reportCountDisplay = reportCount > 0 ? `📋 ${reportCount} отч.` : '';
            
            const deleteBtn = isLeader
                ? `<button class="btn-delete-history" data-id="${item.$id}">🗑</button>`
                : "";

            html += `
                <div class="history-block">
                    <span class="history-amount">${formatCurrency(item.amount)}</span>
                    <span class="history-player">👤 ${playerDisplay}</span>
                    <span class="history-period">📅 ${item.periodStart || ""} — ${item.periodEnd || ""}</span>
                    <span class="history-paidby">👤 ${item.paidBy || "Лидер"}</span>
                    ${reportCountDisplay ? `<span class="history-report-count">${reportCountDisplay}</span>` : ''}
                    ${deleteBtn}
                </div>
            `;
        });
        html += "</div>";

        container.innerHTML = html;
        console.log("✅ История и статистика загружены!");

        if (isLeader) {
            document.querySelectorAll(".btn-delete-history").forEach((btn) => {
                btn.removeEventListener('click', handleDeleteClick);
                btn.addEventListener('click', handleDeleteClick);
            });
        }
        
    } catch (error) {
        console.error("❌ Ошибка загрузки истории:", error);
        container.innerHTML = `
            <div class="history-empty" style="border-color: var(--red);">
                <span class="history-empty-icon">❌</span>
                <p style="color: var(--red);">Ошибка загрузки истории</p>
                <p class="history-empty-sub">${error.message}</p>
            </div>
        `;
    }
}

// ====== ОБРАБОТЧИК УДАЛЕНИЯ ЗАПИСИ ИЗ ИСТОРИИ ======
async function handleDeleteClick(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    if (!confirm("🗑 Удалить эту запись?")) return;
    try {
        await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            "payments",
            id,
        );
        showToast("Запись удалена", "info");
        await loadSalaryHistory();
        refreshSalaryTable();
    } catch (error) {
        console.error("Ошибка удаления:", error);
        showToast("Ошибка удаления: " + error.message, "error");
    }
}

// ==================== ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ СТАТУСОВ ====================
async function forceUpdateStatus(playerName, startDate, endDate) {
    try {
        console.log("🔄 Принудительное обновление статусов для:", playerName);

        // Загружаем выплаты за период
        const periodPayments = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            "payments",
            [
                Appwrite.Query.equal("periodStart", startDate),
                Appwrite.Query.equal("periodEnd", endDate),
            ],
        );

        console.log("📋 Выплаты за период:", periodPayments.documents);

        const paidNames = new Set();
        const paidUserIds = new Set();
        periodPayments.documents.forEach((p) => {
            paidNames.add(p.playerName);
            if (p.userId) paidUserIds.add(p.userId);
        });

        console.log("💰 Выплаченные имена:", Array.from(paidNames));
        console.log("💰 Выплаченные userId:", Array.from(paidUserIds));

        // Обновляем данные в window._salaryData
        if (window._salaryData && window._salaryData.players) {
            Object.keys(window._salaryData.players).forEach((name) => {
                const player = window._salaryData.players[name];
                // Проверяем по имени и по userId из players
                const isPaid =
                    paidNames.has(name) || paidUserIds.has(player.userId);
                player.paid = isPaid;
                console.log(`  ${name}: paid = ${isPaid}`);
            });
        }

        // Обновляем строку в таблице
        const rows = document.querySelectorAll("#salaryTable tbody tr");
        console.log("📊 Найдено строк:", rows.length);

        rows.forEach((row, index) => {
            const nameCell = row.querySelector("td:nth-child(2)");
            if (nameCell) {
                const name = nameCell.textContent.trim();
                console.log(`  Строка ${index + 1}: ${name}`);

                const statusCell = row.querySelector("td:nth-last-child(2)");
                const actionCell = row.querySelector("td:last-child");

                // Проверяем по имени
                const isPaid = paidNames.has(name);

                if (isPaid) {
                    console.log(`  ✅ ${name} - выплачен, обновляем статус`);
                    if (statusCell) {
                        statusCell.innerHTML =
                            '<span class="status-paid">Выплачено</span>';
                    }
                    if (actionCell) {
                        actionCell.innerHTML =
                            '<span class="btn-paid">Выплачено</span>';
                    }
                } else {
                    console.log(`  ⏳ ${name} - не выплачен`);
                    // Если был статус "Выплачено" но выплаты нет - возвращаем
                    if (
                        statusCell &&
                        statusCell.innerHTML.includes("Выплачено")
                    ) {
                        statusCell.innerHTML =
                            '<span class="status-unpaid">⏳ Ожидает</span>';
                        // Восстанавливаем кнопку
                        if (actionCell) {
                            // Находим сумму для этого игрока
                            const amountCell = row.querySelector(
                                "td:nth-last-child(3)",
                            );
                            if (amountCell) {
                                const amountText =
                                    amountCell.textContent.replace(
                                        /[^0-9]/g,
                                        "",
                                    );
                                const amount = parseInt(amountText) || 0;
                                if (amount > 0) {
                                    actionCell.innerHTML = `<button class="btn-pay" data-player="${encodeURIComponent(name)}" data-amount="${amount}">💰 Выплатить</button>`;
                                }
                            }
                        }
                    }
                }
            }
        });

        // Обновляем общую сумму
        const totalSumEl = document.getElementById("totalSalarySum");
        if (totalSumEl && window._salaryData) {
            let totalPaid = 0;
            Object.keys(window._salaryData.players).forEach((name) => {
                const player = window._salaryData.players[name];
                const afterFine =
                    player.total - (window._salaryData.finePerPlayer || 0);
                if (player.paid) {
                    totalPaid += afterFine;
                }
            });
            totalSumEl.textContent = formatCurrency(totalPaid);
        }

        console.log("✅ Статусы обновлены!");
    } catch (error) {
        console.error("❌ Ошибка обновления статусов:", error);
    }
}

// ==================== ЗАРПЛАТА ИГРОКА (С БД) ====================

async function loadPlayerSalary() {
    const results = document.getElementById("salaryResults");
    const table = document.getElementById("salaryTable");
    const loading = document.getElementById("salaryLoading");

    if (!results || !table || !loading) {
        console.error("❌ Элементы зарплаты не найдены");
        return;
    }

    loading.style.display = "block";
    results.style.display = "none";

    try {
        if (!currentUserId) {
            await loadUserData();
        }

        // ====== ПРИНУДИТЕЛЬНО ЗАГРУЖАЕМ СВЕЖИЕ ЦЕНЫ ИЗ БД ======
        console.log('🔄 Принудительная загрузка свежих цен...');
        await loadPricesFromDB();
        
        const prices = window._prices || JSON.parse(localStorage.getItem("eventPrices") || "{}");
        console.log('📋 Текущие цены для расчета:', prices);

        // ====== ЗАГРУЖАЕМ ВСЕ ВЫПЛАТЫ ======
        const allPayments = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );

        const paidReportIds = new Set();
        allPayments.documents.forEach(p => {
            if (p.reportIds) {
                const ids = p.reportIds.split(',');
                ids.forEach(id => paidReportIds.add(id));
            }
        });
        console.log('💰 Выплаченных отчетов для игрока:', paidReportIds.size);

        // ====== ЗАГРУЖАЕМ ОТЧЕТЫ ИГРОКА ======
        const allReportsData = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            [
                Appwrite.Query.equal("user_id", currentUserId),
                Appwrite.Query.equal("is_approved", true),
            ],
        );

        const reports = allReportsData.documents || [];
        const unpaidReports = reports.filter(r => !paidReportIds.has(r.$id));

        let total = 0;
        let details = "";

        unpaidReports.forEach((r) => {
            const event = r.event || "OTHER";
            // ====== БЕРЕМ ЦЕНУ ИЗ ОБНОВЛЕННЫХ PRICES ======
            const price = prices[event] || 0;
            total += price;
            console.log(`💰 Отчет ${r.$id}: событие "${event}", цена: ${price}`);
            details += `<tr>
                <td>${r.date}</td>
                <td>${r.event}</td>
                <td>${r.time}</td>
                <td><strong>${formatCurrency(price)}</strong></td>
            </tr>`;
        });

        // ====== ЗАГРУЖАЕМ ШТРАФЫ ИЗ БД ======
        let totalFines = 0;
        try {
            const finesResult = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                'fines'
            );
            const fines = finesResult.documents || [];
            console.log('📋 Штрафы из БД:', fines);
            
            fines.forEach(fine => {
                if (fine.playerId === 'all' || 
                    fine.playerId === currentUserId || 
                    fine.playerName === currentUserNickname) {
                    totalFines += fine.amount;
                    console.log(`⚖️ Штраф применен: ${fine.amount} для ${fine.playerName}`);
                }
            });
        } catch (e) {
            console.error('Ошибка загрузки штрафов из БД:', e);
        }

        // ====== ЗАГРУЖАЕМ ДОП. ЗАРАБОТКИ ИЗ БД ======
        let totalExtra = 0;
        try {
            const extrasResult = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                'extraEarnings'
            );
            const extras = extrasResult.documents || [];
            console.log('📋 Доп. заработки из БД:', extras);
            console.log('👤 Имя текущего игрока:', currentUserNickname);
            
            for (const extra of extras) {
                if (extra.playerName === currentUserNickname || extra.playerId === currentUserId) {
                    totalExtra += extra.amount;
                    console.log(`   ✅ ПРИМЕНЕН: +${extra.amount} для ${extra.playerName}`);
                }
            }
            console.log(`➕ Итого доп. заработок: ${totalExtra}`);
        } catch (e) {
            console.error('Ошибка загрузки доп. заработка из БД:', e);
        }

        // ====== ИТОГОВАЯ СУММА ======
        const finalTotal = total - totalFines + totalExtra;

        // ====== БЛОК С ИНФОРМАЦИЕЙ ======
        let html = `
            <div class="salary-player-info">
                <h3>👤 ${currentUserNickname || "Игрок"}</h3>
                <div class="stats">
                    <div class="stat-item">📊 Отчетов: <strong>${unpaidReports.length}</strong></div>
                    <div class="stat-item">💰 Заработано: <strong>${formatCurrency(total)}</strong></div>
                    <div class="stat-item">⚖️ Штрафы: <strong style="color: var(--red);">-${formatCurrency(totalFines)}</strong></div>
                    <div class="stat-item">➕ Доп. заработок: <strong style="color: var(--green);">+${formatCurrency(totalExtra)}</strong></div>
                    <div class="stat-item">💵 Итого: <strong style="color: var(--purple);">${formatCurrency(finalTotal)}</strong></div>
                </div>
            </div>
        `;

        if (unpaidReports.length > 0) {
            html += `
                <h4 style="color: var(--white); margin: 15px 0 10px;">📋 Детали невыплаченных отчетов</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Событие</th>
                            <th>Время</th>
                            <th>Цена</th>
                        </tr>
                    </thead>
                    <tbody>${details}</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right;">💰 Зарплата:</td>
                            <td><strong>${formatCurrency(total)}</strong></td>
                        </tr>
                        ${totalFines > 0 ? `
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right; color: var(--red);">⚖️ Штрафы:</td>
                            <td><strong style="color: var(--red);">-${formatCurrency(totalFines)}</strong></td>
                        </tr>` : ''}
                        ${totalExtra > 0 ? `
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right; color: var(--green);">➕ Доп. заработок:</td>
                            <td><strong style="color: var(--green);">+${formatCurrency(totalExtra)}</strong></td>
                        </tr>` : ''}
                        <tr class="total-row" style="border-top: 2px solid var(--purple);">
                            <td colspan="3" style="text-align: right; font-size: 18px; color: var(--purple);">💵 ИТОГО К ВЫПЛАТЕ:</td>
                            <td><strong style="font-size: 20px; color: var(--purple);">${formatCurrency(finalTotal)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            `;
            
            html += `
                <div style="margin-top: 15px; padding: 15px; background: rgba(143, 70, 255, 0.08); border-radius: var(--radius); border: 1px solid var(--purple); text-align: center;">
                    <p style="color: var(--gray); font-size: 14px;">
                        💡 Сумма к выплате: <strong style="color: var(--purple); font-size: 20px;">${formatCurrency(finalTotal)}</strong>
                    </p>
                    <p style="color: var(--gray); font-size: 12px; margin-top: 4px;">
                        ⏳ Ожидайте выплаты от лидера
                    </p>
                </div>
            `;
        } else {
            html += `
                <div class="empty-reports" style="padding: 20px;">
                    <p>✅ Все отчеты выплачены</p>
                    <span>У вас нет невыплаченных отчетов</span>
                </div>
            `;
        }

        table.innerHTML = html;
        results.style.display = "block";
        loading.style.display = "none";

        await loadSalaryHistory();
        
    } catch (error) {
        console.error("❌ Ошибка загрузки зарплаты игрока:", error);
        showToast("Ошибка: " + error.message, "error");
        loading.style.display = "none";
        results.style.display = "block";
        table.innerHTML = `
            <div class="empty-reports" style="padding: 30px 20px;">
                <p>❌ Ошибка загрузки</p>
                <span>${error.message}</span>
            </div>
        `;
    }
}

// ====== ОБНОВЛЕНИЕ ЦЕН ДЛЯ ИГРОКА ======
async function refreshPlayerPrices() {
    console.log('🔄 Обновление цен для игрока...');
    await loadPricesFromDB();
    
    // Если игрок не лидер - обновляем его зарплату
    if (currentUserRole !== "leader") {
        const salaryResults = document.getElementById("salaryResults");
        if (salaryResults && salaryResults.style.display !== "none") {
            await loadPlayerSalary();
        }
    }
}

window.refreshPlayerPrices = refreshPlayerPrices;


// ==================== ОБНОВЛЕНИЕ ТАБЛИЦЫ ЗАРПЛАТЫ ====================
function refreshSalaryTable() {
    const calcBtn = document.getElementById("calculateSalaryBtn");
    if (calcBtn) {
        const salaryTab = document.getElementById("tab-salary");
        if (salaryTab && salaryTab.style.display !== "none") {
            console.log('🔄 Обновление таблицы зарплаты...');
            setTimeout(() => {
                // Проверяем, что таблица не пересчитывает уже выплаченные отчеты
                calcBtn.click();
                setTimeout(() => {
                    if (currentUserRole === "leader") {
                        loadPlayersForFines();
                        loadPlayersForExtra();
                        loadExtraEarnings();
                    }
                    loadSalaryHistory();
                }, 500);
            }, 300);
        }
    }
}

window.refreshSalaryTable = refreshSalaryTable;

// ==================== ВЫПЛАТА ИГРОКУ (С БД) ====================

async function payPlayer(playerName, amount, startDate, endDate) {
    if (isProcessingPayment) {
        console.log('⏳ Выплата уже выполняется, пропускаем...');
        return;
    }
    
    console.log('💰 Выплата игроку:', playerName);
    console.log('📅 Период:', startDate, '—', endDate);
    console.log('💰 Сумма к выплате (из кнопки):', amount);
    
    isProcessingPayment = true;
    
    try {
        // ====== ПОЛУЧАЕМ ВСЕ УТВЕРЖДЕННЫЕ ОТЧЕТЫ ИГРОКА ЗА ПЕРИОД ======
        const reportsData = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            [
                Appwrite.Query.equal("user_name", playerName),
                Appwrite.Query.equal("is_approved", true),
                Appwrite.Query.greaterThanEqual("date", startDate),
                Appwrite.Query.lessThanEqual("date", endDate)
            ]
        );

        const reportsToPay = reportsData.documents || [];
        console.log(`📋 Найдено утвержденных отчетов за период: ${reportsToPay.length}`);

        if (reportsToPay.length === 0) {
            showToast(`Нет утвержденных отчетов у ${playerName} за этот период`, "warning");
            isProcessingPayment = false;
            return;
        }

        // ====== ЗАГРУЖАЕМ ВСЕ ВЫПЛАТЫ ======
        const allPayments = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );

        const paidReportIds = new Set();
        allPayments.documents.forEach(p => {
            if (p.reportIds) {
                const ids = p.reportIds.split(',');
                ids.forEach(id => paidReportIds.add(id));
            }
        });

        console.log(`💰 Уже выплаченных отчетов: ${paidReportIds.size}`);

        const unpaidReports = reportsToPay.filter(r => !paidReportIds.has(r.$id));
        console.log(`📋 Невыплаченных отчетов: ${unpaidReports.length}`);

        if (unpaidReports.length === 0) {
            showToast(`Все отчеты ${playerName} за этот период уже оплачены!`, "warning");
            isProcessingPayment = false;
            refreshSalaryTable();
            return;
        }

        // ====== ПЕРЕСЧИТЫВАЕМ СУММУ ======
        const prices = window._prices || JSON.parse(localStorage.getItem('eventPrices') || '{}');
        let actualAmount = 0;
        const reportIds = [];
        const reportDetails = [];

        unpaidReports.forEach(r => {
            const price = prices[r.event] || 0;
            actualAmount += price;
            reportIds.push(r.$id);
            reportDetails.push(`${r.date} (${r.event})`);
        });

        // ====== НАХОДИМ USER_ID ИГРОКА ======
        let playerUserId = null;
        try {
            const users = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.usersCollectionId
            );
            const foundUser = users.documents.find(u => 
                u.username && u.username.toLowerCase() === playerName.toLowerCase()
            );
            if (foundUser) {
                playerUserId = foundUser.$id;
                console.log('👤 Найден userId для штрафов:', playerUserId);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка поиска пользователя для штрафов:', error);
        }

        // ====== ЗАГРУЖАЕМ ШТРАФЫ ИЗ БД ======
        // Проверяем штрафы в БД
        const finesResult = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'fines'
        );
        console.log('Штрафы в БД:', finesResult.documents);
        const fines = finesResult.documents || [];
        let totalFines = 0;

        fines.forEach(fine => {
            if (fine.playerId === 'all' || 
                fine.playerId === playerUserId || 
                fine.playerName === playerName) {
                totalFines += fine.amount;
                console.log(`⚖️ Штраф применен: ${fine.amount}`);
            }
        });

        console.log(`⚖️ Итого штрафов: ${totalFines}`);

        // ====== ЗАГРУЖАЕМ ДОП. ЗАРАБОТКИ ИЗ БД ======
        const extrasResult = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'extraEarnings'
        );
        const extras = extrasResult.documents || [];
        let totalExtra = 0;

        extras.forEach(extra => {
            if (extra.playerId === playerUserId || extra.playerName === playerName) {
                totalExtra += extra.amount;
                console.log(`➕ Доп. заработок: ${extra.amount}`);
            }
        });

        console.log(`➕ Итого доп. заработок: ${totalExtra}`);

        // ====== ИТОГОВАЯ СУММА ======
        const finalAmount = actualAmount - totalFines + totalExtra;
        console.log(`💰 Пересчитанная сумма: ${actualAmount} - ${totalFines} + ${totalExtra} = ${finalAmount}`);

        if (finalAmount <= 0) {
            showToast(`Сумма к выплате ${playerName} равна 0 или отрицательная`, "warning");
            isProcessingPayment = false;
            return;
        }

        // ====== ПОКАЗЫВАЕМ ДЕТАЛИ В CONFIRM ======
        let confirmMessage = `Выплатить ${playerName}:\n`;
        confirmMessage += `💰 Отчеты: ${formatCurrency(actualAmount)} (${unpaidReports.length} шт.)\n`;
        if (totalFines > 0) {
            confirmMessage += `⚖️ Штрафы: -${formatCurrency(totalFines)}\n`;
        }
        if (totalExtra > 0) {
            confirmMessage += `➕ Доп. заработок: +${formatCurrency(totalExtra)}\n`;
        }
        confirmMessage += `💵 Итого: ${formatCurrency(finalAmount)}`;

        if (!confirm(confirmMessage)) {
            isProcessingPayment = false;
            return;
        }

        // ====== ПОЛУЧАЕМ USER_ID ======
        let userId = playerUserId;
        let userName = playerName;
        
        if (!userId) {
            try {
                const users = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.usersCollectionId
                );
                const foundUser = users.documents.find(u => 
                    u.username && u.username.toLowerCase() === playerName.toLowerCase()
                );
                if (foundUser) {
                    userId = foundUser.$id;
                    userName = foundUser.username;
                }
            } catch (error) {
                console.warn('⚠️ Ошибка поиска пользователя:', error);
            }
        }

        // ====== СОХРАНЯЕМ ВЫПЛАТУ ======
        const paymentData = {
            playerName: userName,
            userId: userId,
            amount: finalAmount,
            reportIds: reportIds.join(','),
            reportCount: reportIds.length,
            date: new Date().toLocaleDateString('ru-RU'),
            paidBy: currentUserNickname || 'Лидер',
            periodStart: startDate,
            periodEnd: endDate,
            timestamp: Date.now()
        };

        console.log('📝 Сохраняем выплату:', paymentData);

        await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            'payments',
            'unique()',
            paymentData
        );

        showToast(`${userName} выплачено ${formatCurrency(finalAmount)}!`, 'success');
        
        // ====== УВЕДОМЛЕНИЕ ======
        if (userId) {
            const formattedDate = new Date().toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            await addNotification(
                userId,
                '💰 Получена выплата',
                `<p class="addNotifName"><strong>${userName}</strong>, вам выплачена зарплата!</p>
                <p class="addNotifName">💰 <strong>Сумма:</strong> ${formatCurrency(finalAmount)}</p>
                <p class="addNotifName">📋 <strong>Отчеты:</strong> ${reportIds.length} шт.</p>
                <p class="addNotifName">📅 <strong>Период:</strong> ${startDate} — ${endDate}</p>
                <p class="addNotifName">👤 <strong>Выплатил:</strong> ${currentUserNickname || 'Лидер'}</p>
                <p class="addNotifName">📅 <strong>Дата выплаты:</strong> ${formattedDate}</p>`,
                'payment',
                null
            );
            console.log('✅ Уведомление о выплате отправлено пользователю:', userName);
        }
        
        // ====== ОБНОВЛЯЕМ ТАБЛИЦУ ======
        refreshSalaryTable();
        await loadSalaryHistory();

    } catch (error) {
        console.error("❌ Ошибка выплаты:", error);
        showToast("Ошибка выплаты: " + error.message, "error");
    } finally {
        isProcessingPayment = false;
    }
}

// ====== НОВАЯ ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ СТАТУСА ИГРОКА ======
function updatePlayerStatus(playerName, isPaid, startDate, endDate) {
    const rows = document.querySelectorAll('#salaryTable tbody tr');
    rows.forEach(row => {
        const nameCell = row.querySelector('td:nth-child(2)');
        if (nameCell && nameCell.textContent.trim() === playerName) {
            const statusCell = row.querySelector('td:nth-last-child(2)');
            const actionCell = row.querySelector('td:last-child');
            
            if (statusCell) {
                statusCell.innerHTML = isPaid 
                    ? '<span class="status-paid">✅ Выплачено</span>'
                    : '<span class="status-unpaid">⏳ Ожидает</span>';
            }
            if (actionCell) {
                if (isPaid) {
                    actionCell.innerHTML = '<span class="btn-paid">✅ Выплачено</span>';
                } else {
                    // Восстанавливаем кнопку выплаты
                    // Находим сумму для этого игрока
                    const amountCell = row.querySelector('td:nth-last-child(3)');
                    if (amountCell) {
                        const amountText = amountCell.textContent.replace(/[^0-9]/g, '');
                        const amount = parseInt(amountText) || 0;
                        if (amount > 0) {
                            actionCell.innerHTML = `<button class="btn-pay" data-player="${encodeURIComponent(playerName)}" data-amount="${amount}">💰 Выплатить</button>`;
                        }
                    }
                }
            }
        }
    });
    
    // Обновляем данные в window._salaryData
    if (window._salaryData && window._salaryData.players) {
        const players = window._salaryData.players;
        if (players[playerName]) {
            players[playerName].paid = isPaid;
        }
    }
}

// ==================== ЗАПОЛНЕНИЕ СПИСКА ИГРОКОВ ДЛЯ ИСТОРИИ ====================
window.loadHistoryPlayers = async function () {
    const select = document.getElementById("historyPlayerSelect");
    const group = document.getElementById("historyPlayerGroup");

    if (!select || !group) {
        console.warn('⚠️ Элементы historyPlayerSelect или historyPlayerGroup не найдены');
        return;
    }

    // ====== ПРОВЕРЯЕМ РОЛЬ ======
    if (!currentUserRole) {
        console.log('⏳ Роль не загружена, ждем...');
        await loadUserData();
    }

    console.log('🔍 Текущая роль:', currentUserRole);

    if (currentUserRole !== "leader") {
        group.style.display = "none";
        console.log('👤 Не лидер, скрываем historyPlayerGroup');
        return;
    }

    // ====== ПОКАЗЫВАЕМ ГРУППУ ======
    group.style.display = "flex";
    console.log('👑 Лидер, показываем historyPlayerGroup');

    try {
        // Загружаем пользователей, если они еще не загружены
        if (allUsers.length === 0) {
            const users = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.usersCollectionId,
            );
            allUsers = users.documents || [];
            window.allUsers = allUsers;
        }

        const currentValue = select.value;
        select.innerHTML = '<option value="">👥 Все игроки</option>';

        const sortedUsers = [...allUsers].sort((a, b) => {
            const nameA = (a.username || a.email || '').toLowerCase();
            const nameB = (b.username || b.email || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        sortedUsers.forEach((user) => {
            const option = document.createElement('option');
            option.value = user.$id || user.id;
            option.textContent = user.username || user.email || 'Без имени';
            select.appendChild(option);
        });

        if (currentValue) {
            const exists = sortedUsers.some(u => (u.$id || u.id) === currentValue);
            if (exists) {
                select.value = currentValue;
            }
        }

        console.log('✅ Игроки для истории загружены');
    } catch (error) {
        console.error("Ошибка загрузки игроков:", error);
    }
};

// ==================== ФИЛЬТР ИСТОРИИ ПО ДАТАМ ====================
document.addEventListener("DOMContentLoaded", function () {
    const applyHistoryFilterBtn = document.getElementById(
        "applyHistoryFilterBtn",
    );
    const resetHistoryFilterBtn = document.getElementById(
        "resetHistoryFilterBtn",
    );

    if (applyHistoryFilterBtn) {
        applyHistoryFilterBtn.addEventListener("click", function () {
            console.log("🔍 Применяем фильтр...");
            loadSalaryHistory();
            showToast("📅 Фильтр применен", "info");
        });
    }

    if (resetHistoryFilterBtn) {
        resetHistoryFilterBtn.addEventListener("click", function () {
            console.log("↺ Сбрасываем фильтр...");
            // Очищаем поля фильтров
            document.getElementById("historyDateStart").value = "";
            document.getElementById("historyDateEnd").value = "";
            document.getElementById("historyPlayerSelect").value = "";

            // Загружаем историю без фильтров
            loadSalaryHistory();
            showToast("↺ Фильтр сброшен", "info");
        });
    }
});

// ==================== СОРТИРОВКА ПО СТАТУСУ ====================
document.addEventListener("DOMContentLoaded", function () {
    const sortFilter = document.getElementById("salarySortFilter");
    if (sortFilter) {
        sortFilter.addEventListener("change", function () {
            const filterValue = this.value;
            console.log("🔽 Сортировка:", filterValue);

            const playersData = this._playersData;
            const allEventsData = this._allEvents;
            const finePerPlayerData = this._finePerPlayer;

            if (!playersData) {
                console.warn("⚠️ Данные для сортировки не загружены");
                return;
            }

            let filteredPlayers =
                this._sortedPlayers || Object.keys(playersData);

            if (filterValue === "paid") {
                filteredPlayers = filteredPlayers.filter(
                    (name) => playersData[name].paid === true,
                );
            } else if (filterValue === "unpaid") {
                filteredPlayers = filteredPlayers.filter(
                    (name) => playersData[name].paid === false,
                );
            }

            if (filteredPlayers.length === 0) {
                const table = document.getElementById("salaryTable");
                if (table) {
                    table.innerHTML = `
                        <div style="padding: 30px; text-align: center; color: var(--gray);">
                            <p>📭 Нет игроков с таким статусом</p>
                        </div>
                    `;
                }
                updateFilterInfo(filterValue, 0);
                return;
            }

            buildSalaryTable(
                filteredPlayers,
                playersData,
                allEventsData,
                finePerPlayerData,
            );
            updateFilterInfo(filterValue, filteredPlayers.length);
        });
    }
});

// Дополнительная инициализация при переключении на вкладку "Обучение"
document.addEventListener("DOMContentLoaded", function () {
    const academyBtn = document.querySelector(
        '.sidebar-nav-btn[data-tab="academy"]',
    );
    if (academyBtn) {
        academyBtn.addEventListener("click", function () {
            // Даем время на отображение вкладки
            setTimeout(function () {
                if (typeof Plyr !== "undefined") {
                    try {
                        // Переинициализируем плееры
                        const videos = document.querySelectorAll(
                            ".player:not(.plyr--setup)",
                        );
                        if (videos.length > 0) {
                            Plyr.setup(videos, {
                                controls: [
                                    "play-large",
                                    "play",
                                    "progress",
                                    "current-time",
                                    "duration",
                                    "mute",
                                    "volume",
                                    "settings",
                                    "fullscreen",
                                ],
                                settings: ["speed"],
                                speed: {
                                    selected: 1,
                                    options: [0.5, 0.75, 1, 1.25, 1.5, 2],
                                },
                            });
                            console.log(
                                "✅ PLYR переинициализирован для новых видео",
                            );
                        }
                    } catch (error) {
                        console.error(
                            "❌ Ошибка переинициализации PLYR:",
                            error,
                        );
                    }
                }
            }, 500);
        });
    }
});


// ==================== ТОГГЛ ПОДРОБНЕЕ В ОБУЧЕНИИ ====================
window.toggleDetails = function (btn) {
    if (!btn) return;

    const details = btn.nextElementSibling;
    const arrow = btn.querySelector(".arrow");

    if (details) {
        details.classList.toggle("open");
        if (arrow) {
            arrow.classList.toggle("open");
        }
        if (details.classList.contains("open")) {
            btn.innerHTML = '<span class="arrow open">▼</span> Скрыть';
        } else {
            btn.innerHTML = '<span class="arrow">▶</span> Подробнее';
        }
    }
};

// ==================== ТОГГЛ ИНСТРУКЦИИ ВИДЕО ====================
window.toggleInstruction = function(btn) {
    const instruction = document.getElementById('videoGuideInstruction');
    if (!instruction) return;
    
    instruction.classList.toggle('open');
    btn.classList.toggle('active');
    
    const text = btn.querySelector('.instruction-toggle-text');
    const arrow = btn.querySelector('.instruction-toggle-arrow');
    
    if (instruction.classList.contains('open')) {
        text.textContent = 'Скрыть инструкцию по просмотру';
        arrow.textContent = '▲';
    } else {
        text.textContent = 'Показать инструкцию по просмотру';
        arrow.textContent = '▼';
    }
};

// ==================== DOMContentLoaded для зарплаты ====================
document.addEventListener("DOMContentLoaded", function () {
    const salaryBtn = document.getElementById("salaryBtn");
    const salaryModal = document.getElementById("salaryModal");
    const salaryModalClose = document.getElementById("salaryModalClose");
    calculateBtn = document.getElementById("calculateSalaryBtn");
    const savePricesBtn = document.getElementById("savePricesBtn");
    const exportBtn = document.getElementById("exportSalaryBtn");
    const saveHistoryBtn = document.getElementById("saveHistoryBtn");
    const resetPricesBtn = document.getElementById("resetPricesBtn");
    const addFineBtn = document.getElementById("addFineBtn");
    const clearFinesBtn = document.getElementById("clearFinesBtn");

    const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener("click", function () {
            this.textContent = "⏳ Updating...";
            this.disabled = true;
            showToast("🔄 Обновление истории...", "info");
            loadSalaryHistory();
            setTimeout(() => {
                this.textContent = "🔄 Update";
                this.disabled = false;
            }, 1000);
        });
    }

    if (salaryBtn) {
        salaryBtn.addEventListener("click", async function () {
            salaryModal.classList.add("active");
            document.body.style.overflow = "hidden";

            const leaderPanel = document.getElementById("salaryLeaderPanel");
            
            // ====== СКРЫВАЕМ РЕЗУЛЬТАТЫ ПРИ ОТКРЫТИИ ======
            const salaryResults = document.getElementById("salaryResults");
            if (salaryResults) {
                salaryResults.style.display = "none";
            }

            // ====== УБЕЖДАЕМСЯ, ЧТО ПОЛЬЗОВАТЕЛЬ ЗАГРУЖЕН ======
            if (!currentUserId || !currentUser) {
                console.log('⏳ Ожидание загрузки пользователя...');
                await loadUserData();
            }

            if (currentUserRole !== "leader") {
                if (leaderPanel) leaderPanel.style.display = "none";
                
                // ====== СКРЫВАЕМ ЛИШНИЕ ЭЛЕМЕНТЫ ======
                const totalSumEl = document.getElementById("totalSalarySum");
                if (totalSumEl) {
                    totalSumEl.parentElement.style.display = "none";
                }
                const historyGroup = document.getElementById("historyPlayerGroup");
                if (historyGroup) {
                    historyGroup.style.display = "none";
                }
                
                // ====== ЗАГРУЖАЕМ ЗАРПЛАТУ ИГРОКА ======
                console.log('👤 Открываем зарплату для обычного игрока');
                await loadPlayerSalary();
                return;
            }

            if (leaderPanel) leaderPanel.style.display = "block";

            loadPrices();
            loadFines();
            loadExtraEarnings();
            
            await loadUsers();
            await loadPlayersForFines();
            await loadPlayersForExtra();
            
            setTimeout(() => {
                updatePriceInputs();
            }, 100);

            const restored = restoreSalaryPeriod();
            if (!restored) {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                document.getElementById("salaryDateStart").value = start.toISOString().split("T")[0];
                document.getElementById("salaryDateEnd").value = end.toISOString().split("T")[0];
            }

            await loadHistoryPlayers();
            await loadSalaryHistory();
            
            setTimeout(() => {
                const calcBtn = document.getElementById("calculateSalaryBtn");
                if (calcBtn) {
                    calcBtn.click();
                }
            }, 500);
        });
    }


    function closeSalaryModal() {
        salaryModal.classList.remove("active");
        document.body.style.overflow = "";
    }
    if (salaryModalClose)
        salaryModalClose.addEventListener("click", closeSalaryModal);
    if (salaryModal) {
        salaryModal.addEventListener("click", function (e) {
            if (e.target === this) closeSalaryModal();
        });
    }

    // ==================== ДОБАВЛЕНИЕ ШТРАФА ====================
    if (addFineBtn) {
        addFineBtn.addEventListener("click", function () {
            const amount = parseInt(document.getElementById("fineAmount").value);
            const reason = document.getElementById("fineReason").value.trim();
            const playerSelect = document.getElementById("finePlayerSelect");
            const playerName = playerSelect ? playerSelect.value : 'all';
            
            let playerDisplay = 'Все игроки';
            if (playerName !== 'all') {
                const selectedOption = playerSelect?.options[playerSelect.selectedIndex];
                playerDisplay = selectedOption ? selectedOption.text : playerName;
            }

            if (!amount || amount <= 0) {
                showToast("Введите сумму штрафа!", "warning");
                return;
            }

            addFine(amount, reason, playerName);

            document.getElementById("fineAmount").value = "";
            document.getElementById("fineReason").value = "";

            showToast(`Штраф добавлен для ${playerDisplay}!`, "success");

            setTimeout(() => {
                refreshSalaryTable(); // <-- ДОБАВЛЯЕМ
            }, 500);

            loadFines();

            const calcBtn = document.getElementById("calculateSalaryBtn");
            if (calcBtn) {
                setTimeout(() => {
                    calcBtn.click();
                }, 300);
            }
            
            // ====== ОБНОВЛЯЕМ ЗАРПЛАТУ ИГРОКА (ЕСЛИ ОН НЕ ЛИДЕР) ======
            refreshPlayerSalary();
        });
    }

    // ==================== ОЧИСТКА ШТРАФОВ ====================
    if (clearFinesBtn) {
        clearFinesBtn.addEventListener("click", function() {
            clearAllFines();
        });
    }


    if (savePricesBtn) {
        savePricesBtn.addEventListener("click", async function () {
            try {
                const prices = {};
                document.querySelectorAll(".price-input").forEach((input) => {
                    const event = input.id.replace("price_", "");
                    const value = parseInt(input.value) || 0;
                    prices[event] = value;
                });
                
                await savePricesToDB(prices);
                showToast("Цены сохранены в БД!", "success");
                
                // ====== ОБНОВЛЯЕМ ЦЕНЫ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ======
                await refreshPlayerPrices();
                
                // Если лидер - пересчитываем таблицу
                if (currentUserRole === "leader") {
                    const calcBtn = document.getElementById("calculateSalaryBtn");
                    if (calcBtn) {
                        setTimeout(() => calcBtn.click(), 300);
                    }
                }
            } catch (error) {
                console.error("❌ Ошибка сохранения цен:", error);
                showToast("Ошибка сохранения цен", "error");
            }
        });
    }


    if (resetPricesBtn) {
        resetPricesBtn.addEventListener("click", async function () {
            await resetPricesToDefault();
            
            // ====== ОБНОВЛЯЕМ ЦЕНЫ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ======
            await refreshPlayerPrices();
            
            // Если лидер - пересчитываем таблицу
            if (currentUserRole === "leader") {
                const calcBtn = document.getElementById("calculateSalaryBtn");
                if (calcBtn) {
                    setTimeout(() => calcBtn.click(), 300);
                }
            }
        });
    }

    if (calculateBtn) {
        calculateBtn.addEventListener("click", async function () {
            if (currentUserRole !== "leader") {
                showToast("Только лидер может видеть полную зарплату!", "error");
                return;
            }

            const startDate = document.getElementById("salaryDateStart").value;
            const endDate = document.getElementById("salaryDateEnd").value;

            if (!startDate || !endDate) {
                showToast("Выберите период!", "warning");
                return;
            }

            // ====== СБРАСЫВАЕМ КЕШ ======
            window._salaryData = null;
            console.log('🔄 Пересчет зарплаты за период:', startDate, '—', endDate);

            const loading = document.getElementById("salaryLoading");
            const results = document.getElementById("salaryResults");
            const table = document.getElementById("salaryTable");
            const totalSumEl = document.getElementById("totalSalarySum");

            if (!results || !table) {
                console.error("❌ Элементы не найдены!");
                showToast("Ошибка: элементы на странице не найдены", "error");
                return;
            }

            loading.style.display = "block";
            results.style.display = "none";

            try {
                // ====== ЗАГРУЖАЕМ ЦЕНЫ ======
                const prices = window._prices || JSON.parse(localStorage.getItem("eventPrices") || "{}");
                console.log('📋 Цены для расчета:', prices);
                
                // ====== ЗАГРУЖАЕМ ШТРАФЫ ИЗ БД ======
                console.log('🔄 Загрузка штрафов из БД...');
                let fines = [];
                try {
                    const finesResult = await database.listDocuments(
                        APPWRITE_CONFIG.databaseId,
                        'fines'
                    );
                    fines = finesResult.documents || [];
                    console.log('📋 Штрафы загружены:', fines.length, fines);
                } catch (e) {
                    console.error('❌ Ошибка загрузки штрафов:', e);
                }

                // ====== ЗАГРУЖАЕМ ДОП. ЗАРАБОТКИ ИЗ БД ======
                console.log('🔄 Загрузка доп. заработков из БД...');
                let extras = [];
                try {
                    const extrasResult = await database.listDocuments(
                        APPWRITE_CONFIG.databaseId,
                        'extraEarnings'
                    );
                    extras = extrasResult.documents || [];
                    console.log('📋 Доп. заработки загружены:', extras.length, extras);
                } catch (e) {
                    console.error('❌ Ошибка загрузки доп. заработков:', e);
                }

                // ====== ЗАГРУЖАЕМ ВСЕ ВЫПЛАТЫ ======
                const allPayments = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    'payments'
                );

                // Создаем Set из ID уже выплаченных отчетов
                const paidReportIds = new Set();
                const paymentMap = {};
                allPayments.documents.forEach(p => {
                    if (p.reportIds) {
                        const ids = p.reportIds.split(',');
                        ids.forEach(id => paidReportIds.add(id));
                    }
                    if (p.playerName) {
                        if (!paymentMap[p.playerName]) {
                            paymentMap[p.playerName] = [];
                        }
                        paymentMap[p.playerName].push(p);
                    }
                });

                console.log('💰 Всего выплаченных отчетов:', paidReportIds.size);

                function normalizeEventName(eventName) {
                    if (!eventName) return 'OTHER';
                    const map = {
                        'ФАМКАНТ': 'ФАМКАНТ',
                        'ФАМКАПТ': 'ФАМКАПТ',
                        'FAMILY CAPT': 'ФАМКАПТ',
                        'РЕЙД': 'РЕЙД',
                        'RAID': 'РЕЙД',
                        'ФАМВАР': 'ФАМВАР',
                        'WAR': 'ФАМВАР',
                        'ФАМБИЗВАР': 'ФАМБИЗВАР',
                        'FAMBIZWAR': 'ФАМБИЗВАР',
                        'FAMBIZ WAR': 'ФАМБИЗВАР',
                        'КОРАБЛЬ': 'КОРАБЛЬ',
                        'SHIP': 'КОРАБЛЬ',
                        'КЛАДЫ': 'КЛАДЫ',
                        'TREASURE': 'КЛАДЫ',
                        'ЦЕХ': 'ЦЕХ',
                        'WORKSHOP': 'ЦЕХ',
                        'ГРАФФИТИ': 'ГРАФФИТИ',
                        'КОНТЕЙНЕРЫ': 'КОНТЕЙНЕРЫ',
                        'ЗАБИВ КАПТА': 'ЗАБИВ КАПТА',
                        'КАПТ': 'КАПТ',
                        'СУМКА С ПОЕЗДА': 'СУМКА С ПОЕЗДА',
                        'OTHER': 'OTHER'
                    };
                    return map[eventName] || eventName;
                }

                const allReportsData = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.reportsCollectionId
                );

                const reports = allReportsData.documents || [];
                const filteredReports = reports.filter(r => {
                    return r.date >= startDate && r.date <= endDate;
                });

                const approvedReports = filteredReports.filter(r => r.is_approved === true);
                const pendingReports = filteredReports.filter(r => r.is_approved === false || r.is_approved === undefined);

                const players = {};

                approvedReports.forEach(r => {
                    let name = r.user_name || "Неизвестен";
                    const foundUser = allUsers.find(u => u.$id === r.user_id);
                    if (foundUser && foundUser.username) {
                        name = foundUser.username;
                    }

                    // ====== ПРАВИЛЬНО ИЗВЛЕКАЕМ ID ======
                    let userId = r.user_id;
                    if (typeof userId === 'object' && userId !== null) {
                        userId = userId.$id || userId.id || String(userId);
                    } else {
                        userId = String(userId);
                    }

                    // ====== ПРОВЕРЯЕМ, ВЫПЛАЧЕН ЛИ ОТЧЕТ ======
                    const isReportPaid = paidReportIds.has(r.$id);
                    
                    let isActuallyPaid = isReportPaid;
                    if (!isActuallyPaid && paymentMap[name]) {
                        for (const payment of paymentMap[name]) {
                            if (payment.reportIds) {
                                const ids = payment.reportIds.split(',');
                                if (ids.includes(r.$id)) {
                                    isActuallyPaid = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!players[name]) {
                        players[name] = {};
                        players[name].userId = userId;
                        players[name].total = 0;
                        players[name].events = {};
                        players[name].approvedCount = 0;
                        players[name].pendingCount = 0;
                        players[name].reports = [];
                        players[name].paid = false;
                        players[name].paidReports = [];
                    }

                    const event = normalizeEventName(r.event || "OTHER");
                    const price = prices[event] || 0;

                    if (!players[name].events[event]) {
                        players[name].events[event] = 0;
                    }
                    players[name].events[event] += 1;
                    players[name].total += price;
                    players[name].approvedCount += 1;
                    players[name].reports.push({
                        id: r.$id,
                        date: r.date,
                        event: r.event,
                        time: r.time,
                        price: price,
                        paid: isActuallyPaid
                    });

                    if (isActuallyPaid) {
                        players[name].paidReports.push(r.$id);
                    }
                });

                pendingReports.forEach(r => {
                    let name = r.user_name || "Неизвестен";
                    const foundUser = allUsers.find(u => u.$id === r.user_id);
                    if (foundUser && foundUser.username) {
                        name = foundUser.username;
                    }

                    if (!players[name]) {
                        players[name] = {};
                        players[name].userId = r.user_id;
                        players[name].total = 0;
                        players[name].events = {};
                        players[name].approvedCount = 0;
                        players[name].pendingCount = 0;
                        players[name].reports = [];
                        players[name].paid = false;
                        players[name].paidReports = [];
                    }
                    players[name].pendingCount += 1;
                });

                // ====== ОПРЕДЕЛЯЕМ СТАТУС ИГРОКА ======
                Object.keys(players).forEach(name => {
                    const player = players[name];
                    if (!player.reports || player.reports.length === 0) {
                        player.paid = false;
                        return;
                    }
                    const allReportsPaid = player.reports.every(r => r.paid === true);
                    player.paid = allReportsPaid;
                });

                const sortedPlayers = Object.keys(players).sort((a, b) => players[b].total - players[a].total);
                
                // ====== СОБИРАЕМ ИВЕНТЫ ТОЛЬКО ИЗ НЕВЫПЛАЧЕННЫХ ОТЧЕТОВ ======
                const allEventsFromUnpaid = new Set();
                Object.keys(players).forEach(name => {
                    const player = players[name];
                    player.reports.forEach(r => {
                        if (!r.paid) {
                            allEventsFromUnpaid.add(r.event || 'OTHER');
                        }
                    });
                });
                const allEvents = [...allEventsFromUnpaid];

                if (sortedPlayers.length === 0) {
                    table.innerHTML = `
                        <div class="empty-reports" style="padding: 30px 20px;">
                            <p>📭 Нет данных за выбранный период</p>
                            <span>Нет утвержденных отчетов для расчета зарплаты</span>
                        </div>
                    `;
                    if (totalSumEl) totalSumEl.textContent = "0 Ꝑ";
                    results.style.display = "block";
                    loading.style.display = "none";
                    showToast("Нет данных для расчета", "info");
                    return;
                }

                const unpaidPlayers = [];
                const paidPlayers = [];

                sortedPlayers.forEach(name => {
                    const player = players[name];
                    if (!player.reports || player.reports.length === 0) {
                        return;
                    }
                    if (player.paid) {
                        paidPlayers.push(name);
                    } else {
                        unpaidPlayers.push(name);
                    }
                });

                // ====== ИНФОРМАЦИОННЫЕ БЛОКИ (ВНЕ ТАБЛИЦЫ) ======
                let infoHtml = '';

                // Штрафы (ВНЕ ТАБЛИЦЫ)

                // Доп. заработки (ВНЕ ТАБЛИЦЫ)

                // ====== ЕСЛИ ВСЕ ВЫПЛАЧЕНЫ ======
                if (unpaidPlayers.length === 0 && paidPlayers.length > 0) {
                    infoHtml += `
                        <div style="padding: 30px 20px; text-align: center; background: var(--card2); border-radius: var(--radius); border: 1px solid var(--green);">
                            <p style="color: var(--green); font-size: 20px; font-weight: 600;">✅ Всем игрокам выплачена зарплата!</p>
                            <p style="color: var(--gray); font-size: 14px; margin-top: 8px;">Все ${paidPlayers.length} игроков получили выплату за этот период</p>
                        </div>
                    `;
                    
                    infoHtml += `
                        <div style="margin-top: 15px; text-align: center;">
                            <button class="btn-submit" id="showAllPaidBtn" style="background: var(--gray); padding: 8px 30px; font-size: 14px;">
                                📋 Показать всех выплаченных (${paidPlayers.length})
                            </button>
                        </div>
                        <div id="paidPlayersList" style="display: none; margin-top: 15px;"></div>
                    `;
                    
                    table.innerHTML = infoHtml;
                    
                    const showAllBtn = document.getElementById('showAllPaidBtn');
                    if (showAllBtn) {
                        showAllBtn.addEventListener('click', function() {
                            const list = document.getElementById('paidPlayersList');
                            if (list.style.display === 'none') {
                                list.style.display = 'block';
                                this.textContent = '📋 Скрыть выплаченных';
                                let paidHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; padding: 15px; background: var(--card2); border-radius: var(--radius); border: 1px solid var(--border);">`;
                                paidPlayers.forEach(name => {
                                    const player = players[name];
                                    const total = player.reports.reduce((sum, r) => sum + r.price, 0);
                                    paidHtml += `
                                        <div style="padding: 10px; background: var(--card); border-radius: 8px; border: 1px solid var(--green); text-align: center;">
                                            <div style="color: var(--white); font-weight: 600;">${name}</div>
                                            <div style="color: var(--gray); font-size: 12px;">${formatCurrency(total)}</div>
                                            <div style="color: var(--green); font-size: 12px;">✅ Выплачено</div>
                                        </div>
                                    `;
                                });
                                paidHtml += `</div>`;
                                list.innerHTML = paidHtml;
                            } else {
                                list.style.display = 'none';
                                this.textContent = `📋 Показать всех выплаченных (${paidPlayers.length})`;
                            }
                        });
                    }
                    
                    if (totalSumEl) totalSumEl.textContent = formatCurrency(0);
                    results.style.display = "block";
                    loading.style.display = "none";
                    if (currentUserRole === "leader") {
                        setTimeout(() => {
                            loadPlayersForFines();
                            loadPlayersForExtra();
                            loadExtraEarnings();
                        }, 500);
                    }
                    showToast(`✅ Все ${paidPlayers.length} игроков выплачены!`, "success");
                    return;
                }

                // ====== СТАТУС ОЖИДАНИЯ ======
                infoHtml += `<div style="margin-bottom: 10px; padding: 8px 15px; background: rgba(251, 191, 36, 0.1); border-radius: var(--radius); border: 1px solid var(--yellow);">
                    <p style="color: var(--yellow); font-size: 16px;">
                        ⏳ Ожидают выплату: <strong>${unpaidPlayers.length}</strong> игроков
                        ${paidPlayers.length > 0 ? ` │ ✅ Выплачено: <strong>${paidPlayers.length}</strong> игроков` : ''}
                    </p>
                </div>`;

                // ====== БЛОК С ОЖИДАЮЩИМИ ОТЧЕТАМИ ======
                if (pendingReports.length > 0) {
                    infoHtml += `<div style="margin-top: 15px; margin-bottom: 10px; padding: 15px; background: rgba(251, 191, 36, 0.1); border-radius: var(--radius); border: 1px solid var(--yellow);">
                        <p style="color: var(--yellow);">
                            ⚠️ <strong>${pendingReports.length}</strong> отчетов ожидают утверждения.
                        </p>
                    </div>`;
                }

                // ====== ВЫПЛАЧЕННЫЕ ИГРОКИ ======
                if (paidPlayers.length > 0) {
                    // ====== СОБИРАЕМ ВСЕ ВЫПЛАТЫ ЗА ПЕРИОД ======
                    const paidPlayersData = {};
                    paidPlayers.forEach(name => {
                        // Ищем ВСЕ выплаты для этого игрока за период
                        const payments = allPayments.documents.filter(p => 
                            p.playerName === name && 
                            p.periodStart === startDate && 
                            p.periodEnd === endDate
                        );
                        
                        if (payments.length > 0) {
                            let totalAmount = 0;
                            let totalReports = 0;
                            let lastDate = '';
                            
                            payments.forEach(p => {
                                totalAmount += p.amount || 0;
                                totalReports += p.reportCount || 0;
                                if (p.date) lastDate = p.date;
                            });
                            
                            paidPlayersData[name] = {
                                amount: totalAmount,
                                date: lastDate || new Date().toLocaleDateString('ru-RU'),
                                reportCount: totalReports,
                                paymentsCount: payments.length
                            };
                        } else {
                            const player = players[name];
                            const total = player.reports.reduce((sum, r) => sum + r.price, 0);
                            paidPlayersData[name] = {
                                amount: total,
                                date: new Date().toLocaleDateString('ru-RU'),
                                reportCount: player.reports.length,
                                paymentsCount: 0
                            };
                        }
                    });
                    
                    window._paidPlayersData = paidPlayersData;
                    
                    infoHtml += `
                        <div style="margin-top: 15px;">
                            <button class="btn-submit" id="showPaidPlayersBtn" style="font-family: Oswald; font-weight: 600; background: var(--card2); border: 1px solid var(--border); padding: 6px 20px; font-size: 16px; color: var(--gray); margin-bottom: 20px;">
                                Показать выплаченных (${paidPlayers.length})
                            </button>
                            <div id="paidPlayersList" style="display: none; margin-top: 10px;"></div>
                        </div>
                    `;
                }

                // ====== ТАБЛИЦА ======
                let tableHtml = `<table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Игрок</th>
                            <th>Утверждено</th>
                            <th>Ожидают</th>`;
                allEvents.forEach(e => {
                    tableHtml += `<th>${e}</th>`;
                });
                tableHtml += `<th>Зарплата</th>
                            <th>Штраф</th>
                            <th>Доп.</th>
                            <th>Итого</th>
                            <th>Статус</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody>`;

                let totalSum = 0;
                unpaidPlayers.forEach((name, index) => {
                    const player = players[name];
                    
                    console.log(`🔍 Обработка игрока: ${name}`);
                    console.log(`   player.userId: ${player.userId}`);
                    
                    // ====== ШТРАФЫ ======
                    let playerFine = 0;
                    fines.forEach(fine => {
                        const finePlayerId = String(fine.playerId || '');
                        const finePlayerName = String(fine.playerName || '');
                        const playerUserId = String(player.userId || '');
                        const playerName = String(name || '');
                        
                        const isAll = finePlayerId === 'all' || finePlayerName === 'all';
                        const isIdMatch = finePlayerId === playerUserId;
                        const isNameMatch = finePlayerName === playerName;
                        const isNameMatchCaseInsensitive = finePlayerName.toLowerCase() === playerName.toLowerCase();
                        
                        if (isAll || isIdMatch || isNameMatch || isNameMatchCaseInsensitive) {
                            playerFine += fine.amount;
                            console.log(`   ✅ ШТРАФ ПРИМЕНЕН: ${fine.amount} (итого: ${playerFine})`);
                        }
                    });

                    // ====== ДОП. ЗАРАБОТКИ ======
                    let extraAmount = 0;
                    extras.forEach(extra => {
                        const extraPlayerId = String(extra.playerId || '');
                        const extraPlayerName = String(extra.playerName || '');
                        const playerUserId = String(player.userId || '');
                        const playerName = String(name || '');
                        
                        const isIdMatch = extraPlayerId === playerUserId;
                        const isNameMatch = extraPlayerName === playerName;
                        const isNameMatchCaseInsensitive = extraPlayerName.toLowerCase() === playerName.toLowerCase();
                        
                        if (isIdMatch || isNameMatch || isNameMatchCaseInsensitive) {
                            extraAmount += extra.amount;
                            console.log(`   ✅ ДОП. ЗАРАБОТОК ПРИМЕНЕН: ${extra.amount} (итого: ${extraAmount})`);
                        }
                    });

                    // ====== НЕВЫПЛАЧЕННЫЕ ОТЧЕТЫ ======
                    const unpaidReports = player.reports.filter(r => !r.paid);
                    const unpaidApprovedCount = unpaidReports.length;
                    const unpaidPendingCount = player.pendingCount;
                    
                    const unpaidEvents = {};
                    unpaidReports.forEach(r => {
                        const eventName = r.event || 'OTHER';
                        if (!unpaidEvents[eventName]) {
                            unpaidEvents[eventName] = 0;
                        }
                        unpaidEvents[eventName]++;
                    });
                    
                    const unpaidTotal = unpaidReports.reduce((sum, r) => sum + r.price, 0);
                    const afterFine = unpaidTotal - playerFine + extraAmount;
                    totalSum += afterFine;

                    tableHtml += `<tr>
                        <td>${index + 1}</td>
                        <td><strong>${name}</strong></td>
                        <td style="color: var(--green);">${unpaidApprovedCount}</td>
                        <td style="color: var(--yellow);">${unpaidPendingCount}</td>`;
                    
                    allEvents.forEach(e => {
                        const count = unpaidEvents[e] || 0;
                        tableHtml += `<td>${count > 0 ? count : '-'}</td>`;
                    });
                    
                    tableHtml += `<td><strong>${formatCurrency(unpaidTotal)}</strong></td>
                            <td style="color: var(--red);">-${formatCurrency(playerFine)}</td>
                            <td style="color: ${extraAmount > 0 ? 'var(--green)' : 'var(--gray)'};">${extraAmount > 0 ? '+' + formatCurrency(extraAmount) : '0'}</td>
                            <td><strong style="color: ${afterFine >= 0 ? 'var(--green)' : 'var(--red)'};">${formatCurrency(afterFine)}</strong></td>
                            <td><span class="status-unpaid">⏳ Ожидает</span></td>
                            <td>
                                <button class="btn-pay" data-player="${encodeURIComponent(name)}" data-amount="${afterFine}">💰 Выплатить</button>
                            </td>
                        </tr>`;
                });

                tableHtml += `</tbody>
                    <tfoot>
                    </tfoot>
                </table>`;

                // ====== ВСТАВЛЯЕМ ВСЕ В КОНТЕЙНЕР ======
                table.innerHTML = infoHtml + `<div class="salary-table-wrapper"><div id="salaryTableInner">${tableHtml}</div></div>`;

                if (totalSumEl) {
                    totalSumEl.textContent = formatCurrency(totalSum);
                }

                // Кнопка "Показать выплаченных"
                const showPaidBtn = document.getElementById('showPaidPlayersBtn');
                if (showPaidBtn) {
                    showPaidBtn.addEventListener('click', function() {
                        const list = document.getElementById('paidPlayersList');
                        if (list.style.display === 'none') {
                            list.style.display = 'block';
                            this.textContent = `Скрыть выплаченных (${paidPlayers.length})`;
                            
                            let paidHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; padding: 15px; background: var(--card2); border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; margin-top: -10px;">`;
                            
                            paidPlayers.forEach(name => {
                                const paidData = window._paidPlayersData?.[name] || {};
                                const amount = paidData.amount || 0;
                                const reportCount = paidData.reportCount || 0;
                                const date = paidData.date || '—';
                                const paymentsCount = paidData.paymentsCount || 0;
                                
                                // Показываем количество выплат, если их несколько
                                const paymentsInfo = paymentsCount > 1 ? ` (${paymentsCount} выплаты)` : '';
                                
                                paidHtml += `
                                    <div style="padding: 10px; background: var(--card); border-radius: 8px; border: 1px solid var(--green); text-align: center;">
                                        <div style="font-size: 16px; color: var(--white); font-weight: 600;">${name}</div>
                                        <div style="color: var(--gray); font-size: 13px; margin-top: 6px;">
                                            📋 ${reportCount} отч.${paymentsInfo} | 📅 ${date}
                                        </div>
                                        <div style="color: var(--gray); font-size: 14px; margin-top: 4px;">💰 ${formatCurrency(amount)}</div>
                                        <div style="color: var(--green); font-size: 13px; margin-top: 4px;">✅ Выплачено</div>
                                    </div>
                                `;
                            });
                            
                            paidHtml += `</div>`;
                            list.innerHTML = paidHtml;
                        } else {
                            list.style.display = 'none';
                            this.textContent = `Показать выплаченных (${paidPlayers.length})`;
                        }
                    });
                }

                // ====== КНОПКИ ВЫПЛАТЫ ======
                document.querySelectorAll('.btn-pay').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const playerName = decodeURIComponent(this.dataset.player);
                        const amount = parseInt(this.dataset.amount);
                        const startDate = document.getElementById('salaryDateStart').value;
                        const endDate = document.getElementById('salaryDateEnd').value;
                        payPlayer(playerName, amount, startDate, endDate);
                    });
                });

                window._salaryData = {
                    players: players,
                    sortedPlayers: sortedPlayers,
                    unpaidPlayers: unpaidPlayers,
                    paidPlayers: paidPlayers,
                    allEvents: allEvents,
                    totalSum: totalSum,
                    startDate: startDate,
                    endDate: endDate,
                    approvedReports: approvedReports,
                    pendingReports: pendingReports,
                    fines: fines,
                    extras: extras
                };

                results.style.display = "block";
                loading.style.display = "none";

                if (currentUserRole === "leader") {
                    setTimeout(() => {
                        loadPlayersForFines();
                        loadPlayersForExtra();
                        loadExtraEarnings();
                        loadFines();
                    }, 500);
                }

                showToast(`Рассчитано! Ожидают выплату: ${unpaidPlayers.length}`, "success");

            } catch (error) {
                console.error("Ошибка расчета зарплаты:", error);
                showToast("Ошибка расчета: " + error.message, "error");
                loading.style.display = "none";
            }
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && salaryModal?.classList.contains("active")) {
            closeSalaryModal();
        }
    });
});

// ==================== АВТОСОХРАНЕНИЕ ЦЕН ====================
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".price-input").forEach((input) => {
        input.addEventListener("change", function () {
            const prices = {};
            document.querySelectorAll(".price-input").forEach((inp) => {
                const event = inp.id.replace("price_", "");
                prices[event] = parseInt(inp.value) || 0;
            });
            // ====== ИСПОЛЬЗУЕМ window.savePrices ======
            if (typeof window.savePrices === 'function') {
                window.savePrices(prices);
            } else {
                // fallback
                localStorage.setItem("eventPrices", JSON.stringify(prices));
                window._prices = prices;
            }
            console.log("🔄 Автосохранение цен:", prices);
        });
    });
});

// ==================== ОБРАБОТЧИК ВЫПЛАТЫ ====================

// Функция-обработчик для кнопок выплаты
function handlePayClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPaying) {
        console.log('⏳ Выплата уже выполняется, игнорируем клик');
        return;
    }
    
    const btn = e.currentTarget;
    const playerName = decodeURIComponent(btn.dataset.player);
    const amount = parseInt(btn.dataset.amount);
    const startDate = document.getElementById('salaryDateStart').value;
    const endDate = document.getElementById('salaryDateEnd').value;
    
    btn.disabled = true;
    btn.textContent = '⏳';
    
    performPay(playerName, amount, startDate, endDate, btn);
}

// Основная функция выплаты
let paymentInProgress = false;
let lastPaymentTime = 0;

async function performPay(playerName, amount, startDate, endDate, btn) {
    // Проверяем, не идет ли уже выплата
    if (paymentInProgress) {
        console.log('⏳ Выплата уже выполняется, игнорируем');
        return;
    }
    
    // Проверяем, не было ли выплаты в последнюю секунду
    const now = Date.now();
    if (now - lastPaymentTime < 2000) {
        console.log('⏳ Слишком быстрый повторный клик, игнорируем');
        return;
    }
    
    paymentInProgress = true;
    lastPaymentTime = now;
    
    try {
        console.log('💰 Выплата игроку:', playerName);
        console.log('📅 Период:', startDate, '—', endDate);
        
        // Проверяем существующую выплату
        const existingPayments = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments',
            [
                Appwrite.Query.equal("playerName", playerName),
                Appwrite.Query.equal("periodStart", startDate),
                Appwrite.Query.equal("periodEnd", endDate)
            ]
        );

        if (existingPayments.documents.length > 0) {
            showToast(`${playerName} уже получал выплату за этот период!`, "warning");
            if (btn) {
                btn.disabled = false;
                btn.textContent = '💰 Выплатить';
            }
            paymentInProgress = false;
            return;
        }

        // ПОКАЗЫВАЕМ УВЕДОМЛЕНИЕ ТОЛЬКО ОДИН РАЗ
        const confirmResult = confirm(`Выплатить ${playerName} сумму ${formatCurrency(amount)}?`);
        if (!confirmResult) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '💰 Выплатить';
            }
            paymentInProgress = false;
            return;
        }

        let userId = null;
        let userName = playerName;
        
        try {
            const users = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.usersCollectionId
            );
            
            const foundUser = users.documents.find(u => 
                u.username && u.username.toLowerCase() === playerName.toLowerCase()
            );
            
            if (foundUser) {
                userId = foundUser.$id;
                userName = foundUser.username;
                console.log('👤 Найден пользователь в БД:', userName, 'ID:', userId);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка поиска пользователя:', error);
        }

        const paymentData = {
            playerName: userName,
            userId: userId,
            amount: amount,
            date: new Date().toLocaleDateString('ru-RU'),
            paidBy: currentUserNickname || 'Лидер',
            periodStart: startDate,
            periodEnd: endDate,
            timestamp: Date.now()
        };

        console.log('📝 Сохраняем выплату:', paymentData);

        await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            'payments',
            'unique()',
            paymentData
        );

        showToast(`${userName} выплачено ${formatCurrency(amount)}!`, 'success');
        
        // Обновляем таблицу
        const rows = document.querySelectorAll('#salaryTable tbody tr');
        rows.forEach(row => {
            const nameCell = row.querySelector('td:nth-child(2)');
            if (nameCell && nameCell.textContent.trim() === userName) {
                const statusCell = row.querySelector('td:nth-last-child(2)');
                const actionCell = row.querySelector('td:last-child');
                
                if (statusCell) {
                    statusCell.innerHTML = '<span class="status-paid">Выплачено</span>';
                }
                if (actionCell) {
                    actionCell.innerHTML = '<span class="btn-paid">Выплачено</span>';
                }
                console.log('✅ Обновлен статус для:', userName);
            }
        });
        
        await loadSalaryHistory();

    } catch (error) {
        console.error("❌ Ошибка выплаты:", error);
        showToast("Ошибка выплаты: " + error.message, "error");
    } finally {
        paymentInProgress = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💰 Выплатить';
        }
    }
}

// Функция для привязки обработчиков к кнопкам через делегирование
function attachPayButtons() {
    const table = document.getElementById('salaryTable');
    if (!table) return;
    
    table.removeEventListener('click', handleTablePayClick);
    table.addEventListener('click', handleTablePayClick);
}

// Обработчик через делегирование
function handleTablePayClick(e) {
    const btn = e.target.closest('.btn-pay');
    if (!btn) return;
    if (btn.disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Проверяем, не идет ли уже выплата
    if (paymentInProgress) {
        console.log('⏳ Выплата уже выполняется, игнорируем клик');
        return;
    }
    
    // Проверяем, не слишком ли часто кликают
    const now = Date.now();
    if (now - lastPaymentTime < 1500) {
        console.log('⏳ Слишком быстрый повторный клик, игнорируем');
        return;
    }
    
    const playerName = decodeURIComponent(btn.dataset.player);
    const amount = parseInt(btn.dataset.amount);
    const startDate = document.getElementById('salaryDateStart').value;
    const endDate = document.getElementById('salaryDateEnd').value;
    
    btn.disabled = true;
    btn.textContent = '⏳';
    
    performPay(playerName, amount, startDate, endDate, btn);
}

// ==================== РЕДАКТИРОВАНИЕ ОТЧЕТА ====================
window.editReport = async function(reportId) {
    const modal = document.getElementById('editReportModal');
    const closeBtn = document.getElementById('editReportModalClose');
    const cancelBtn = document.getElementById('editReportModalCancel');
    const form = document.getElementById('editReportForm');
    const errorEl = document.getElementById('editReportError');
    const submitBtn = document.getElementById('editReportSubmitBtn');
    
    if (!modal) {
        showToast('Ошибка: модальное окно не найдено', 'error');
        return;
    }
    
    try {
        const report = allReports.find(r => r.$id === reportId);
        if (!report) {
            showToast('Отчет не найден', 'error');
            return;
        }
        
        // Заполняем форму
        document.getElementById('editReportDate').value = report.date || '';
        document.getElementById('editReportEvent').value = report.event || '';
        document.getElementById('editReportTimeStart').value = report.time_start || '';
        document.getElementById('editReportTimeEnd').value = report.time_end || '';
        document.getElementById('editReportDescription').value = report.description || '';
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const submitHandler = async function(e) {
            e.preventDefault();
            errorEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ SAVING...';
            
            try {
                const date = document.getElementById('editReportDate').value;
                const event = document.getElementById('editReportEvent').value;
                const timeStart = document.getElementById('editReportTimeStart').value;
                const timeEnd = document.getElementById('editReportTimeEnd').value;
                const description = document.getElementById('editReportDescription').value.trim() || '';
                
                if (!date || !event || !timeStart || !timeEnd) {
                    errorEl.textContent = '⚠️ Заполните все обязательные поля!';
                    errorEl.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 SAVE';
                    return;
                }
                
                const timeString = `${timeStart} — ${timeEnd}`;
                
                await database.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.reportsCollectionId,
                    reportId,
                    {
                        date: date,
                        event: event,
                        time: timeString,
                        time_start: timeStart,
                        time_end: timeEnd,
                        description: description
                    }
                );
                
                showToast('Отчет обновлен!', 'success');
                closeModal();
                loadReports();
                updateStats();
                
            } catch (error) {
                console.error('❌ Ошибка обновления отчета:', error);
                errorEl.textContent = '❌ Ошибка: ' + error.message;
                errorEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '💾 SAVE';
            }
        };
        
        const closeModal = function() {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            form.removeEventListener('submit', submitHandler);
            closeBtn.removeEventListener('click', closeModal);
            cancelBtn.removeEventListener('click', closeModal);
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 SAVE';
        };
        
        form.addEventListener('submit', submitHandler);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка открытия редактора:', error);
        showToast('Ошибка: ' + error.message, 'error');
    }
};

// ==================== ТОГГЛ ИНСТРУКЦИИ В ОТЧЕТАХ ====================
window.toggleReportsGuide = function() {
    const content = document.getElementById('reportsGuideContent');
    const arrow = document.getElementById('reportsGuideArrow');
    
    if (!content || !arrow) return;
    
    content.classList.toggle('open');
    arrow.classList.toggle('open');
};

// ==================== УВЕДОМЛЕНИЯ ====================

// Добавить уведомление в БД
async function addNotification(userId, title, text, type = 'info', reportId = null) {
    try {
        await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            'unique()',
            {
                userId: userId,
                title: title,
                text: text, // теперь можно передавать HTML
                type: type,
                reportId: reportId || '',
                date: new Date().toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                timestamp: Date.now(),
                read: false
            }
        );
        console.log('✅ Уведомление сохранено в БД');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения уведомления:', error);
        return false;
    }
}

// Получить уведомления для текущего пользователя
async function getNotifications() {
    try {
        const userId = window.currentUserId || currentUserId;
        if (!userId) return [];
        
        const result = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            [
                Appwrite.Query.equal("userId", userId),
                Appwrite.Query.orderDesc("timestamp")
            ]
        );
        return result.documents || [];
    } catch (error) {
        console.error('❌ Ошибка загрузки уведомлений:', error);
        return [];
    }
}

// Обновить бейдж уведомлений
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
            // Добавляем анимацию для привлечения внимания
            badge.style.animation = 'none';
            setTimeout(() => {
                badge.style.animation = 'pulse 0.5s ease 3';
            }, 10);
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Отметить одно уведомление как прочитанное
// Отметить одно уведомление как прочитанное
window.markNotificationRead = async function(id) {
    try {
        console.log('📝 Отмечаем уведомление как прочитанное:', id);
        
        // Проверяем, что уведомление существует и не прочитано
        const notifications = await getNotifications();
        const notif = notifications.find(n => n.$id === id);
        
        if (!notif) {
            console.warn('⚠️ Уведомление не найдено');
            return;
        }
        
        if (notif.read === true) {
            console.log('ℹ️ Уведомление уже прочитано');
            return;
        }
        
        await database.updateDocument(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            id,
            { read: true }
        );
        console.log('✅ Уведомление отмечено как прочитанное');
        
        // Перерисовываем с текущим фильтром
        const activeFilter = document.querySelector('.notification-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';
        await renderNotifications(filter);
        
    } catch (error) {
        console.error('❌ Ошибка отметки прочитанного:', error);
        showToast('Ошибка: ' + error.message, 'error');
    }
};

// Удалить одно уведомление
window.deleteNotification = async function(id) {
    try {
        await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            id
        );
        const activeFilter = document.querySelector('.notification-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';
        await renderNotifications(filter);
        showToast('Уведомление удалено', 'info');
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        showToast('Ошибка удаления', 'error');
    }
};

// Отметить одно уведомление как прочитанное
window.markNotificationRead = async function(id) {
    try {
        await database.updateDocument(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            id,
            { read: true }
        );
        // Перерисовываем с текущим фильтром
        const activeFilter = document.querySelector('.notification-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';
        await renderNotifications(filter);
    } catch (error) {
        console.error('❌ Ошибка отметки прочитанного:', error);
        // Если ошибка 401 - показываем сообщение
        if (error.message && error.message.includes('not authorized')) {
            showToast('У вас нет прав на изменение этого уведомления', 'warning');
        } else {
            showToast('Ошибка: ' + error.message, 'error');
        }
    }
};

// Очистить все уведомления
async function clearAllNotifications() {
    if (!confirm('Удалить все уведомления?')) return;
    
    try {
        const notifications = await getNotifications();
        for (const notif of notifications) {
            await database.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                'notifications',
                notif.$id
            );
        }
        const activeFilter = document.querySelector('.notification-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';
        await renderNotifications(filter);
        showToast('Все уведомления удалены', 'info');
    } catch (error) {
        console.error('❌ Ошибка очистки:', error);
        showToast('Ошибка очистки', 'error');
    }
}

// Очистка уведомлений
document.addEventListener("DOMContentLoaded", function () {
    const clearBtn = document.getElementById('clearNotificationsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllNotifications);
    }
    
    // При переходе на вкладку уведомлений - показываем все
    const notifTab = document.querySelector('.sidebar-nav-btn[data-tab="notifications"]');
    if (notifTab) {
        notifTab.addEventListener('click', function() {
            setTimeout(() => {
                // Сбрасываем фильтр на "Все"
                document.querySelectorAll('.notification-filter').forEach(b => b.classList.remove('active'));
                const allFilter = document.querySelector('.notification-filter[data-filter="all"]');
                if (allFilter) allFilter.classList.add('active');
                renderNotifications('all');
            }, 300);
        });
    }
});

// Отметить все как прочитанные
async function markAllNotificationsRead() {
    try {
        console.log('📝 Отмечаем все как прочитанные...');
        
        const notifications = await getNotifications();
        const unread = notifications.filter(n => n.read !== true);
        
        if (unread.length === 0) {
            showToast('Нет непрочитанных уведомлений', 'info');
            return;
        }
        
        console.log(`🔄 Отмечаем ${unread.length} уведомлений как прочитанные`);
        
        for (const notif of unread) {
            await database.updateDocument(
                APPWRITE_CONFIG.databaseId,
                'notifications',
                notif.$id,
                { read: true }
            );
        }
        
        console.log('✅ Все уведомления отмечены как прочитанные');
        
        // Получаем текущий фильтр
        const activeFilter = document.querySelector('.notification-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';
        
        // Перерисовываем уведомления
        await renderNotifications(filter);
        
        // Обновляем бейдж
        updateNotificationBadge(0);
        
        showToast('Все уведомления отмечены как прочитанные', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка отметки всех:', error);
        showToast('Ошибка: ' + error.message, 'error');
    }
}

// ==================== ОБРАБОТЧИКИ УВЕДОМЛЕНИЙ ====================
document.addEventListener("DOMContentLoaded", function () {
    
    // Кнопка "Прочитать все"
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        // Удаляем старый обработчик, если есть
        markAllBtn.removeEventListener('click', markAllNotificationsRead);
        markAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            markAllNotificationsRead();
        });
    }
    
    // Кнопка "Очистить все"
    const clearBtn = document.getElementById('clearNotificationsBtn');
    if (clearBtn) {
        // Удаляем старый обработчик, если есть
        clearBtn.removeEventListener('click', clearAllNotifications);
        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearAllNotifications();
        });
    }
    
    // ====== ФИЛЬТРЫ УВЕДОМЛЕНИЙ ======
    const filterBtns = document.querySelectorAll('.notification-filter');
    console.log('🔍 Найдено фильтров:', filterBtns.length);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('🔽 Нажат фильтр:', this.dataset.filter);
            
            // Убираем активный класс у всех
            filterBtns.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс текущему
            this.classList.add('active');
            
            // Получаем фильтр
            const filter = this.dataset.filter;
            console.log('📊 Применяем фильтр:', filter);
            
            // Применяем фильтр
            await renderNotifications(filter);
        });
    });
    
    // При переходе на вкладку уведомлений
    const notifTab = document.querySelector('.sidebar-nav-btn[data-tab="notifications"]');
    if (notifTab) {
        notifTab.addEventListener('click', function() {
            console.log('🔔 Переход на вкладку уведомлений');
            setTimeout(async () => {
                // Сбрасываем фильтр на "Все"
                document.querySelectorAll('.notification-filter').forEach(b => b.classList.remove('active'));
                const allFilter = document.querySelector('.notification-filter[data-filter="all"]');
                if (allFilter) allFilter.classList.add('active');
                await renderNotifications('all');
            }, 300);
        });
    }
});

// Рендеринг уведомлений
async function renderNotifications(filter = 'all') {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const notifications = await getNotifications();
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-reports">
                <p>📭 Нет уведомлений</p>
                <span>Здесь будут отображаться уведомления о статусе ваших отчетов</span>
            </div>
        `;
        updateNotificationBadge(0);
        return;
    }
    
    let filtered = [...notifications];
    if (filter === 'unread') {
        filtered = filtered.filter(n => n.read === false || n.read === undefined);
    } else if (filter === 'read') {
        filtered = filtered.filter(n => n.read === true);
    }
    
    if (filtered.length === 0) {
        const messages = {
            'unread': '🆕 Нет новых уведомлений',
            'read': '📖 Нет прочитанных уведомлений'
        };
        container.innerHTML = `
            <div class="empty-reports">
                <p>${messages[filter] || '📭 Нет уведомлений'}</p>
                <span>${filter === 'unread' ? 'Все уведомления уже прочитаны' : 'У вас нет прочитанных уведомлений'}</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach(notif => {
        const iconMap = {
            'deleted': '🗑️',
            'approved': '✅',
            'pending': '⏳',
            'info': 'ℹ️',
            'payment': '💰'
        };
        const icon = iconMap[notif.type] || 'ℹ️';
        const typeClass = notif.type || 'info';
        const isRead = notif.read === true;
        const readClass = isRead ? 'read' : 'unread';
        
        // Обрабатываем текст с HTML
        let textContent = notif.text || '';
        // Если текст содержит HTML теги, оставляем как есть
        // Иначе оборачиваем в <p>
        if (!textContent.includes('<')) {
            textContent = `<p>${textContent}</p>`;
        }
        
        html += `
            <div class="notification-item ${typeClass} ${readClass}" data-id="${notif.$id}">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content" onclick="markNotificationRead('${notif.$id}')">
                    <div class="notification-title">
                        ${notif.title}
                        ${!isRead ? '<span class="notification-badge-small">🆕</span>' : ''}
                    </div>
                    <div class="notification-text">
                        ${textContent}
                    </div>
                    <div class="notification-date">📅 ${notif.date}</div>
                </div>
                <button class="notification-delete" onclick="deleteNotification('${notif.$id}')">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const unread = notifications.filter(n => n.read !== true).length;
    updateNotificationBadge(unread);
}

// ====== ОБНОВЛЕНИЕ ЗАРПЛАТЫ ИГРОКА ======
function refreshPlayerSalary() {
    if (currentUserRole !== "leader") {
        console.log('🔄 Обновляем зарплату игрока...');
        const salaryResults = document.getElementById("salaryResults");
        if (salaryResults && salaryResults.style.display !== "none") {
            loadPlayerSalary();
        }
    }
}

window.refreshPlayerSalary = refreshPlayerSalary;

// ==================== ФОРМАТИРОВАНИЕ ДАТЫ ====================
function formatDateForNotification(dateString) {
    if (!dateString) return 'дата не указана';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return dateString;
    } catch (error) {
        return dateString;
    }
}

// ==================== ОБНОВЛЕНИЕ ОТЧЕТОВ ====================
document.addEventListener("DOMContentLoaded", function () {
    const refreshReportsBtn = document.getElementById("refreshReportsBtn");
    if (refreshReportsBtn) {
        refreshReportsBtn.addEventListener("click", function () {
            this.textContent = "⏳";
            this.disabled = true;
            showToast("🔄 Обновление отчетов...", "info");
            
            loadReports();
            renderPlayersStats();
            updateStats();
            
            setTimeout(() => {
                this.textContent = "🔄 Обновить";
                this.disabled = false;
                showToast("✅ Отчеты обновлены", "success");
            }, 1000);
        });
    }
});

// ==================== СТАТИСТИКА ИГРОКОВ (ДЛЯ ЛИДЕРА) ====================
async function renderPlayersStats() {
    const container = document.getElementById('playersStatsContainer');
    const grid = document.getElementById('playersStatsGrid');
    const countEl = document.getElementById('playersStatsCount');
    const toggleBtn = document.getElementById('toggleStatsBtn');
    
    if (!container || !grid) return;
    
    if (currentUserRole !== 'leader') {
        container.style.display = 'none';
        return;
    }
    
    // ====== ЗАГРУЖАЕМ ВСЕ ВЫПЛАТЫ ДЛЯ СТАТИСТИКИ ======
    let paidReportIds = new Set();
    let allPayments = [];
    
    try {
        const paymentsData = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );
        allPayments = paymentsData || [];
        allPayments.forEach(p => {
            if (p.reportIds) {
                const ids = p.reportIds.split(',');
                ids.forEach(id => paidReportIds.add(id));
            }
        });
        console.log('💰 Загружено выплат для статистики:', allPayments.length);
        
        // После загрузки выплат - строим статистику
        buildPlayersStats(paidReportIds);
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки выплат для статистики:', error);
        buildPlayersStats(new Set());
    }
    
    function buildPlayersStats(paidIds) {
        // Собираем статистику по игрокам из allReports
        const playersStats = {};
        allReports.forEach(report => {
            const name = report.user_name || 'Неизвестен';
            if (!playersStats[name]) {
                playersStats[name] = {
                    total: 0,
                    approved: 0,
                    pending: 0,
                    paid: 0,
                    unpaid: 0,
                    events: {},
                    lastReport: report.date || '—',
                    hasPending: false
                };
            }
            playersStats[name].total++;
            if (report.is_approved) {
                playersStats[name].approved++;
                // Проверяем, выплачен ли отчет
                if (paidIds.has(report.$id)) {
                    playersStats[name].paid++;
                } else {
                    playersStats[name].unpaid++;
                }
            } else {
                playersStats[name].pending++;
                playersStats[name].hasPending = true;
            }
            const event = report.event || 'OTHER';
            if (!playersStats[name].events[event]) {
                playersStats[name].events[event] = 0;
            }
            playersStats[name].events[event]++;
            if (report.date && report.date > playersStats[name].lastReport) {
                playersStats[name].lastReport = report.date;
            }
        });
        
        const playerNames = Object.keys(playersStats);
        const count = playerNames.length;
        
        if (countEl) countEl.textContent = `${count} игроков`;
        
        const isVisible = loadStatsVisibility();
        
        if (toggleBtn) {
            toggleBtn.textContent = isVisible ? '▲ Скрыть' : '▼ Показать';
        }
        
        container.style.display = 'block';
        
        if (!isVisible) {
            grid.classList.add('hidden');
        } else {
            grid.classList.remove('hidden');
        }
        
        if (count === 0) {
            grid.innerHTML = `
                <div class="empty-reports" style="padding: 30px 20px;">
                    <p>📭 Нет отчетов</p>
                    <span>Игроки еще не добавляли отчеты</span>
                </div>
            `;
            return;
        }
        
        // Сортировка: сначала те, у кого есть ожидающие или невыплаченные
        const sortedPlayers = playerNames.sort((a, b) => {
            const aHasPending = playersStats[a].hasPending || playersStats[a].unpaid > 0;
            const bHasPending = playersStats[b].hasPending || playersStats[b].unpaid > 0;
            
            if (aHasPending && !bHasPending) return -1;
            if (!aHasPending && bHasPending) return 1;
            
            return playersStats[b].total - playersStats[a].total;
        });
        
        let html = '';
        sortedPlayers.forEach(name => {
            const stats = playersStats[name];
            const total = stats.total;
            const approved = stats.approved;
            const pending = stats.pending;
            const paid = stats.paid;
            const unpaid = stats.unpaid;
            const lastReport = stats.lastReport ? new Date(stats.lastReport + 'T00:00:00').toLocaleDateString('ru-RU') : '—';
            
            let statusColor = 'var(--yellow)';
            let statusText = '⏳ Ожидают';
            if (pending === 0 && unpaid === 0 && total > 0) {
                statusColor = 'var(--green)';
                statusText = '✅ Все выплачены';
            } else if (pending > 0 && unpaid > 0) {
                statusColor = 'var(--yellow)';
                statusText = `⏳ ${pending} ожид. / ${unpaid} невыпл.`;
            } else if (pending > 0) {
                statusColor = 'var(--yellow)';
                statusText = `⏳ ${pending} ожидают утверждения`;
            } else if (unpaid > 0) {
                statusColor = 'var(--orange)';
                statusText = `⏳ ${unpaid} ожидают выплаты`;
            } else if (total === 0) {
                statusColor = 'var(--gray)';
                statusText = '❌ Нет отчетов';
            }
            
            const cardClass = (pending > 0 || unpaid > 0) ? 'has-pending' : 'all-approved';
            
            html += `
                <div class="player-stat-card ${cardClass}">
                    <div class="player-stat-header">
                        <span class="player-stat-name">${name}</span>
                        <span class="player-stat-total">📊 ${total}</span>
                    </div>
                    <div class="player-stat-body">
                        <div class="player-stat-item">
                            <span class="player-stat-label">✅ Утверждено:</span>
                            <span class="player-stat-value approved">${approved}</span>
                        </div>
                        <div class="player-stat-item">
                            <span class="player-stat-label">⏳ Ожидают:</span>
                            <span class="player-stat-value pending">${pending}</span>
                        </div>
                        <div class="player-stat-item">
                            <span class="player-stat-label">💰 Выплачено:</span>
                            <span class="player-stat-value" style="color: var(--green);">${paid}</span>
                        </div>
                        <div class="player-stat-item">
                            <span class="player-stat-label">⏳ Ждут выплаты:</span>
                            <span class="player-stat-value" style="color: var(--orange);">${unpaid}</span>
                        </div>
                        <div class="player-stat-item full-width">
                            <span class="player-stat-label">📅 Последний:</span>
                            <span class="player-stat-value">${lastReport}</span>
                        </div>
                    </div>
                    <div class="player-stat-footer">
                        <span class="player-stat-status" style="color: ${statusColor}">${statusText}</span>
                        <button class="btn-action btn-filter-player" data-player="${name}" onclick="filterByPlayer('${name}')">
                            🔍 Показать отчеты
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }
}

// ==================== СТАТИСТИКА ОТЧЕТОВ С ВЫПЛАТАМИ ====================
async function renderReportsStats() {
    const container = document.getElementById('reportsStats');
    if (!container) return;
    
    // Показываем только для лидера
    if (currentUserRole !== 'leader') {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // ====== ЗАГРУЖАЕМ ВЫПЛАТЫ ======
    let paidReportIds = new Set();
    try {
        const paymentsData = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );
        paymentsData.documents.forEach(p => {
            if (p.reportIds) {
                const ids = p.reportIds.split(',');
                ids.forEach(id => paidReportIds.add(id));
            }
        });
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки выплат для статистики отчетов:', error);
    }
    
    // ====== ПОДСЧЕТ СТАТИСТИКИ ======
    let total = allReports.length;
    let approved = 0;
    let pending = 0;
    let paid = 0;
    let unpaid = 0;
    
    allReports.forEach(report => {
        if (report.is_approved) {
            approved++;
            if (paidReportIds.has(report.$id)) {
                paid++;
            } else {
                unpaid++;
            }
        } else {
            pending++;
        }
    });
    
    // ====== ОБНОВЛЯЕМ DOM ======
    const totalEl = document.getElementById('reportsTotalCount');
    const approvedEl = document.getElementById('reportsApprovedCount');
    const pendingEl = document.getElementById('reportsPendingCount');
    const paidEl = document.getElementById('reportsPaidCount');
    const unpaidEl = document.getElementById('reportsUnpaidCount');
    
    if (totalEl) totalEl.textContent = total;
    if (approvedEl) approvedEl.textContent = approved;
    if (pendingEl) pendingEl.textContent = pending;
    if (paidEl) paidEl.textContent = paid;
    if (unpaidEl) unpaidEl.textContent = unpaid;
    
    console.log('📊 Статистика отчетов:', { total, approved, pending, paid, unpaid });
}

// Делаем функцию глобальной
window.renderReportsStats = renderReportsStats;

// ====== ОБРАБОТЧИК КНОПКИ СКРЫТЬ/ПОКАЗАТЬ ======
document.addEventListener("DOMContentLoaded", function() {
    const toggleBtn = document.getElementById('toggleStatsBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const grid = document.getElementById('playersStatsGrid');
            const isVisible = !grid.classList.contains('hidden');
            
            if (isVisible) {
                grid.classList.add('hidden');
                this.textContent = '▼ Показать';
                saveStatsVisibility(false);
            } else {
                grid.classList.remove('hidden');
                this.textContent = '▲ Скрыть';
                saveStatsVisibility(true);
            }
        });
    }
});

// Фильтр по игроку
window.filterByPlayer = function(playerName) {
    // Находим фильтр "Участник" и устанавливаем его
    const memberFilter = document.getElementById('filterMember');
    if (memberFilter) {
        // Ищем опцию с именем игрока
        const options = memberFilter.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].textContent === playerName) {
                memberFilter.value = options[i].value;
                break;
            }
        }
        // Триггерим событие изменения
        const event = new Event('change');
        memberFilter.dispatchEvent(event);
    }
    
    // Переключаемся на вкладку отчетов и применяем фильтр
    showToast(`🔍 Фильтр по игроку: ${playerName}`, 'info');
};

// ==================== ЗАГРУЗКА ИГРОКОВ ДЛЯ ШТРАФОВ ====================
async function loadPlayersForFines() {
    const select = document.getElementById('finePlayerSelect');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="all">⏳ Загрузка...</option>';
    select.disabled = true;
    
    try {
        const startDate = document.getElementById("salaryDateStart")?.value;
        const endDate = document.getElementById("salaryDateEnd")?.value;
        
        if (!startDate || !endDate) {
            select.innerHTML = '<option value="all">Все игроки</option>';
            select.disabled = false;
            return;
        }
        
        const reportsData = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.reportsCollectionId,
            [
                Appwrite.Query.equal("is_approved", true),
                Appwrite.Query.greaterThanEqual("date", startDate),
                Appwrite.Query.lessThanEqual("date", endDate)
            ]
        );
        
        console.log('📋 Все отчеты за период:', reportsData.documents);
        
        // Используем Set для уникальных userId (как строк)
        const activeUserIds = new Set();
        const userMap = new Map(); // userId -> { id, name }
        
        reportsData.documents.forEach(report => {
            // Получаем userId как строку
            let userId = report.user_id;
            if (typeof userId === 'object' && userId !== null) {
                userId = userId.$id || userId.id || String(userId);
            } else if (userId) {
                userId = String(userId);
            }
            
            // Получаем имя пользователя
            let userName = report.user_name || 'Неизвестен';
            
            // Если userId есть и его еще нет в Set - добавляем
            if (userId && !activeUserIds.has(userId)) {
                activeUserIds.add(userId);
                
                // Пытаемся найти пользователя в allUsers для получения актуального имени
                const user = allUsers.find(u => {
                    const uId = u.$id || u.id || String(u);
                    return String(uId) === userId;
                });
                
                const displayName = user?.username || userName || 'Неизвестен';
                userMap.set(userId, {
                    id: userId,
                    name: displayName
                });
            }
        });
        
        // Сортируем игроков по имени
        const activePlayers = Array.from(userMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`👥 Активных игроков за период: ${activePlayers.length}`, activePlayers);
        
        select.innerHTML = '';
        
        if (activePlayers.length === 0) {
            select.innerHTML = '<option value="all">📭 Нет активных игроков</option>';
            select.disabled = false;
            
            const hint = document.getElementById('finePlayerHint');
            if (hint) {
                hint.textContent = '⚠️ Нет утвержденных отчетов за выбранный период';
                hint.style.color = 'var(--yellow)';
                hint.style.fontSize = '12px';
                hint.style.marginTop = '4px';
            }
            return;
        }
        
        // Добавляем опцию "Все игроки"
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = `Все игроки (${activePlayers.length})`;
        select.appendChild(allOption);
        
        // Добавляем каждого активного игрока
        activePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.name}`;
            select.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение
        if (currentValue && currentValue !== 'all') {
            const stillActive = activePlayers.some(p => p.id === currentValue);
            if (stillActive) {
                select.value = currentValue;
            } else {
                select.value = 'all';
            }
        } else if (currentValue === 'all') {
            select.value = 'all';
        }
        
        select.disabled = false;
        
        const hint = document.getElementById('finePlayerHint');
        if (hint) {
            hint.textContent = `Активных игроков: ${activePlayers.length}`;
            hint.style.color = 'var(--gray)';
            hint.style.fontSize = '14px';
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки игроков для штрафов:', error);
        select.innerHTML = '<option value="all">Все игроки</option>';
        select.disabled = false;
    }
}


// ====== ВСТАВЬТЕ В САМЫЙ КОНЕЦ ФАЙЛА ======
document.addEventListener("DOMContentLoaded", function() {
    const dateStart = document.getElementById("salaryDateStart");
    const dateEnd = document.getElementById("salaryDateEnd");
    
    if (dateStart && dateEnd) {
        const updatePlayers = function() {
            if (currentUserRole === "leader") {
                if (dateStart.value && dateEnd.value) {
                    saveSalaryPeriod(dateStart.value, dateEnd.value);
                }
                setTimeout(() => {
                    loadPlayersForFines();
                }, 300);
            }
        };
        
        dateStart.addEventListener("change", updatePlayers);
        dateEnd.addEventListener("change", updatePlayers);
    }
});


// ====== СОХРАНЕНИЕ ПЕРИОДА В localStorage ======
function saveSalaryPeriod(startDate, endDate) {
    if (startDate && endDate) {
        localStorage.setItem('salaryPeriodStart', startDate);
        localStorage.setItem('salaryPeriodEnd', endDate);
        console.log('💾 Период сохранен:', startDate, '—', endDate);
    }
}

function loadSalaryPeriod() {
    const start = localStorage.getItem('salaryPeriodStart');
    const end = localStorage.getItem('salaryPeriodEnd');
    return { start, end };
}

window.saveSalaryPeriod = saveSalaryPeriod;
window.loadSalaryPeriod = loadSalaryPeriod;


const quickBtns = document.querySelectorAll(".btn-quick");
quickBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
        quickBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        const days = parseInt(this.dataset.days);
        if (days === 0) return;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const startDate = start.toISOString().split("T")[0];
        const endDate = end.toISOString().split("T")[0];
        document.getElementById("salaryDateStart").value = startDate;
        document.getElementById("salaryDateEnd").value = endDate;
        
        // ====== СОХРАНЯЕМ ПЕРИОД ======
        saveSalaryPeriod(startDate, endDate);
    });
});

// ====== ОБРАБОТЧИК ДОБАВЛЕНИЯ ДОП. ЗАРАБОТКА ======
document.addEventListener("DOMContentLoaded", function() {

    const addExtraBtn = document.getElementById("addExtraBtn");
    if (addExtraBtn) {
        addExtraBtn.addEventListener("click", function() {
            const playerSelect = document.getElementById("extraPlayerSelect");
            const eventInput = document.getElementById("extraEvent");
            const amountInput = document.getElementById("extraAmount");
            
            const playerId = playerSelect?.value;
            const eventName = eventInput?.value.trim() || "Доп. заработок";
            const amount = parseInt(amountInput?.value);
            
            if (!playerId) {
                showToast("Выберите игрока!", "warning");
                return;
            }
            
            if (!amount || amount <= 0) {
                showToast("Введите сумму!", "warning");
                return;
            }
            
            addExtraEarning(playerId, eventName, amount);
            
            if (eventInput) eventInput.value = "";
            if (amountInput) amountInput.value = "";
            
            showToast(`✅ Добавлено ${formatCurrency(amount)} за "${eventName}"`, "success");
            
            // ====== ОБНОВЛЯЕМ ЗАРПЛАТУ ИГРОКА (ЕСЛИ ОН НЕ ЛИДЕР) ======
            refreshPlayerSalary();
        });
    }
    // ====== ОЧИСТКА ДОП. ЗАРАБОТКОВ ======
    const clearExtraBtn = document.getElementById("clearExtraBtn");
    if (clearExtraBtn) {
        clearExtraBtn.addEventListener("click", function() {
            clearAllExtraEarnings();
        });
    }
});

// ==================== ЗАГРУЗКА ВЫПЛАТ ДЛЯ ОТЧЕТОВ ====================
let _paidReportIds = null;

async function loadPaymentsForReports() {
    try {
        const payments = await loadAllDocuments(
            APPWRITE_CONFIG.databaseId,
            'payments'
        );
        
        _paidReportIds = new Set();
        payments.forEach(p => {
            if (p.reportIds) {
                const ids = p.reportIds.split(',');
                ids.forEach(id => _paidReportIds.add(id));
            }
        });
        window._paidReportIds = _paidReportIds;
        
        console.log('💰 Загружено выплаченных отчетов:', _paidReportIds.size);
        return _paidReportIds;
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки выплат для отчетов:', error);
        _paidReportIds = new Set();
        window._paidReportIds = _paidReportIds;
        return _paidReportIds;
    }
}

window.loadPaymentsForReports = loadPaymentsForReports;

// ====== СОХРАНЕНИЕ СОСТОЯНИЯ СТАТИСТИКИ ======
function saveStatsVisibility(visible) {
    localStorage.setItem('statsVisible', visible ? 'true' : 'false');
}

function loadStatsVisibility() {
    const saved = localStorage.getItem('statsVisible');
    // По умолчанию показываем (true), если не сохранено
    return saved !== null ? saved === 'true' : true;
}
window.saveStatsVisibility = saveStatsVisibility;
window.loadStatsVisibility = loadStatsVisibility;

function restoreSalaryPeriod() {
    const savedPeriod = loadSalaryPeriod();
    if (savedPeriod.start && savedPeriod.end) {
        const startInput = document.getElementById("salaryDateStart");
        const endInput = document.getElementById("salaryDateEnd");
        if (startInput && endInput) {
            startInput.value = savedPeriod.start;
            endInput.value = savedPeriod.end;
            console.log('🔄 Восстановлен период:', savedPeriod.start, '—', savedPeriod.end);
            return true;
        }
    }
    return false;
}

window.restoreSalaryPeriod = restoreSalaryPeriod;


// Делаем функцию глобальной
window.clearAllExtraEarnings = clearAllExtraEarnings;


// ==================== ДЕЛАЕМ ФУНКЦИИ ГЛОБАЛЬНЫМИ ====================
window.loadSalaryHistory = loadSalaryHistory;
window.loadUserData = loadUserData;
window.loadPlayerSalary = loadPlayerSalary;
window.payPlayer = payPlayer;
window.debugPayments = debugPayments;
window.loadHistoryPlayers = loadHistoryPlayers;
window.buildSalaryTable = buildSalaryTable;
window.updateFilterInfo = updateFilterInfo;
window.payHandler = payHandler;
window.buildSalaryTable = buildSalaryTable;
window.updateFilterInfo = updateFilterInfo;
window.performPay = performPay;
window.attachPayButtons = attachPayButtons;
window.handlePayClick = handlePayClick;
window.updateNotificationBadge = updateNotificationBadge;
window.getNotifications = getNotifications;
window.renderNotifications = renderNotifications;
window.updateNotificationBadge = updateNotificationBadge;
window.markNotificationRead = markNotificationRead;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;


// ==================== ЗАПУСК ====================
checkAuth();

window.loadUsers = loadUsers;
window.updateFilter = updateFilter;
window.allUsers = allUsers;
window.loadReports = loadReports;
window.currentUserId = currentUserId;
window.currentUserRole = currentUserRole;
window.currentUserNickname = currentUserNickname;
window.currentUser = currentUser;
window.allReports = allReports;


console.log("✅ Приложение запущено");
