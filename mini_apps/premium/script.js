// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

class PremiumApp {
    constructor() {
        this.isLoading = false;
        this.cloudPayments = null;
        this.init();
    }

    init() {
        // Настройка WebApp
        tg.ready();
        tg.expand();
        
        // Настройка темы
        this.setupTheme();
        
        // Инициализация CloudPayments
        this.initCloudPayments();
        
        // Привязка событий
        this.bindEvents();
        
        // Настройка главной кнопки
        this.setupMainButton();
        
        console.log('FitGlow Premium App initialized');
    }

    setupTheme() {
        // Применение темы Telegram
        const themeParams = tg.themeParams;
        
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-bg-color', themeParams.bg_color);
        }
        
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-text-color', themeParams.text_color);
        }

        // Адаптация под тёмную тему
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    initCloudPayments() {
        // Инициализация CloudPayments с конфигурацией
        try {
            const config = {
                ...CLOUDPAYMENTS_CONFIG.widget,
                email: tg.initDataUnsafe?.user?.username || ""
            };

            this.cloudPayments = new cp.CloudPayments(config);
            
            if (CLOUDPAYMENTS_CONFIG.security.enableLogging) {
                console.log('CloudPayments инициализирован с конфигурацией:', config);
            }
        } catch (error) {
            console.error('Ошибка инициализации CloudPayments:', error);
            this.showNotification('error', 'Ошибка инициализации платёжной системы');
        }
    }

    bindEvents() {
        // Обработка кликов по кнопкам подписки
        const subscribeButtons = document.querySelectorAll('.subscribe-btn');
        
        subscribeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const plan = e.target.dataset.plan;
                const amount = parseInt(e.target.dataset.amount);
                this.handleSubscription(plan, amount);
            });
        });

        // Обработка событий WebApp
        tg.onEvent('mainButtonClicked', () => {
            this.handleMainButtonClick();
        });

        tg.onEvent('invoiceClosed', (eventData) => {
            this.handleInvoiceResult(eventData);
        });
    }

    setupMainButton() {
        // Изначально скрываем главную кнопку
        tg.MainButton.hide();
    }

    async handleSubscription(plan, amount) {
        if (this.isLoading || !this.cloudPayments) return;

        try {
            this.setLoading(true);
            
            // Анимация кнопки
            const button = document.querySelector(`[data-plan="${plan}"]`);
            button.classList.add('loading');

            // Подготовка данных для платежа
            const paymentData = {
                plan: plan,
                amount: amount,
                currency: 'RUB',
                user_id: tg.initDataUnsafe?.user?.id,
                username: tg.initDataUnsafe?.user?.username || 'user',
                first_name: tg.initDataUnsafe?.user?.first_name || 'Пользователь'
            };

            // Отправка данных боту (информируем о начале платежа)
            await this.sendPaymentData(paymentData);

            // Показ уведомления
            this.showNotification('info', 'Открытие платёжной формы...');

            // Запуск CloudPayments
            await this.processCloudPayment(paymentData);

        } catch (error) {
            console.error('Ошибка при обработке подписки:', error);
            this.showNotification('error', 'Произошла ошибка. Попробуйте снова.');
        } finally {
            this.setLoading(false);
        }
    }

    async sendPaymentData(data) {
        // Отправка данных боту через WebApp
        tg.sendData(JSON.stringify({
            action: 'premium_subscription',
            data: data
        }));
    }

    async processCloudPayment(paymentData) {
        try {
            // Генерация уникального ID платежа
            const invoiceId = `fitglow_${paymentData.user_id}_${Date.now()}`;
            const accountId = paymentData.user_id?.toString() || 'guest';

            // Конфигурация платежа из config.js
            const paymentConfig = {
                publicId: CLOUDPAYMENTS_CONFIG.publicId,
                description: CLOUDPAYMENTS_CONFIG.descriptions[paymentData.plan] || this.getSubscriptionDescription(paymentData.plan),
                amount: paymentData.amount,
                currency: CLOUDPAYMENTS_CONFIG.currency,
                invoiceId: invoiceId,
                accountId: accountId,
                email: paymentData.username ? `${paymentData.username}@telegram.user` : "",
                skin: CLOUDPAYMENTS_CONFIG.widget.skin,
                requireEmail: CLOUDPAYMENTS_CONFIG.widget.requireEmail,
                data: {
                    plan: paymentData.plan,
                    user_id: paymentData.user_id,
                    username: paymentData.username,
                    first_name: paymentData.first_name,
                    source: 'telegram_miniapp'
                }
            };

            console.log('Запуск CloudPayments с конфигурацией:', paymentConfig);

            // Запуск виджета CloudPayments
            const result = await this.cloudPayments.pay("charge", paymentConfig);
            
            // Обработка успешного результата
            await this.handlePaymentSuccess(result, paymentData);

        } catch (error) {
            console.error('Ошибка CloudPayments:', error);
            await this.handlePaymentError(error, paymentData);
        }
    }

    getSubscriptionDescription(plan) {
        if (plan === 'monthly') {
            return '🌸 Месячная подписка FitGlow Premium\n✨ Безлимитные тренировки\n👑 Эксклюзивные программы\n📊 Расширенная аналитика';
        } else {
            return '🌸 Годовая подписка FitGlow Premium\n✨ Безлимитные тренировки\n👑 Эксклюзивные программы\n📊 Расширенная аналитика\n💎 Скидка 20%';
        }
    }

    async handlePaymentSuccess(result, paymentData) {
        console.log('Платёж успешен:', result);
        
        // Показ уведомления об успехе
        this.showNotification('success', 'Платёж прошёл успешно! 🎉');
        
        // Отправка подтверждения боту с данными CloudPayments
        tg.sendData(JSON.stringify({
            action: 'premium_activated',
            data: {
                ...paymentData,
                status: 'success',
                transaction_id: result.transactionId || result.Transaction?.Id || Date.now(),
                payment_system: 'CloudPayments',
                cloud_payments_data: {
                    transactionId: result.transactionId,
                    amount: result.amount,
                    currency: result.currency,
                    accountId: result.accountId,
                    invoiceId: result.invoiceId
                }
            }
        }));

        // Показ экрана успеха
        setTimeout(() => {
            this.showSuccessScreen(paymentData);
        }, 1500);
    }

    async handlePaymentError(error, paymentData) {
        console.error('Ошибка платежа:', error);
        
        let errorMessage = 'Произошла ошибка при оплате';
        
        // Обработка различных типов ошибок CloudPayments
        if (error.message) {
            if (error.message.includes('cancelled') || error.message.includes('отменен')) {
                errorMessage = 'Платёж отменён пользователем';
                this.showNotification('info', errorMessage);
            } else if (error.message.includes('insufficient')) {
                errorMessage = 'Недостаточно средств на карте';
                this.showNotification('error', errorMessage);
            } else {
                this.showNotification('error', errorMessage);
            }
        } else {
            this.showNotification('error', errorMessage);
        }

        // Отправка информации об ошибке боту (опционально)
        tg.sendData(JSON.stringify({
            action: 'premium_payment_error',
            data: {
                ...paymentData,
                status: 'failed',
                error: error.message || 'Unknown error',
                timestamp: Date.now()
            }
        }));
    }

    showSuccessScreen(paymentData) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="success-screen">
                <div class="success-animation">
                    <div class="checkmark">✓</div>
                </div>
                <h1>Поздравляем! 🎉</h1>
                <p>Вы успешно оформили ${paymentData.plan === 'monthly' ? 'месячную' : 'годовую'} подписку FitGlow Premium!</p>
                <div class="success-features">
                    <div class="success-feature">
                        <span class="feature-emoji">🔓</span>
                        <span>Безлимитные тренировки активированы</span>
                    </div>
                    <div class="success-feature">
                        <span class="feature-emoji">👑</span>
                        <span>Доступ к эксклюзивным программам</span>
                    </div>
                    <div class="success-feature">
                        <span class="feature-emoji">📊</span>
                        <span>Расширенная аналитика включена</span>
                    </div>
                </div>
                <button class="back-to-bot-btn" onclick="premiumApp.returnToBot()">
                    Вернуться в бот 🚀
                </button>
            </div>
        `;

        // Добавление стилей для экрана успеха
        this.addSuccessStyles();
    }

    addSuccessStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .success-screen {
                text-align: center;
                padding: 40px 20px;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }

            .success-animation {
                margin-bottom: 30px;
            }

            .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(45deg, #10b981, #059669);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                font-weight: bold;
                margin: 0 auto;
                animation: bounceIn 0.6s ease-out;
                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            }

            @keyframes bounceIn {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { transform: scale(1); opacity: 1; }
            }

            .success-screen h1 {
                font-size: 28px;
                color: #333;
                margin-bottom: 16px;
                font-weight: 700;
            }

            .success-screen p {
                font-size: 16px;
                color: #666;
                margin-bottom: 30px;
                line-height: 1.5;
            }

            .success-features {
                margin-bottom: 40px;
            }

            .success-feature {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 12px;
                margin-bottom: 8px;
                background: #f8f9ff;
                border-radius: 12px;
                border: 1px solid #e1e8f0;
            }

            .feature-emoji {
                font-size: 20px;
            }

            .back-to-bot-btn {
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
            }

            .back-to-bot-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    returnToBot() {
        // Возврат в бот
        tg.close();
    }

    handleInvoiceResult(eventData) {
        if (eventData.status === 'paid') {
            this.showNotification('success', 'Платёж успешно обработан!');
        } else if (eventData.status === 'cancelled') {
            this.showNotification('info', 'Платёж отменён');
        } else if (eventData.status === 'failed') {
            this.showNotification('error', 'Ошибка при обработке платежа');
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const buttons = document.querySelectorAll('.subscribe-btn');
        
        buttons.forEach(button => {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        });
    }

    showNotification(type, message) {
        // Создание уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Стили уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        `;

        document.body.appendChild(notification);

        // Автоматическое удаление
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    handleMainButtonClick() {
        // Обработка клика по главной кнопке Telegram
        console.log('Main button clicked');
    }
}

// Добавление анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }

    .dark-theme {
        background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
    }

    .dark-theme .container {
        background: rgba(31, 41, 55, 0.98);
        color: #f9fafb;
    }

    .dark-theme .feature-card,
    .dark-theme .pricing-card {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
    }

    .dark-theme .feature-card h3,
    .dark-theme .pricing-card h3 {
        color: #f9fafb;
    }
`;
document.head.appendChild(style);

// Инициализация приложения
let premiumApp;

document.addEventListener('DOMContentLoaded', () => {
    premiumApp = new PremiumApp();
});

// Глобальные функции для использования в HTML
window.premiumApp = premiumApp;
