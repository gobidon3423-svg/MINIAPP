// Конфигурация CloudPayments для FitGlow Premium
const CLOUDPAYMENTS_CONFIG = {
    // ВАЖНО: Замените на ваш реальный publicId от CloudPayments
    publicId: "test_api_00000000000000000000002",
    
    // Настройки виджета
    widget: {
        language: "ru-RU",
        applePaySupport: true,
        googlePaySupport: true,
        yandexPaySupport: true,
        tinkoffPaySupport: true,
        tinkoffInstallmentSupport: true,
        sbpSupport: true,
        skin: "classic",
        requireEmail: false
    },

    // Валюта платежей
    currency: "RUB",

    // Описания для разных планов
    descriptions: {
        monthly: "🌸 Месячная подписка FitGlow Premium\n✨ Безлимитные тренировки\n👑 Эксклюзивные программы\n📊 Расширенная аналитика",
        yearly: "🌸 Годовая подписка FitGlow Premium\n✨ Безлимитные тренировки\n👑 Эксклюзивные программы\n📊 Расширенная аналитика\n💎 Скидка 20%"
    },

    // Настройки для продакшена
    production: {
        // При переходе в продакшн:
        // 1. Замените publicId на реальный
        // 2. Добавьте webhook URL для обработки платежей на сервере
        // 3. Включите email валидацию если нужно
        publicId: "pk_ваш_реальный_publicId",
        webhookUrl: "https://your-domain.com/webhook/cloudpayments",
        requireEmail: true
    },

    // Настройки безопасности
    security: {
        // Всегда проверяйте платежи на сервере
        // Не доверяйте данным от клиента
        validateOnServer: true,
        
        // Логирование для отладки
        enableLogging: true
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLOUDPAYMENTS_CONFIG;
}
