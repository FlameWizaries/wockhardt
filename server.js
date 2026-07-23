// ============================================================
// THE WOCKHARDT MANDEM - БЭКЕНД СЕРВЕР
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8090;

// ==================== КОНФИГУРАЦИЯ ====================
const config = {
    appwrite: {
        endpoint: process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
        projectId: process.env.APPWRITE_PROJECT_ID,
        serverKey: process.env.APPWRITE_SERVER_KEY,
        databaseId: process.env.APPWRITE_DATABASE_ID || '6a5a3d270039e7f78d8a',
        usersCollection: process.env.APPWRITE_USERS_COLLECTION || 'users',
        reportsCollection: process.env.APPWRITE_REPORTS_COLLECTION || 'reports',
        bucketId: process.env.APPWRITE_BUCKET_ID || '6a5a45f60028918daade'
    }
};

// Проверка наличия ключей
if (!config.appwrite.projectId) {
    console.error('❌ APPWRITE_PROJECT_ID не найден в .env!');
    process.exit(1);
}

if (!config.appwrite.serverKey) {
    console.error('❌ APPWRITE_SERVER_KEY не найден в .env!');
    process.exit(1);
}

console.log('✅ Конфигурация загружена');

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getAppwriteHeaders() {
    return {
        'X-Appwrite-Project': config.appwrite.projectId,
        'X-Appwrite-Key': config.appwrite.serverKey,
        'Content-Type': 'application/json'
    };
}

async function fetchAppwrite(endpoint, options = {}) {
    const url = `${config.appwrite.endpoint}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAppwriteHeaders(),
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// ==================== API РОУТЫ ====================

// === 1. Получение всех пользователей ===
app.get('/api/users', async (req, res) => {
    try {
        const data = await fetchAppwrite('/users');
        res.json(data);
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ error: error.message });
    }
});

// === 2. Поиск пользователя по email ===
app.get('/api/users/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const data = await fetchAppwrite('/users');
        const user = data.users?.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('❌ Ошибка поиска пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// === 3. Обновление пароля ===
app.patch('/api/users/:userId/password', async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;
        
        if (!password || password.length < 8) {
            return res.status(400).json({ 
                error: 'Пароль должен быть минимум 8 символов' 
            });
        }
        
        await fetchAppwrite(`/users/${userId}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ password })
        });
        
        res.json({ success: true, message: 'Пароль обновлен' });
    } catch (error) {
        console.error('❌ Ошибка обновления пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

// === 4. Здоровье сервера ===
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'THE WOCKHARDT MANDEM',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ==================== FALLBACK (для всех HTML страниц) ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/recovery.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'recovery.html'));
});

app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================
app.get('/css/*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

app.get('/js/*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

app.get('/img/*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

// ==================== FALLBACK (все остальное) ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== ЗАПУСК ====================
app.listen(port, () => {
    console.log('========================================');
    console.log('🔥 THE WOCKHARDT MANDEM');
    console.log('========================================');
    console.log(`✅ Сервер запущен на порту ${port}`);
    console.log(`🌐 http://localhost:${port}`);
    console.log(`📡 API: http://localhost:${port}/api`);
    console.log(`🔑 Project: ${config.appwrite.projectId}`);
    console.log('========================================');
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанный rejection:', error);
});
