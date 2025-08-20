// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

class PremiumApp {
    constructor() {
        this.isLoading = false;
        this.cloudPayments = null;
        this.currentPlan = null;
        this.currentAmount = 299; // Default monthly price
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

        // Извлечение плана из URL
        this.extractPlanFromURL();
        
        console.log('FitGlow Premium Payment App initialized');
    }

    extractPlanFromURL() {
        // Извлекаем план из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan');
        
        if (plan) {
            this.currentPlan = plan;
            if (plan === 'yearly') {
                this.currentAmount = 2399;
                this.updatePlanDisplay('Годовая подписка FitGlow Premium', '2 399 ₽');
            } else {
                this.currentAmount = 299;
                this.updatePlanDisplay('Месячная подписка FitGlow Premium', '299 ₽');
            }
        }
    }

    updatePlanDisplay(planName, planPrice) {
        const planNameEl = document.getElementById('planName');
        const planPriceEl = document.getElementById('planPrice');
        const payAmountEl = document.getElementById('payAmount');
        const subtotalEl = document.getElementById('subtotal');
        const totalEl = document.getElementById('total');

        if (planNameEl) planNameEl.textContent = planName;
        if (planPriceEl) planPriceEl.textContent = planPrice;
        if (payAmountEl) payAmountEl.textContent = planPrice;
        if (subtotalEl) subtotalEl.textContent = planPrice;
        if (totalEl) totalEl.textContent = planPrice;
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
            if (typeof CLOUDPAYMENTS_CONFIG !== 'undefined') {
                const config = {
                    ...CLOUDPAYMENTS_CONFIG.widget,
                    email: tg.initDataUnsafe?.user?.username || ""
                };

                this.cloudPayments = new cp.CloudPayments(config);
                
                if (CLOUDPAYMENTS_CONFIG.security?.enableLogging) {
                    console.log('CloudPayments инициализирован с конфигурацией:', config);
                }
            } else {
                console.warn('CLOUDPAYMENTS_CONFIG не найден, используем базовую инициализацию');
            }
        } catch (error) {
            console.error('Ошибка инициализации CloudPayments:', error);
            this.showNotification('error', 'Ошибка инициализации платёжной системы');
        }
    }

    bindEvents() {
        // Обработка отправки формы
        const form = document.getElementById('checkout-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Кнопка отмены
        const cancelBtn = document.getElementById('btnCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleCancel();
            });
        }

        // Обработка событий WebApp
        tg.onEvent('mainButtonClicked', () => {
            this.handleMainButtonClick();
        });

        tg.onEvent('invoiceClosed', (eventData) => {
            this.handleInvoiceResult(eventData);
        });

        // Форматирование полей карты
        this.setupCardFormatting();
    }

    setupCardFormatting() {
        const cardNumberInput = document.getElementById('cardNumber');
        const cardExpInput = document.getElementById('cardExp');
        const cardCvcInput = document.getElementById('cardCvc');
        const cardNameInput = document.querySelector('input[name="cardName"]');

        const previewNum = document.getElementById('previewNum');
        const previewName = document.getElementById('previewName');
        const previewExp = document.getElementById('previewExp');

        // Форматирование номера карты
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                e.target.value = this.formatCardNumber(e.target.value);
                if (previewNum) {
                    previewNum.textContent = e.target.value.padEnd(19, "0").replace(/(.{4})/g,"$1 ").trim();
                }
            });
        }

        // Форматирование срока действия
        if (cardExpInput) {
            cardExpInput.addEventListener('input', (e) => {
                e.target.value = this.formatExpiry(e.target.value);
                if (previewExp) {
                    previewExp.textContent = e.target.value || "MM/YY";
                }
            });
        }

        // Форматирование CVC
        if (cardCvcInput) {
            cardCvcInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g,"").slice(0, 4);
            });
        }

        // Имя на карте
        if (cardNameInput) {
            cardNameInput.addEventListener('input', (e) => {
                if (previewName) {
                    previewName.textContent = (e.target.value || "CARDHOLDER").toUpperCase();
                }
            });
        }
    }

    formatCardNumber(value) {
        return value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
    }

    formatExpiry(value) {
        value = value.replace(/\D/g,"").slice(0, 4);
        if (value.length >= 3) return value.slice(0,2) + "/" + value.slice(2);
        if (value.length >= 1 && parseInt(value[0],10) > 1) value = "0" + value; // smart 1-9 -> 01-09
        return value;
    }

    luhnCheck(cardNumber) {
        const num = cardNumber.replace(/\s+/g, "");
        if (num.length < 12) return false;
        let sum = 0, toggle = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let d = parseInt(num[i], 10);
            if (toggle) { d *= 2; if (d > 9) d -= 9; }
            sum += d; toggle = !toggle;
        }
        return sum % 10 === 0;
    }

    validateForm() {
        const form = document.getElementById('checkout-form');
        const formData = new FormData(form);
        
        const cardNumber = document.getElementById('cardNumber').value;
        const cardExp = document.getElementById('cardExp').value;
        const cardCvc = document.getElementById('cardCvc').value;
        const cardName = formData.get('cardName');
        const email = formData.get('email');
        const terms = formData.get('terms');

        // Валидация номера карты
        if (!this.luhnCheck(cardNumber)) {
            this.showNotification('error', 'Проверьте номер карты');
            return false;
        }

        // Валидация срока действия
        if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
            this.showNotification('error', 'Некорректная дата');
            return false;
        }

        // Валидация CVC
        if (!/^\d{3,4}$/.test(cardCvc)) {
            this.showNotification('error', 'Некорректный CVC');
            return false;
        }

        // Валидация имени
        if (!cardName || cardName.trim().length < 2) {
            this.showNotification('error', 'Введите имя на карте');
            return false;
        }

        // Валидация email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showNotification('error', 'Введите корректный email');
            return false;
        }

        // Проверка согласия с условиями
        if (!terms) {
            this.showNotification('error', 'Необходимо согласиться с условиями');
            return false;
        }

        return true;
    }

    async handleFormSubmit() {
        if (this.isLoading) return;

        if (!this.validateForm()) {
            return;
        }

        try {
            this.setLoading(true);
            
            // Получаем данные формы
            const form = document.getElementById('checkout-form');
            const formData = new FormData(form);
            
            // Подготовка данных для платежа
            const paymentData = {
                plan: this.currentPlan || 'monthly',
                amount: this.currentAmount,
                currency: 'RUB',
                user_id: tg.initDataUnsafe?.user?.id,
                username: tg.initDataUnsafe?.user?.username || 'user',
                first_name: tg.initDataUnsafe?.user?.first_name || 'Пользователь',
                email: formData.get('email'),
                cardName: formData.get('cardName'),
                country: formData.get('country'),
                city: formData.get('city'),
                address: formData.get('address'),
                zip: formData.get('zip')
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

    handleCancel() {
        // Очистка формы
        const form = document.getElementById('checkout-form');
        if (form) {
            form.reset();
        }

        // Сброс превью карты
        const previewNum = document.getElementById('previewNum');
        const previewName = document.getElementById('previewName');
        const previewExp = document.getElementById('previewExp');

        if (previewNum) previewNum.textContent = "0000 0000 0000 0000";
        if (previewName) previewName.textContent = "CARDHOLDER";
        if (previewExp) previewExp.textContent = "MM/YY";

        this.showNotification('info', 'Форма очищена');
    }

    setupMainButton() {
        // Изначально скрываем главную кнопку
        tg.MainButton.hide();
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

            // Базовая конфигурация, если CLOUDPAYMENTS_CONFIG недоступен
            const defaultConfig = {
                publicId: "test_api_00000000000000000000002",
                currency: "RUB",
                widget: {
                    skin: "classic",
                    requireEmail: false
                },
                descriptions: {
                    monthly: "Месячная подписка FitGlow Premium",
                    yearly: "Годовая подписка FitGlow Premium"
                }
            };

            const config = typeof CLOUDPAYMENTS_CONFIG !== 'undefined' ? CLOUDPAYMENTS_CONFIG : defaultConfig;

            // Конфигурация платежа
            const paymentConfig = {
                publicId: config.publicId,
                description: config.descriptions?.[paymentData.plan] || this.getSubscriptionDescription(paymentData.plan),
                amount: paymentData.amount,
                currency: config.currency,
                invoiceId: invoiceId,
                accountId: accountId,
                email: paymentData.email,
                skin: config.widget?.skin || "classic",
                requireEmail: config.widget?.requireEmail || false,
                data: {
                    plan: paymentData.plan,
                    user_id: paymentData.user_id,
                    username: paymentData.username,
                    first_name: paymentData.first_name,
                    source: 'telegram_miniapp',
                    billing_address: {
                        country: paymentData.country,
                        city: paymentData.city,
                        address: paymentData.address,
                        zip: paymentData.zip
                    }
                }
            };

            console.log('Запуск CloudPayments с конфигурацией:', paymentConfig);

            // Запуск виджета CloudPayments
            if (this.cloudPayments) {
                const result = await this.cloudPayments.pay("charge", paymentConfig);
                await this.handlePaymentSuccess(result, paymentData);
            } else {
                // Fallback для тестирования без CloudPayments
                console.log('CloudPayments не инициализирован, симуляция успешного платежа');
                setTimeout(() => {
                    this.handlePaymentSuccess({
                        transactionId: `test_${Date.now()}`,
                        amount: paymentData.amount,
                        currency: 'RUB'
                    }, paymentData);
                }, 2000);
            }

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
        const wrap = document.querySelector('.wrap');
        wrap.innerHTML = `
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
        const form = document.getElementById('checkout-form');
        const payButton = document.getElementById('btnPay');
        const cancelButton = document.getElementById('btnCancel');
        
        if (loading) {
            if (form) form.classList.add('loading');
            if (payButton) {
                payButton.disabled = true;
                payButton.textContent = 'Обработка…';
            }
            if (cancelButton) cancelButton.disabled = true;
        } else {
            if (form) form.classList.remove('loading');
            if (payButton) {
                payButton.disabled = false;
                payButton.innerHTML = `Оплатить <span id="payAmount" style="margin-left:6px">${this.currentAmount} ₽</span>`;
            }
            if (cancelButton) cancelButton.disabled = false;
        }
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
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--brand)'};
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            text-align: center;
        `;

        // Добавление анимаций если их еще нет
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
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
            `;
            document.head.appendChild(style);
        }

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

// Инициализация приложения
let premiumApp;

document.addEventListener('DOMContentLoaded', () => {
    premiumApp = new PremiumApp();
});

// Глобальные функции для использования в HTML
window.premiumApp = premiumApp;
