require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const SCRIPT_ID = process.env.SCRIPT_ID;
const fillingPrices = {
  chicken: 25000,
  beef: 40000,
  shrimp: 40000,
  falafel: 25000,
};

let selectedFilling = 'chicken';
let cart = {};
let accessToken = null;
let tokenClient;

const shawarmaPriceEl = document.getElementById('shawarma-price');
const cartDisplay = document.getElementById('cartDisplay');
const showCartBtn = document.getElementById('showCartBtn');
const sendOrderBtn = document.getElementById('sendOrderBtn');

function formatPrice(price) {
  return `${(price / 1000).toFixed(0)}k рупий`;
}

function updateShawarmaPrice() {
  shawarmaPriceEl.textContent = formatPrice(fillingPrices[selectedFilling]);
}

document.querySelectorAll('.filling-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log(`Выбрана начинка: ${btn.dataset.filling}`);
    document.querySelectorAll('.filling-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedFilling = btn.dataset.filling;
    updateShawarmaPrice();
  });
});

function addToCart(id, name, price, quantity = 1) {
  console.log(`Добавление в корзину: ${name} за ${price} рупий x${quantity}`);
  if (cart[id]) {
    cart[id].quantity += quantity;
  } else {
    cart[id] = { name, price, quantity };
  }
  saveCartToLocalStorage();
  updateCartDisplay();
}

function removeFromCart(id) {
  console.log(`Удаление из корзины: ${id}`);
  if (!cart[id]) return;
  if (cart[id].quantity > 1) {
    cart[id].quantity--;
  } else {
    delete cart[id];
  }
  saveCartToLocalStorage();
  updateCartDisplay();
}

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

function saveCartToLocalStorage() {
  console.log('Сохранение корзины в LocalStorage');
  localStorage.setItem('cafeCart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
  const saved = localStorage.getItem('cafeCart');
  if (saved) {
    console.log('Загрузка корзины из LocalStorage');
    cart = JSON.parse(saved);
    updateCartDisplay();
  }
}

window.onload = () => {
  // Инициализация OAuth 2.0 клиента Google
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/spreadsheets',
    callback: (resp) => {
      if (resp.error) {
        console.error('Ошибка авторизации:', resp.error);
        return;
      }
      accessToken = resp.access_token;
      console.log('Токен получен', accessToken);
      sendOrderBtn.disabled = false;
    },
  });
};

document.getElementById('btn-shawarma').onclick = () => {
  console.log('Кнопка "Добавить шаурму" нажата');
  const fillingBtn = document.querySelector('.filling-btn.selected');
  if (!fillingBtn) {
    alert('Пожалуйста, выберите начинку для шаурмы');
    console.log('Начинка не выбрана, добавление отменено');
    return;
  }
  const name = `Шаурма (${fillingBtn.textContent.trim()})`;
  addToCart(`shawarma_${selectedFilling}`, name, fillingPrices[selectedFilling]);
};

document.getElementById('btn-pita').onclick = () => {
  console.log('Кнопка "Добавить пита" нажата');
  addToCart('pita', 'Пита', 25000);
};

document.getElementById('btn-hummus').onclick = () => {
  console.log('Кнопка "Добавить хумус" нажата');
  addToCart('hummus', 'Хумус', 25000);
};

document.getElementById('btn-kebab').onclick = () => {
  console.log('Кнопка "Добавить шашлык" нажата');
  addToCart('kebab', 'Шашлык из курицы', 35000);
};

document.getElementById('btn-gozleme').onclick = () => {
  console.log('Кнопка "Добавить гёзлеме" нажата');
  addToCart('gozleme', 'Гёзлеме', 25000);
};

document.getElementById('btn-soup').onclick = () => {
  console.log('Кнопка "Добавить суп" нажата');
  addToCart('soup', 'Чечевичный суп', 20000);
};

showCartBtn.onclick = () => {
  console.log('Показать/Скрыть корзину');
  if (cartDisplay.style.display === 'none' || cartDisplay.style.display === '') {
    cartDisplay.style.display = 'block';
    updateCartDisplay();
  } else {
    cartDisplay.style.display = 'none';
  }
};

sendOrderBtn.onclick = () => {
  if (!accessToken) {
    alert('Пожалуйста, войдите через Google, чтобы отправить заказ');
    return;
  }

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
      total: item.price * item.quantity
    });
    total += item.price * item.quantity;
  }

  const payload = {
    order,
    total,
    timestamp: new Date().toISOString()
  };

  console.log('Отправка заказа:', payload);

  fetch(`https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      function: 'yourFunctionName',
      parameters: [payload],
      devMode: true
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('Ответ JSON:', data);
    if (data.error) {
      alert('Ошибка при отправке заказа: ' + data.error.message);
    } else {
      alert('Заказ успешно отправлен!');
      cart = {};
      saveCartToLocalStorage();
      updateCartDisplay();
    }
  })
  .catch(error => {
    console.error('Ошибка при запросе:', error);
    alert('Ошибка отправки заказа. Попробуйте позже.');
  });
};

// Инициализация
loadCartFromLocalStorage();
updateShawarmaPrice();
