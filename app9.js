// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

// Инициализация Socket.IO
const socket = io('http://localhost:3000'); // Замените на актуальный адрес вашего сервера

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('ai-response', (data) => {
    if (data.error) {
        tg.showAlert(data.error);
    } else {
        tg.showAlert(data.message);
        processAIResponse(data.message);
    }
});

let cart = {};

const fillingPrices = {
    'chicken': 25000,
    'beef': 40000,
    'shrimp': 40000,
    'falafel': 25000
};

let selectedFilling = 'chicken';

function updateMainButton() {
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > 0) {
        tg.MainButton.setText(`Заказать (${formatPrice(total)})`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

document.querySelectorAll('.filling-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filling-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedFilling = this.dataset.filling;
        updateShawarmaPrice();
    });
});

function updateShawarmaPrice() {
    const priceElement = document.getElementById('shawarma-price');
    priceElement.textContent = formatPrice(fillingPrices[selectedFilling]);
}

document.getElementById('btn-shawarma').addEventListener('click', function() {
    const filling = document.querySelector('.filling-btn.selected');
    const fillingEmoji = filling ? filling.dataset.emoji : '🐓';
    addToCart('shawarma', `Шаурма ${fillingEmoji}`, fillingPrices[selectedFilling]);
});

function addToCart(id, name, price, quantity = 1) {
    if (cart[id]) {
        cart[id].quantity += quantity;
    } else {
        cart[id] = { name, price: price * 1000, quantity };
    }
    updateCartDisplay();
    updateMainButton();
}

document.querySelectorAll('.btn').forEach(btn => {
    if (btn) {
        btn.addEventListener('click', function() {
            let id = this.id.replace('btn-', '');
            let nameElement = this.parentElement.querySelector('h3');
            let priceElement = this.parentElement.querySelector('.price');
            
            if (nameElement && priceElement) {
                let name = nameElement.textContent;
                let price = parseInt(priceElement.textContent.replace(/[^0-9]/g, ''));
                addToCart(id, name, price);
            } else {
                console.warn(`Missing name or price element for button ${id}`);
            }
        });
    } else {
        console.warn(`Button not found: ${btn}`);
    }
});

function updateCartDisplay() {
    let cartElement = document.getElementById('cart');
    if (!cartElement) {
        cartElement = document.createElement('div');
        cartElement.id = 'cart';
        document.body.appendChild(cartElement);
    }
    cartElement.innerHTML = '';
    
    for (let id in cart) {
        let item = cart[id];
        let itemElement = document.createElement('div');
        itemElement.textContent = `${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`;
        
        let removeButton = document.createElement('button');
        removeButton.textContent = 'Удалить';
        removeButton.onclick = () => removeFromCart(id);
        
        itemElement.appendChild(removeButton);
        cartElement.appendChild(itemElement);
    }
}

function removeFromCart(id) {
    if (cart[id]) {
        cart[id].quantity--;
        if (cart[id].quantity <= 0) {
            delete cart[id];
        }
    }
    updateCartDisplay();
    updateMainButton();
}

tg.MainButton.onClick(function() {
    placeOrder();
});

let usercard = document.getElementById("usercard");
let p = document.createElement("p");
p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
usercard.appendChild(p);

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.filling-btn[data-filling="chicken"]').classList.add('selected');
    updateShawarmaPrice();
    updateCartDisplay();
    updateMainButton();
    console.log('Page loaded, MainButton initialized');
});

function formatPrice(price) {
    return `${(price / 1000).toFixed(0)}k рупий`;
}

document.getElementById('voiceOrderBtn').addEventListener('click', function() {
    console.log('Voice input button clicked');
    let voiceInput = document.getElementById('voiceInput');
    voiceInput.value = 'Слушаю...';
    this.disabled = true;
    this.textContent = 'Слушаю...';

    if ('webkitSpeechRecognition' in window) {
        let recognition = new webkitSpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onresult = function(event) {
            let result = event.results[0][0].transcript;
            console.log('Распознанный текст:', result);
            voiceInput.value = result;

            // Отправка сообщения через Socket.IO
            socket.emit('send-message', result);
        };

        recognition.onerror = function(event) {
            console.error('Ошибка распознавания:', event.error);
            voiceInput.value = 'Ошибка распознавания речи';
            tg.showAlert('Произошла ошибка при распознавании речи. Попробуйте еще раз.');
        };

        recognition.onend = function() {
            console.log('Распознавание завершено');
            document.getElementById('voiceOrderBtn').disabled = false;
            document.getElementById('voiceOrderBtn').textContent = 'Голосовой ввод';
        };
    } else {
        console.error('Web Speech API не поддерживается в этом браузере.');
        voiceInput.value = 'Голосовой ввод не поддерживается';
        tg.showAlert('Голосовой ввод не поддерживается в вашем браузере.');
        this.disabled = false;
        this.textContent = 'Голосовой ввод';
    }
});

function processAIResponse(response) {
    console.log('Processing AI response:', response);
    if (response.toLowerCase().includes('добавить в корзину')) {
        const match = response.match(/добавить в корзину (\d+) (.+)/i);
        if (match) {
            const quantity = parseInt(match[1]);
            const item = match[2];
            addToCartFromVoice(item, quantity);
        }
    } else if (response.toLowerCase().includes('оформить заказ')) {
        placeOrder();
    }
    // Другие варианты обработки
}

function addToCartFromVoice(item, quantity) {
    const menuItem = findMenuItem(item);
    if (menuItem) {
        addToCart(menuItem.id, menuItem.name, menuItem.price, quantity);
        tg.showAlert(`Добавлено в корзину: ${menuItem.name} x${quantity}`);
    } else {
        tg.showAlert(`Товар "${item}" не найден в меню`);
    }
}

function findMenuItem(itemName) {
    const menu = [
        {id: 'shawarma_chicken', name: 'Шаурма с курицей', price: 25},
        {id: 'shawarma_beef', name: 'Шаурма с говядиной', price: 40},
        {id: 'shawarma_shrimp', name: 'Шаурма с креветками', price: 40},
        {id: 'falafel', name: 'Фалафель', price: 25},
        {id: 'pita', name: 'Пита', price: 25},
        {id: 'hummus', name: 'Хумус', price: 25},
        {id: 'chicken_kebab', name: 'Шашлык из курицы', price: 35},
        {id: 'gozleme', name: 'Гёзлеме', price: 25},
        {id: 'lentil_soup', name: 'Чечевичный суп', price: 20},
    ];
    return menu.find(item => item.name.toLowerCase().includes(itemName.toLowerCase()));
}

function placeOrder() {
    let order = Object.values(cart).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }));
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        tg.sendData(JSON.stringify({ order, total }));
        tg.showAlert('Заказ оформлен!');
        cart = {};
        updateCartDisplay();
        updateMainButton();
    } catch (error) {
        console.error('Error sending data to bot:', error);
        tg.showAlert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
    }
}
