// ============================================================
// КОНФИГУРАЦИЯ APPWRITE
// ============================================================

export const APPWRITE_CONFIG = {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6a5a3b100026bb66f6f3',
    databaseId: '6a5a3d270039e7f78d8a',
    usersCollectionId: 'users',
    reportsCollectionId: 'reports',
    bucketId: '6a5a45f60028918daade'
};

// Создаем клиент
export const client = new Appwrite.Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

// Экспортируем сервисы
export const account = new Appwrite.Account(client);
export const database = new Appwrite.Databases(client);
export const storage = new Appwrite.Storage(client);

console.log('✅ Appwrite клиент создан');
console.log('📡 Подключение к:', APPWRITE_CONFIG.endpoint);
