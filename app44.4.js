const CLIENT_ID = '175874289746-tblhoqj20e7oa7qktjus6rqcqsi6h2df.apps.googleusercontent.com'; // замените своим client_id из Google Cloud Console
const SCRIPT_ID = '1FeIuRn9y0NuUhO0rTp4QE0sedfDv6LKse87ItFOPl8-LnjPnFA1yS-w2'; // замените ID вашего Google Apps Script 

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
  console.log('Инициализация tokenClient');
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/spreadsheets',
    callback: (resp) => {
      console.log('Ответ OAuth callback:', resp);
      if (resp.error) {
        console.error('Ошибка авторизации:', resp.error);
        alert('Ошибка авторизации: ' + resp.error);
        return;
      }
      accessToken = resp.access_token;
      console.log('Токен доступа получен:', accessToken);
      sendOrderBtn.disabled = false;
    },
  });

  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.onclick = () => {
      console.log('Нажата кнопка Войти через Google');
      tokenClient.requestAccessToken();
    };
  } else {
    console.warn('Кнопка googleSignInBtn не найдена');
  }

  if (sendOrderBtn) {
    sendOrderBtn.onclick = () => {
      console.log('Нажата кнопка Отправить заказ');
      if (!accessToken) {
        console.warn('Нет токена доступа, авторизация не пройдена');
        alert('Пожалуйста, авторизуйтесь через Google перед отправкой заказа');
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
          total: item.price * item.quantity,
        });
        total += item.price * item.quantity;
      }

      const payload = {
        order,
        total,
        timestamp: new Date().toISOString(),
      };

      console.log('Отправляем заказ:', payload);

      fetch(`https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: 'yourFunctionName',
          parameters: [payload],
          devMode: true,
        }),
      })
        .then(response => response.json())
        .then(data => {
          console.log('Ответ Google Apps Script API:', data);
          if (data.error) {
            alert('Ошибка при отправке заказа: ' + data.error.message);
          } else {
            alert('Заказ успешно отправлен!');
            cart = {};
            saveCartToLocalStorage();
            updateCartDisplay();
          }
        })
        .catch(err => {
          console.error('Ошибка при запросе:', err);
          alert('Ошибка отправки заказа. Попробуйте позже');
        });
    };
  } else {
    console.warn('Кнопка sendOrderBtn не найдена');
  }
};

document.getElementById('btn-shawarma').onclick = () => {
  console.log('Добавляем шаурму');
  const fillingBtn = document.querySelector('.filling-btn.selected');
  if (!fillingBtn) {
    alert('Пожалуйста, выберите начинку для шаурмы');
    return;
  }
  const name = `Шаурма (${fillingBtn.textContent.trim()})`;
  addToCart(`shawarma_${selectedFilling}`, name, fillingPrices[selectedFilling]);
};

document.getElementById('btn-pita').onclick = () => {
  console.log('Добавляем пита');
  addToCart('pita', 'Пита', 25000);
};

document.getElementById('btn-hummus').onclick = () => {
  console.log('Добавляем хумус');
  addToCart('hummus', 'Хумус', 25000);
};

document.getElementById('btn-kebab').onclick = () => {
  console.log('Добавляем шашлык');
  addToCart('kebab', 'Шашлык из курицы', 35000);
};

document.getElementById('btn-gozleme').onclick = () => {
  console.log('Добавляем гёзлеме');
  addToCart('gozleme', 'Гёзлеме', 25000);
};

document.getElementById('btn-soup').onclick = () => {
  console.log('Добавляем суп');
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

loadCartFromLocalStorage();
updateShawarmaPrice();
