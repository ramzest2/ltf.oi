// Глобальные переменные
let tg = window.Telegram.WebApp;
let cart = {};
let totalPrice = 0;

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Настройка Telegram WebApp
    tg.expand();
    tg.MainButton.textColor = '#FFFFFF';
    tg.MainButton.color = '#2cab37';
    
    // Обработчики кнопок товаров
    setupProductButtons();
    
    // Обработчик главной кнопки
    tg.MainButton.onClick(function(){
        console.log('MainButton clicked');
        const orderItems = [];
        totalPrice = 0;

        // Формируем массив товаров
        for (const [id, item] of Object.entries(cart)) {
            orderItems.push({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            });
            totalPrice += item.price * item.quantity;
        }

        const order = {
            order: orderItems,
            total: totalPrice
        };
        
        console.log('Sending order:', order);
        tg.sendData(JSON.stringify(order));
    });

    // Обработчик изменения viewport
    tg.onEvent('viewportChanged', function(){
        if (tg.isExpanded) {
            console.log('WebApp expanded');
            handlePaymentResponse();
        }
    });
});

// Функции для работы с корзиной
function addToCart(id, name, price, quantity = 1) {
    console.log(`Adding to cart: ${name} x${quantity} at ${price}`);
    
    if (cart[id]) {
        cart[id].quantity += quantity;
    } else {
        cart[id] = {
            name: name,
            price: price,
            quantity: quantity
        };
    }
    
    updateCartDisplay();
    updateMainButton();
}

function removeFromCart(id) {
    console.log(`Removing from cart: ${id}`);
    
    if (cart[id]) {
        if (cart[id].quantity > 1) {
            cart[id].quantity--;
        } else {
            delete cart[id];
        }
        
        updateCartDisplay();
        updateMainButton();
    }
}

function updateCartDisplay() {
    const cartElement = document.getElementById('cartItems');
    if (!cartElement) return;
    
    cartElement.innerHTML = '';
    totalPrice = 0;
    
    for (const [id, item] of Object.entries(cart)) {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>${formatPrice(itemTotal)}</span>
            <button onclick="removeFromCart('${id}')">✕</button>
        `;
        
        cartElement.appendChild(itemElement);
    }
    
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = `Итого: ${formatPrice(totalPrice)}`;
    }
}

function updateMainButton() {
    if (totalPrice > 0) {
        tg.MainButton.setText(`Заказать (${formatPrice(totalPrice)})`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// Обработка ответа с QR-кодом
function handlePaymentResponse() {
    tg.requestWriteAccess()
        .then(function(isGranted) {
            if (isGranted) {
                console.log('Write access granted');
                
                tg.readTextFromClipboard(function(clipboardText) {
                    try {
                        console.log('Received clipboard text:', clipboardText);
                        const response = JSON.parse(clipboardText);
                        
                        if (response.qr_code_url) {
                            displayQRCode(response.qr_code_url);
                        }
                        
                        if (response.deeplink_url) {
                            displayPaymentButton(response.deeplink_url);
                        }
                        
                    } catch (e) {
                        console.error('Error processing response:', e);
                        tg.showAlert('Ошибка при обработке ответа от сервера');
                    }
                });
            } else {
                console.log('Write access denied');
                tg.showAlert('Не удалось получить доступ к буферу обмена');
            }
        })
        .catch(function(error) {
            console.error('Error requesting write access:', error);
            tg.showAlert('Ошибка при запросе доступа к буферу обмена');
        });
}

// Отображение QR-кода
function displayQRCode(url) {
    console.log('Displaying QR code:', url);
    
    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';
    
    const qrImage = document.createElement('img');
    qrImage.src = url;
    qrImage.alt = 'QR Code for payment';
    qrImage.onload = () => console.log('QR code loaded successfully');
    qrImage.onerror = () => {
        console.error('Failed to load QR code');
        tg.showAlert('Не удалось загрузить QR-код');
    };
    
    qrContainer.appendChild(qrImage);
    document.body.appendChild(qrContainer);
}

// Отображение кнопки оплаты
function displayPaymentButton(url) {
    console.log('Adding payment button with URL:', url);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'payment-button-container';
    
    const payButton = document.createElement('button');
    payButton.className = 'payment-button';
    payButton.textContent = 'Открыть GOPAY';
    payButton.onclick = () => window.open(url, '_blank');
    
    buttonContainer.appendChild(payButton);
    document.body.appendChild(buttonContainer);
}

// Вспомогательные функции
function formatPrice(price) {
    return `${(price / 1000).toFixed(0)}k IDR`;
}

function setupProductButtons() {
    document.querySelectorAll('.product-button').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            const name = this.dataset.name;
            const price = parseInt(this.dataset.price);
            
            if (id && name && price) {
                addToCart(id, name, price);
            }
        });
    });
}

// Обработка ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', {message, source, lineno, colno, error});
    tg.showAlert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    tg.showAlert('Произошла ошибка при обработке данных.');
});

// Стили
const styles = `
.cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.qr-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
}

.payment-button-container {
    text-align: center;
    margin-top: 20px;
}

.payment-button {
    background: #2cab37;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.payment-button:hover {
    background: #239a2f;
}
`;

// Добавляем стили на страницу
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
