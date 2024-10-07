const CONFIG = {
    SSE_ENDPOINT: 'http://localhost:8000/stream',
    MESSAGE_ENDPOINT: 'http://localhost:8000/send-message',
    AUDIO_ENDPOINT: 'http://localhost:8000/send-message',
    // Настройки приложения
    APP_SETTINGS: {
        DEFAULT_LANGUAGE: 'ru',
        RECONNECT_TIMEOUT: 5000 // Время в мс перед попыткой переподключения SSE
    },
    // Константы для пунктов меню
    MENU_ITEMS: {
        SHAWARMA: 'shawarma',
        PITA: 'pita',
        HUMMUS: 'hummus',
        CHICKEN_SHISH: 'chicken_shish',
        GOZLEME: 'gozleme',
        LENTIL_SOUP: 'lentil_soup'
    }
    // ... другие настройки ...
};
