let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let cart = {};

function updateMainButton() {
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > 0) {
        let formattedTotal = (total / 1000).toFixed(0); // Округляем до целого числа тысяч
        tg.MainButton.setText(`Заказать (${formattedTotal}k рупий)`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

let selectedFilling = 'chicken';
const fillingPrices = {
    'chicken': 25000,
    'beef': 40000,
    'shrimp': 40000,
    'falafel': 25000
};

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
    priceElement.textContent = `${fillingPrices[selectedFilling] / 1000}k рупий.`;
}

document.getElementById('btn-shawarma').addEventListener('click', function() {
    const filling = document.querySelector('.filling-btn.selected');
    const fillingEmoji = filling ? filling.dataset.emoji : '🐓';
    addToCart('shawarma', `Шаурма ${fillingEmoji}`, fillingPrices[selectedFilling]);
});

function addToCart(id, name, price) {
    if (cart[id]) {
        cart[id].quantity++;
    } else {
        cart[id] = { name, price: price * 1000, quantity: 1 }; // Умножаем на 1000, так как цены указаны в тысячах
    }
    updateCartDisplay();
    updateMainButton();
}

document.querySelectorAll('.btn').forEach(btn => {
    if (btn) {
        btn.addEventListener('click', function() {
            let id = this.id.replace('btn', '');
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

document.getElementById('clear-cart').addEventListener('click', function() {
    cart = {};
    updateCartDisplay();
    updateMainButton();
});

tg.MainButton.onClick(function() {
    let order = Object.values(cart).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price // Цена в рупиях
    }));
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        tg.sendData(JSON.stringify({ order, total }));
    } catch (error) {
        console.error('Error sending data to bot:', error);
    }
});

// Отображение имени пользователя
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








