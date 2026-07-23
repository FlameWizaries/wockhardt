// ============================================================
// ВОССТАНОВЛЕНИЕ ПАРОЛЯ (С TOAST)
// ============================================================

import { APPWRITE_CONFIG } from './config.js';

// ==================== КОНФИГУРАЦИЯ EMAILJS ====================
const EMAILJS_CONFIG = {
    publicKey: 'w8UDmoZozOMrw4Wd8',
    serviceId: 'service_8qzwnhj',
    templateId: 'template_a8285mp'
};

// ==================== СЕРВЕРНЫЙ КЛЮЧ APPWRITE ====================
const APPWRITE_SERVER_KEY = 'standard_1d7dbe800ef0a16fdbd7d12de26810f9780cb98532a882853cc6631e2bd560360694f4f8b29371b8bcf4c9b352867ea05c89a1177552a5f0a8c140e858a21bb99ee9f1898a19ea4c4c37deddc103e7688495aaade9900a24f951888c775fd844a752c2d8e357e8283b1cf20fe9ea18a84ac2b85ad24e126841d51d70bb791b73';

// ==================== TOAST ====================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
        // fallback если контейнера нет
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

console.log('🔑 Страница восстановления пароля');

// Инициализация EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// DOM элементы
const form = document.getElementById('recoveryForm');
const emailInput = document.getElementById('recoveryEmail');
const btn = document.getElementById('recoveryBtn');
const message = document.getElementById('recoveryMessage');

// ==================== ГЕНЕРАЦИЯ ТОКЕНА ====================
function generateToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// ==================== ПОИСК ПОЛЬЗОВАТЕЛЯ ====================
async function findUserByEmail(email) {
    try {
        const response = await fetch(
            `${APPWRITE_CONFIG.endpoint}/users`,
            {
                headers: {
                    'X-Appwrite-Project': APPWRITE_CONFIG.projectId,
                    'X-Appwrite-Key': APPWRITE_SERVER_KEY
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.users?.find(u => u.email === email) || null;
    } catch (error) {
        console.error('❌ Ошибка поиска пользователя:', error);
        throw error;
    }
}

// ==================== ОТПРАВКА ПИСЬМА ====================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showToast('⚠️ Введите email!', 'warning');
        message.textContent = '⚠️ Введите email!';
        message.className = 'recovery-message error';
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';
        message.textContent = '';
        message.className = 'recovery-message';

        console.log('📧 Отправка ссылки для сброса на:', email);

        const user = await findUserByEmail(email);
        
        if (!user) {
            showToast('Пользователь с таким email не найден', 'error');
            throw new Error('Пользователь с таким email не найден');
        }
        
        console.log('👤 Пользователь найден:', user.$id);

        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const tokenData = {
            userId: user.$id,
            email: email,
            token: token,
            expiresAt: expiresAt.toISOString(),
            used: false
        };
        
        const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '[]');
        tokens.push(tokenData);
        localStorage.setItem('recovery_tokens', JSON.stringify(tokens));
        console.log('✅ Токен сохранен в localStorage');

        const resetLink = window.location.origin + '/reset-password.html?token=' + token + '&email=' + encodeURIComponent(email);
        console.log('🔗 Ссылка для сброса:', resetLink);

        const templateParams = {
            email: email,
            reset_link: resetLink,
            year: new Date().getFullYear(),
            from_name: 'THE WOCKHARDT MANDEM'
        };
        
        console.log('📤 Отправка через EmailJS...');
        
        const result = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );
        
        console.log('✅ Письмо отправлено:', result);

        showToast('Ссылка для сброса пароля отправлена на ' + email, 'success');
        message.textContent = 'Ссылка для сброса пароля отправлена на ' + email;
        message.className = 'recovery-message success';
        btn.textContent = '✅ Send';
        emailInput.value = '';

    } catch (error) {
        console.error('❌ Ошибка:', error);
        
        let errorMessage = 'Не удалось отправить ссылку';
        
        if (error.message) {
            const msg = error.message.toLowerCase();
            if (msg.includes('user') || msg.includes('not found')) {
                errorMessage = 'Пользователь с таким email не найден';
            } else if (msg.includes('rate limit')) {
                errorMessage = 'Слишком много запросов. Попробуйте позже.';
            } else if (msg.includes('network') || msg.includes('fetch')) {
                errorMessage = 'Ошибка сети. Проверьте подключение.';
            } else {
                errorMessage = error.message;
            }
        }
        
        showToast(errorMessage, 'error');
        message.textContent = errorMessage;
        message.className = 'recovery-message error';
        btn.disabled = false;
        btn.textContent = 'Send a link';
    }
});

emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
    }
});

console.log('✅ Страница восстановления готова');