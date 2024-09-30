let tg = window.Telegram.WebApp;
tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let cart = {};

function updateMainButton() {
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > 0) {
        tg.MainButton.setText(`Заказать (${total / 1000}k руб.)`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

function addToCart(id, name, price) {
    if (cart[id]) {
        cart[id].quantity++;
    } else {
        cart[id] = { name, price, quantity: 1 };
    }
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

tg.MainButton.onClick(function() {
    let order = Object.values(cart).map(item => `${item.name} x${item.quantity}`).join(', ');
    tg.sendData(JSON.stringify({ order: order, total: Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0) }));
});

// Отображение имени пользователя
let usercard = document.getElementById("usercard");
let p = document.createElement("p");
p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
usercard.appendChild(p);
