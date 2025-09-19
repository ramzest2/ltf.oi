<script>
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Глобальная ошибка:', message, 'Источник:', source, 'Строка:', lineno, 'Колонка:', colno, 'Объект ошибки:', error);
    if (typeof tg !== 'undefined' && tg?.showAlert) {
        tg.showAlert('Произошла ошибка. Пожалуйста, попробуйте еще раз или обратитесь в поддержку.');
    } else {
        alert('Произошла ошибка. Попробуйте обновить страницу.');
    }
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанное отклонение промиса:', event.reason);
    if (event.reason && event.reason.type === 'BOT_RESPONSE_TIMEOUT') {
        console.error('Превышено время ожидания ответа от бота');
        tg?.showAlert?.('Превышено время ожидания ответа. Пожалуйста, попробуйте еще раз.');
    } else {
        tg?.showAlert?.('Произошла неизвестная ошибка. Пожалуйста, попробуйте еще раз.');
    }
});

let audioContext;
let tg;
let socket;
let cart = {};
let retryCount = 0;
const maxRetries = 3;

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state !== 'running') {
        audioContext.resume()
            .then(() => console.log('AudioContext возобновлен, состояние:', audioContext.state))
            .catch(error => console.error('Ошибка при возобновлении AudioContext:', error));
    }
}

function connectWebSocket() {
    console.log('Попытка подключения WebSocket...');
    socket = new WebSocket('ws://localhost:8000');
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log('WebSocket соединение установлено');
        reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
        try {
            if (event.data instanceof ArrayBuffer) {
                playAudio(event.data);
            } else {
                const data = JSON.parse(event.data);
                console.log('Получено сообщение:', data);
                if (data.type === 'ai-response' && data.content) {
                    processAIResponse(data.content);
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке полученного сообщения:', error);
            tg?.showAlert?.('Произошла ошибка при обработке данных. Попробуйте еще раз.');
        }
    };

    socket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        tg?.showAlert?.('Ошибка соединения. Проверьте интернет.');
    };

    socket.onclose = (event) => {
        if (event.wasClean) {
            console.log(`WebSocket закрыт корректно, код=${event.code}, причина=${event.reason}`);
        } else {
            console.error('WebSocket соединение прервано');
            tg?.showAlert?.('Соединение с сервером прервано. Попытка переподключения...');
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(connectWebSocket, 5000);
            } else {
                tg?.showAlert?.('Не удалось подключиться к серверу. Попробуйте позже.');
            }
        }
    };

    return socket;
}

function heartbeat() {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
    }
}
setInterval(heartbeat, 30000);

function playAudio(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('Получены пустые аудиоданные');
        return;
    }
    console.log('Начало обработки аудио, длина:', arrayBuffer.byteLength);
    initAudioContext();

    audioContext.decodeAudioData(arrayBuffer)
        .then(audioBuffer => {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            source.onended = () => console.log('Воспроизведение аудио завершено');
            console.log('Аудио успешно запущено');
        })
        .catch(error => {
            console.error('Ошибка при декодировании аудио:', error);
            tg?.showAlert?.('Произошла ошибка при декодировании аудио.');
        });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    if (window.Telegram?.WebApp) {
        console.log('Telegram WebApp API initialized');
        tg = window.Telegram.WebApp;
        tg.expand();

        tg.MainButton.textColor = '#FFFFFF';
        tg.MainButton.color = '#2cab37';

        if (!window.AudioContext && !window.webkitAudioContext) {
            console.error('Web Audio API не поддерживается.');
            tg.showAlert('Ваш браузер не поддерживает аудио. Попробуйте другой.');
        }

        socket = connectWebSocket();

        const fillingPrices = {
            'chicken': 25000,
            'beef': 40000,
            'shrimp': 40000,
            'falafel': 25000
        };

        let selectedFilling = 'chicken';

        function updateMainButton() {
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            total > 0 ? tg.MainButton.setText(`Заказать (${formatPrice(total)})`) && tg.MainButton.show() : tg.MainButton.hide();
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
            document.getElementById('shawarma-price').textContent = formatPrice(fillingPrices[selectedFilling]);
        }

        document.getElementById('btn-shawarma').addEventListener('click', function() {
            const filling = document.querySelector('.filling-btn.selected');
            if (filling) {
                const price = fillingPrices[filling.dataset.filling];
                addToCart(`shawarma_${filling.dataset.filling}`, `Шаурма (${filling.dataset.emoji})`, price, 1);
            } else {
                tg.showAlert('Выберите начинку для шаурмы');
            }
        });

        function addToCart(id, name, price, quantity = 1) {
            if (isNaN(price) || price <= 0) {
                console.error(`Некорректная цена: ${price}`);
                return;
            }
            if (id.startsWith('shawarma_')) {
                id = 'shawarma';
            }
            if (cart[id]) {
                cart[id].quantity += quantity;
            } else {
                cart[id] = { name, price, quantity };
            }
            updateCartDisplay();
            updateMainButton();
        }

        function updateCartDisplay() {
            let cartElement = document.getElementById('cartDisplay') || document.createElement('div');
            cartElement.id = 'cartDisplay';
            cartElement.innerHTML = '';
            let total = 0;

            for (let id in cart) {
                let item = cart[id];
                const itemTotal = item.price * item.quantity;
                let itemElement = document.createElement('div');
                itemElement.textContent = `${item.name} x${item.quantity} - ${formatPrice(itemTotal)}`;
                let removeButton = document.createElement('button');
                removeButton.textContent = 'Удалить';
                removeButton.onclick = () => removeFromCart(id);
                itemElement.appendChild(removeButton);
                cartElement.appendChild(itemElement);
                total += itemTotal;
            }
            let totalElement = document.createElement('div');
            totalElement.textContent = `Итого: ${formatPrice(total)}`;
            cartElement.appendChild(totalElement);
            document.body.appendChild(cartElement);
        }

        function removeFromCart(id) {
            if (cart[id]) {
                cart[id].quantity > 1 ? cart[id].quantity-- : delete cart[id];
                updateCartDisplay();
                updateMainButton();
            }
        }

        function formatPrice(price) {
            return `${(price / 1000).toFixed(0)}k рупий`;
        }

        tg.MainButton.onClick(placeOrder);

        function validateOrder(order) {
            if (!Array.isArray(order) || order.length === 0) throw new Error('Некорректный заказ');
            for (let item of order) if (!item[0] || typeof item[1] !== 'number' || typeof item[2] !== 'number')
                throw new Error('Некорректные данные товара');
        }

        function placeOrder() {
            let order = Object.values(cart).map(item => [item.name, item.price, item.quantity]);
            let total = order.reduce((sum, i) => sum + i[1] * i[2], 0);
            try {
                validateOrder(order);
                tg.sendData(JSON.stringify({ order, total }));
                tg.showPopup({
                    title: 'Оформление заказа',
                    message: 'Заказ оформляется. Пожалуйста, подождите...',
                    buttons: [{ type: 'close' }]
                });
            } catch (error) {
                console.error('Ошибка при отправке заказа:', error);
                tg.showAlert('Ошибка при отправке заказа.');
            }
        }
    } else {
        console.error('Telegram WebApp API не найден');
    }
});

window.addEventListener('online', () => tg?.showAlert?.('Соединение восстановлено.'));
window.addEventListener('offline', () => tg?.showAlert?.('Соединение потеряно.'));
</script>
