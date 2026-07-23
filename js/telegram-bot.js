// ==================== TELEGRAM БОТ ====================

// Хранилище кодов
const verificationCodes = {};

// Функция для отправки сообщения
async function sendTelegramMessage(chatId, text, parseMode = 'Markdown') {
    try {
        if (!bot) return false;
        await bot.sendMessage(chatId, text, { parse_mode: parseMode });
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error);
        return false;
    }
}

let bot = null;

// Функция для проверки кода
function checkVerificationCode(chatId, code) {
    const data = verificationCodes[String(chatId)];
    if (!data) {
        return { success: false, error: 'Код не найден' };
    }
    if (data.code !== code) {
        return { success: false, error: 'Неверный код' };
    }
    if (Date.now() > data.expiresAt) {
        delete verificationCodes[String(chatId)];
        return { success: false, error: 'Код истек' };
    }
    delete verificationCodes[String(chatId)];
    return { success: true, chatId: chatId, username: data.username };
}

// Инициализация бота
function initTelegramBot() {
    try {
        const token = process.env.TELEGRAM_TOKEN;
        
        if (!token) {
            console.warn('⚠️ TELEGRAM_TOKEN не найден в .env');
            console.log('📌 Добавьте TELEGRAM_TOKEN=ваш_токен в файл .env');
            return;
        }
        
        console.log('🔑 Токен найден, подключаем бота...');
        
        // Пробуем создать бота
        try {
            // Способ 1: стандартный импорт
            const TelegramBot = require('node-telegram-bot-api');
            bot = new TelegramBot(token, { polling: true });
        } catch (e1) {
            console.log('⚠️ Способ 1 не сработал, пробуем способ 2...');
            try {
                // Способ 2: импорт через default
                const TelegramBotModule = require('node-telegram-bot-api');
                const TelegramBot = TelegramBotModule.default || TelegramBotModule;
                bot = new TelegramBot(token, { polling: true });
            } catch (e2) {
                console.error('❌ Оба способа не сработали');
                throw e2;
            }
        }
        
        console.log('🤖 Бот создан, ожидаем сообщения...');
        
        // Обработчик ошибок polling
        bot.on('polling_error', (error) => {
            console.error('❌ Ошибка polling:', error);
        });

        // ====== КОМАНДА /start ======
        bot.onText(/\/start/, async (msg) => {
            try {
                const chatId = msg.chat.id;
                const username = msg.from?.username || msg.from?.first_name || 'пользователь';
                
                console.log(`📨 Получено /start от @${username} (${chatId})`);
                
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                
                verificationCodes[String(chatId)] = {
                    code: code,
                    username: username,
                    expiresAt: Date.now() + 300000
                };
                
                await bot.sendMessage(
                    chatId,
                    `🤖 *Добро пожаловать в THE WOCKHARDT MANDEM Bot!*\n\n` +
                    `Ваш код подтверждения: *${code}*\n\n` +
                    `📌 *Как подключить:*\n` +
                    `1. Откройте приложение THE WOCKHARDT MANDEM\n` +
                    `2. Перейдите в раздел Настройки → Telegram\n` +
                    `3. Введите этот код\n\n` +
                    `⏳ Код действует *5 минут*\n` +
                    `🔒 Все данные передаются в зашифрованном виде`,
                    { parse_mode: 'Markdown' }
                );
                
                console.log(`✅ Код ${code} отправлен для @${username}`);
            } catch (error) {
                console.error('❌ Ошибка в /start:', error);
            }
        });

        // ====== КОМАНДА /help ======
        bot.onText(/\/help/, async (msg) => {
            try {
                const chatId = msg.chat.id;
                await bot.sendMessage(
                    chatId,
                    `🤖 *Доступные команды:*\n\n` +
                    `/start - Получить код подтверждения\n` +
                    `/help - Помощь\n` +
                    `/status - Статус подключения\n` +
                    `/off - Отключить уведомления`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('❌ Ошибка в /help:', error);
            }
        });

        // ====== КОМАНДА /status ======
        bot.onText(/\/status/, async (msg) => {
            try {
                const chatId = msg.chat.id;
                await bot.sendMessage(
                    chatId,
                    `🔍 *Проверка статуса...*\n\n` +
                    `Если вы подключены, вы будете получать уведомления.\n\n` +
                    `Чтобы отключить, отправьте /off`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('❌ Ошибка в /status:', error);
            }
        });

        // ====== КОМАНДА /off ======
        bot.onText(/\/off/, async (msg) => {
            try {
                const chatId = msg.chat.id;
                if (verificationCodes[String(chatId)]) {
                    delete verificationCodes[String(chatId)];
                }
                await bot.sendMessage(
                    chatId,
                    `🔕 *Уведомления отключены.*\n\n` +
                    `Чтобы снова включить, отправьте /start`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('❌ Ошибка в /off:', error);
            }
        });

        // ====== ЛОГ ВСЕХ СООБЩЕНИЙ ======
        bot.on('message', (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                console.log(`📨 Сообщение от ${msg.from?.username || msg.from?.first_name}: ${msg.text}`);
            }
        });

        console.log('✅ Telegram бот успешно запущен');
        
    } catch (error) {
        console.error('❌ ОШИБКА ЗАПУСКА БОТА:', error);
        console.log('📌 Проверьте токен в файле .env');
        console.log('📌 Убедитесь, что установлена библиотека: npm install node-telegram-bot-api');
    }
}

// Запускаем бота
initTelegramBot();

// Экспортируем функции для использования в других частях
module.exports = {
    checkVerificationCode,
    sendTelegramMessage,
    verificationCodes,
    bot
};