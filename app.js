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
    priceElement.textContent = `${fillingPrices[selectedFilling] / 1000}k руб.`;
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

tg.MainButton.onClick(async function() {
    let order = Object.values(cart).map(item => `${item.name} x${item.quantity}`);
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    let orderData = {
        order: order,
        total: total
    };
    
    // Отправляем данные в бот и ждем ответа с QR-кодом
    tg.sendData(JSON.stringify(orderData));
    
    // Ожидаем ответ от бота
    tg.onEvent('message', function(message) {
        try {
            const responseData = JSON.parse(message.data);
            if (responseData.error) {
                alert(responseData.error);
                return;
            }
            
            // Отображаем QR-код и информацию о заказе
            const qrContainer = document.getElementById('qr-container');
            qrContainer.innerHTML = `
                <h3>QR-код для оплаты</h3>
                <img src="data:image/png;base64,${responseData.qr_code}" alt="QR Code">
                <p>ID заказа: ${responseData.order_id}</p>
                <p>Сумма к оплате: ${responseData.total / 1000}k IDR</p>
                <p>Действителен до: ${responseData.expiry_time}</p>
                <p>Отсканируйте QR-код для оплаты</p>
            `;
            qrContainer.style.display = 'block';
            
            // Скрываем основной контент
            document.querySelector('.inner').style.display = 'none';
            
            // Меняем текст кнопки
            tg.MainButton.setText('Завершить заказ');
            tg.MainButton.onClick = function() {
                tg.close();
            };
        } catch (error) {
            console.error('Error processing bot response:', error);
            alert('Произошла ошибка при получении QR-кода. Пожалуйста, попробуйте еще раз.');
        }
    });
});

// Отображение имени пользователя
let usercard = document.getElementById("usercard");
let p = document.createElement("p");
p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
usercard.appendChild(p);

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.filling-btn[data-filling="chicken"]').classList.add('selected');
    updateShawarmaPrice();
});








