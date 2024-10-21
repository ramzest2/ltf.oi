// Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Глобальная ошибка:', message, 'Источник:', source, 'Строка:', lineno, 'Колонка:', colno, 'Объект ошибки:', error);
};

// Обработчик необработанных отклонений промисов
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.type === 'BOT_RESPONSE_TIMEOUT') {
...(about 453 lines omitted)...
}

// ИЗМЕНЕНО: Добавлены дополнительные логи
function addToCart(id, name, price, quantity = 1) {
    console.log(`Попытка добавления в корзину: id=${id}, name=${name}, price=${price}, quantity=${quantity}`);
    
    if (id.startsWith('shawarma_')) {
        const filling = id.split('_')[1];
        id = `shawarma_${filling}`;
        name = `Шаурма (${name.split('(')[1].split(')')[0]})`;
    }
    
    if (cart[id]) {
        console.log(`Товар ${id} уже в корзине, увеличиваем количество на ${quantity}`);
        cart[id].quantity += quantity;
    } else {
        console.log(`Добавляем новый товар ${id} в корзину`);
        cart[id] = { name, price, quantity };
    }
    
    console.log('Текущее состояние корзины:', JSON.stringify(cart, null, 2));
    
    updateCartDisplay();
    updateMainButton();
}

// ИЗМЕНЕНО: Добавлены дополнительные логи
function updateCartDisplay() {
    console.log('Начало обновления отображения корзины');
    let cartElement = document.getElementById('cartDisplay');
    if (!cartElement) {
        cartElement = document.createElement('div');
        cartElement.id = 'cartDisplay';
        document.body.appendChild(cartElement);
    }
    cartElement.innerHTML = '';
    
    let total = 0;
    for (let id in cart) {
        let item = cart[id];
        console.log(`Отображение товара в корзине: id=${id}, name=${item.name}, price=${item.price}, quantity=${item.quantity}`);
        let itemElement = document.createElement('div');
        itemElement.textContent = `${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`;
        
        let removeButton = document.createElement('button');
        removeButton.textContent = 'Удалить';
        removeButton.onclick = () => removeFromCart(id);
        
        itemElement.appendChild(removeButton);
        cartElement.appendChild(itemElement);
        total += item.price * item.quantity;
    }

    let totalElement = document.createElement('div');
    totalElement.textContent = `Итого: ${formatPrice(total)}`;
    cartElement.appendChild(totalElement);
    
    console.log('Обновленное отображение корзины:', cartElement.innerHTML);
}

// ИЗМЕНЕНО: Обновлен обработчик кнопки для шаурмы
document.getElementById('btn-shawarma').addEventListener('click', function() {
    const filling = document.querySelector('.filling-btn.selected');
    if (filling) {
        const fillingId = filling.dataset.filling;
        const price = fillingPrices[fillingId];
        const id = `shawarma_${fillingId}`;
        const name = `Шаурма (${filling.dataset.emoji})`;
        console.log(`Нажатие кнопки шаурмы: id=${id}, name=${name}, price=${price}`);
        addToCart(id, name, price, 1);
    } else {
        console.error('Начинка для шаурмы не выбрана');
        tg.showAlert('Пожалуйста, выберите начинку для шаурмы');
    }
});

function logCartState() {
    console.log('Текущее состояние корзины:');
    for (let id in cart) {
        console.log(`${id}: ${JSON.stringify(cart[id])}`);
    }
}
