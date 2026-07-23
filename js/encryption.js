// ============================================================
// ШИФРОВАНИЕ ДАННЫХ (CDN версия)
// ============================================================

// Ключ шифрования
const ENCRYPTION_KEY = 'wockhardt_secure_encryption_key_2026_32chars';

// Шифрование
export function encryptData(data) {
    try {
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        return CryptoJS.AES.encrypt(String(data), ENCRYPTION_KEY).toString();
    } catch (error) {
        console.error('❌ Ошибка шифрования:', error);
        return null;
    }
}

// Дешифрование
export function decryptData(encryptedData) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        console.error('❌ Ошибка дешифрования:', error);
        return null;
    }
}

// Хеширование
export function hashData(data) {
    return CryptoJS.SHA256(data + ENCRYPTION_KEY).toString();
}

// Генерация кода подтверждения
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default {
    encryptData,
    decryptData,
    hashData,
    generateVerificationCode
};