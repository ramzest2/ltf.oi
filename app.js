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
        cart[id] = { name, price, quantity: 1 };
    }
    updateCartDisplay();
    updateMainButton();
}

document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function() {
        let id = this.id.replace('btn', '');
        let name = this.parentElement.querySelector('h3').textContent;
        let price = parseInt(this.parentElement.querySelector('.price').textContent.replace(/[^0-9]/g, ''));
        addToCart(id, name, price);
    });
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
        itemElement.textContent = `${item.name} x${item.quantity} - ${item.price * item.quantity / 1000}k рупий.`;
        
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
        price: item.price || 0
    }));
    let total = Object.values(cart).reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    
    let orderData = {
        order: order,
        total: total
    };
    
    // Отправляем данные в бот
    tg.sendData(JSON.stringify(orderData));
    
    // Очищаем корзину после отправки
    cart = {};
    updateCartDisplay();
    updateMainButton();
    
    // Показываем сообщение об успешной отправке заказа
    alert('Ваш заказ отправлен!');
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
});








