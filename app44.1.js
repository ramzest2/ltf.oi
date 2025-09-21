const fillingPrices = {
    chicken: 25000,
    beef: 40000,
    shrimp: 40000,
    falafel: 25000,
};
let selectedFilling = 'chicken';
let cart = {};

const shawarmaPriceEl = document.getElementById('shawarma-price');
const cartDisplay = document.getElementById('cartDisplay');
const showCartBtn = document.getElementById('showCartBtn');
const sendOrderBtn = document.getElementById('sendOrderBtn');

function formatPrice(price) {
    return `${(price / 1000).toFixed(0)}k рупий`;
}

// Обновляем цену шаурмы
function updateShawarmaPrice() {
    shawarmaPriceEl.textContent = formatPrice(fillingPrices[selectedFilling]);
}

// Выбор начинки
document.querySelectorAll('.filling-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filling-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedFilling = btn.dataset.filling;
        updateShawarmaPrice();
    });
});

// Добавление в корзину
function addToCart(id, name, price, quantity = 1) {
    if (cart[id]) {
        cart[id].quantity += quantity;
    } else {
        cart[id] = { name, price, quantity };
    }
    saveCartToLocalStorage();
    updateCartDisplay();
}

// Удалить из корзины
function removeFromCart(id) {
    if (!cart[id]) return;
    if (cart[id].quantity > 1) {
        cart[id].quantity--;
    } else {
        delete cart[id];
    }
    saveCartToLocalStorage();
    updateCartDisplay();
}

// Отобразить корзину
function updateCartDisplay() {
    cartDisplay.innerHTML = '';
    const keys = Object.keys(cart);
    if (keys.length === 0) {
        cartDisplay.textContent = 'Корзина пуста.';
        return;
    }
    keys.forEach(id => {
        const item = cart[id];
        const itemTotal = item.price * item.quantity;
        const div = document.createElement('div');
        div.textContent = `${item.name} x${item.quantity} - ${formatPrice(itemTotal)}`;

        const btn = document.createElement('button');
        btn.textContent = 'Удалить';
        btn.onclick = () => removeFromCart(id);

        div.appendChild(btn);
        cartDisplay.appendChild(div);
    });
}

// Сохранение корзины в LocalStorage
function saveCartToLocalStorage() {
    localStorage.setItem('cafeCart', JSON.stringify(cart));
}

// Загрузка корзины из LocalStorage
function loadCartFromLocalStorage() {
    const saved = localStorage.getItem('cafeCart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartDisplay();
    }
}

// Обработчики кнопок
document.getElementById('btn-shawarma').onclick = () => {
    const name = `Шаурма (${document.querySelector('.filling-btn.selected').textContent})`;
    addToCart(`shawarma_${selectedFilling}`, name, fillingPrices[selectedFilling]);
};

document.getElementById('btn-pita').onclick = () => {
    addToCart('pita', 'Пита', 25000);
};
document.getElementById('btn-hummus').onclick = () => {
    addToCart('hummus', 'Хумус', 25000);
};
document.getElementById('btn-kebab').onclick = () => {
    addToCart('kebab', 'Шашлык из курицы', 35000);
};
document.getElementById('btn-gozleme').onclick = () => {
    addToCart('gozleme', 'Гёзлеме', 25000);
};
document.getElementById('btn-soup').onclick = () => {
    addToCart('soup', 'Чечевичный суп', 20000);
};

showCartBtn.onclick = () => {
    if (cartDisplay.style.display === 'none' || cartDisplay.style.display === '') {
        cartDisplay.style.display = 'block';
        updateCartDisplay();
    } else {
        cartDisplay.style.display = 'none';
    }
};

// Отправка заказа (пример, меняйте URL на свой Google Apps Script)
sendOrderBtn.onclick = () => {
    if (Object.keys(cart).length === 0) {
        alert('Корзина пуста!');
        return;
    }
    const order = [];
    let total = 0;
    for (const id in cart) {
        const item = cart[id];
        order.push({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
        });
        total += item.price * item.quantity;
    }

    const payload = {
        order,
        total,
        timestamp: new Date().toISOString(),
    };

    fetch('https://script.google.com/macros/s//exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Заказ успешно отправлен!');
                cart = {};
                saveCartToLocalStorage();
                updateCartDisplay();
            } else {
                alert('Ошибка при отправке заказа: ' + (data.message || ''));
            }
        })
        .catch(() => alert('Ошибка отправки заказа. Попробуйте позже.'));
};

// Загрузка корзины из LocalStorage при запуске
loadCartFromLocalStorage();

// Начальная установка цены шаурмы
updateShawarmaPrice();
