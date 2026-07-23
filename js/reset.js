// ============================================================
// СБРОС ПАРОЛЯ (С TOAST)
// ============================================================

import { APPWRITE_CONFIG } from './config.js';

// ==================== СЕРВЕРНЫЙ КЛЮЧ ====================
const APPWRITE_SERVER_KEY = 'standard_1d7dbe800ef0a16fdbd7d12de26810f9780cb98532a882853cc6631e2bd560360694f4f8b29371b8bcf4c9b352867ea05c89a1177552a5f0a8c140e858a21bb99ee9f1898a19ea4c4c37deddc103e7688495aaade9900a24f951888c775fd844a752c2d8e357e8283b1cf20fe9ea18a84ac2b85ad24e126841d51d70bb791b73';

// ==================== TOAST ====================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icons = { warning: "⚠️", info: "ℹ️" };
    toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

console.log('🔑 Страница сброса пароля');

// ==================== DOM ЭЛЕМЕНТЫ ====================
const statusDiv = document.getElementById('resetStatus');
const form = document.getElementById('resetForm');
const message = document.getElementById('resetMessage');
const resetBtn = document.getElementById('resetBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Получаем параметры из URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const email = params.get('email');

console.log('🔑 Токен:', token);
console.log('📧 Email:', email);

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getHeaders() {
    const cleanKey = APPWRITE_SERVER_KEY.trim().replace(/\s/g, '');
    return {
        'X-Appwrite-Project': APPWRITE_CONFIG.projectId,
        'X-Appwrite-Key': cleanKey,
        'Content-Type': 'application/json'
    };
}

// ==================== ПРОВЕРКА ТОКЕНА ====================
async function verifyToken() {
    if (!token || !email) {
        statusDiv.textContent = 'Ссылка для восстановления недействительна';
        statusDiv.className = 'reset-status error';
        form.style.display = 'none';
        showToast('Ссылка недействительна', 'error');
        return false;
    }

    try {
        console.log('🔍 Проверка токена...');

        const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '[]');
        const tokenDoc = tokens.find(d => d.token === token && d.email === email && !d.used);
        
        if (!tokenDoc) {
            statusDiv.textContent = 'Ссылка недействительна или уже использована';
            statusDiv.className = 'reset-status error';
            form.style.display = 'none';
            showToast('Ссылка уже использована', 'error');
            return false;
        }
        
        const expiresAt = new Date(tokenDoc.expiresAt);
        if (expiresAt < new Date()) {
            statusDiv.textContent = 'Ссылка истекла. Запросите новую.';
            statusDiv.className = 'reset-status error';
            form.style.display = 'none';
            showToast('⏳ Ссылка истекла. Запросите новую.', 'warning');
            return false;
        }
        
        statusDiv.textContent = 'Ссылка действительна! Введите новый пароль.';
        statusDiv.className = 'reset-status success';
        form.style.display = 'block';
        showToast('Ссылка действительна', 'success');
        
        window._tokenData = tokenDoc;
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error);
        statusDiv.textContent = (error.message || 'Ошибка проверки токена');
        statusDiv.className = 'reset-status error';
        form.style.display = 'none';
        showToast((error.message || 'Ошибка проверки'), 'error');
        return false;
    }
}

// ==================== СБРОС ПАРОЛЯ ====================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    message.textContent = '';
    message.className = 'reset-message';

    if (newPassword.length < 8) {
        showToast('⚠️ Пароль должен быть минимум 8 символов!', 'warning');
        message.textContent = '⚠️ Пароль должен быть минимум 8 символов!';
        message.className = 'reset-message error';
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('⚠️ Пароли не совпадают!', 'warning');
        message.textContent = '⚠️ Пароли не совпадают!';
        message.className = 'reset-message error';
        return;
    }

    try {
        resetBtn.disabled = true;
        resetBtn.textContent = '⏳ Saving...';
        showToast('⏳ Сохранение...', 'info');

        const usersResponse = await fetch(
            `${APPWRITE_CONFIG.endpoint}/users`,
            {
                method: 'GET',
                headers: getHeaders()
            }
        );
        
        if (!usersResponse.ok) {
            throw new Error('Ошибка поиска пользователя');
        }
        
        const usersData = await usersResponse.json();
        const user = usersData.users?.find(u => u.email === email);
        
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        console.log('👤 Пользователь найден:', user.$id);

        const updateResponse = await fetch(
            `${APPWRITE_CONFIG.endpoint}/users/${user.$id}/password`,
            {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    password: newPassword
                })
            }
        );
        
        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Ошибка обновления:', errorText);
            
            let errorMessage = 'Ошибка обновления пароля';
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    if (errorJson.message.includes('password')) {
                        errorMessage = 'Пароль должен быть минимум 8 символов';
                    } else {
                        errorMessage = errorJson.message;
                    }
                }
            } catch (e) {
                if (errorText.includes('password')) {
                    errorMessage = 'Пароль должен быть минимум 8 символов';
                }
            }
            throw new Error(errorMessage);
        }

        const result = await updateResponse.json();
        console.log('✅ Пароль обновлен:', result);

        if (window._tokenData) {
            const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '[]');
            const updatedTokens = tokens.map(d => {
                if (d.token === window._tokenData.token && d.email === email) {
                    return { ...d, used: true };
                }
                return d;
            });
            localStorage.setItem('recovery_tokens', JSON.stringify(updatedTokens));
        }
        
        showToast('Пароль успешно изменен!', 'success');
        message.textContent = 'Пароль успешно изменен! Перенаправление...';
        message.className = 'reset-message success';
        resetBtn.textContent = '✅ Done';

        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        showToast((error.message || 'Ошибка смены пароля'), 'error');
        message.textContent = (error.message || 'Ошибка смены пароля');
        message.className = 'reset-message error';
        resetBtn.disabled = false;
        resetBtn.textContent = 'Change password';
    }
});

// ==================== ЗАПУСК ====================
verifyToken();