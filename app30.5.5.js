// Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Глобальная ошибка:', message, 'Источник:', source, 'Строка:', lineno, 'Колонка:', colno, 'Объект ошибки:', error);
};

// Обработчик необработанных отклонений промисов
window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанная ошибка Promise:', event.reason);
    if (tg) {
        tg.showAlert('Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.');
    }
});

let audioContext;
let tg = window.Telegram.WebApp;
let socket;
let cart = {};

if (tg) {
    tg.expand();
    
    tg.MainButton.textColor = '#FFFFFF';
    tg.MainButton.color = '#2cab37';
    
    tg.onEvent('mainButtonClicked', function(){
        placeOrder();
    });
} else {
    console.error('Telegram WebApp API не найден');
    alert('Ошибка инициализации приложения. Пожалуйста, попробуйте позже.');
}

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state !== 'running') {
        audioContext.resume().then(() => {
            console.log('AudioContext возобновлен, состояние:', audioContext.state);
        }).catch(error => {
            console.error('Ошибка при возобновлении AudioContext:', error);
        });
    } else {
        console.log('AudioContext уже в состоянии running');
    }
}

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:3000');
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log('WebSocket соединение установлено');
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
            tg.showAlert('Произошла ошибка при обработке данных. Попробуйте еще раз.');
        }
    };

    socket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        tg.showAlert('Произошла ошибка соединения. Проверьте подключение к интернету и попробуйте обновить страницу.');
    };

    socket.onclose = (event) => {
        if (event.wasClean) {
            console.log(`WebSocket соединение закрыто корректно, код=${event.code} причина=${event.reason}`);
        } else {
            console.error('WebSocket соединение прервано');
            tg.showAlert('Соединение с сервером прервано. Попытка переподключения...');
            setTimeout(connectWebSocket, 5000);
        }
    };

    return socket;
}

function playAudio(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('Получены пустые аудиоданные');
        return;
    }

    console.log('Начало обработки аудио, длина данных:', arrayBuffer.byteLength);

    try {
        initAudioContext();

        audioContext.decodeAudioData(arrayBuffer, 
            (audioBuffer) => {
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                
                source.onended = () => {
                    console.log('Воспроизведение аудио завершено');
                };
                
                console.log('Аудио успешно запущено');
            },
            (error) => {
                console.error('Ошибка при декодировании аудио:', error);
                tg.showAlert('Произошла ошибка при декодировании аудио: ' + error.message);
            }
        );
    } catch (error) {
        console.error('Ошибка при обработке аудио:', error);
        tg.showAlert('Произошла ошибка при обработке аудио: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram WebApp API initialized');
        tg = window.Telegram.WebApp;

        tg.expand();

        tg.MainButton.textColor = '#FFFFFF';
        tg.MainButton.color = '#2cab37';

        if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
            console.error('Web Audio API не поддерживается в этом браузере.');
            tg.showAlert('Ваш браузер не поддерживает воспроизведение аудио. Попробуйте использовать другой браузер.');
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
                updatePrice();
            });
        });

        function updatePrice() {
            const priceElement = document.getElementById('price');
            if (priceElement) {
                priceElement.textContent = formatPrice(fillingPrices[selectedFilling]);
            }
        }

        function formatPrice(price) {
            return (price / 1000).toFixed(0) + 'k';
        }

        function addToCart(id, name, price, quantity = 1) {
            console.log('Добавление в корзину:', id, name, price, quantity);
            console.log('Вызов addToCart с параметрами:', { id, name, price, quantity });
            console.trace('Трассировка вызова addToCart');
            console.log('Начало addToCart:', id, name, price, quantity);
            
            if (cart[id]) {
                cart[id].quantity += quantity;
            } else {
                console.log(`Добавляем новый товар ${id} в корзину`);
                cart[id] = { name, price, quantity };
            }
            
            console.log('Текущее состояние корзины:', JSON.stringify(cart, null, 2));
            
            updateCartDisplay();
            updateMainButton();
        }

        function removeFromCart(id) {
            if (cart[id]) {
                delete cart[id];
                updateCartDisplay();
                updateMainButton();
            }
        }

        function updateCartDisplay() {
            console.log('Начало обновления отображения корзины');
            const cartElement = document.getElementById('cart');
            if (!cartElement) {
                console.error('Элемент корзины не найден');
                return;
            }
            
            let cartHTML = '';
            let total = 0;
            
            for (let id in cart) {
                console.log('Отображение товара:', id, cart[id].name, cart[id].price, cart[id].quantity);
                const item = cart[id];
                cartHTML += `<div>${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}<button onclick="removeFromCart('${id}')">Удалить</button></div>`;
                total += item.price * item.quantity;
            }
            
            cartHTML += `<div>Итого: ${formatPrice(total)}</div>`;
            
            cartElement.innerHTML = cartHTML;
            console.log('Обновленное отображение корзины:', cartHTML);
        }

        document.getElementById('add-to-cart').addEventListener('click', function() {
            const name = `Шаурма (${selectedFilling === 'chicken' ? '🐓' : selectedFilling === 'beef' ? '🐄' : selectedFilling === 'shrimp' ? '🦐' : '🥙'})`;
            const price = fillingPrices[selectedFilling];
            const id = `shawarma_${selectedFilling}`;
            
            console.log('Добавление шаурмы:', { id, name, price });
            
            addToCart(id, name, price);
        });

        function placeOrder() {
            let order = Object.values(cart).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            
            console.log('Отправка заказа:', JSON.stringify({ order, total }, null, 2));
            
            let timeoutId = setTimeout(() => {
                tg.showAlert('Обработка заказа занимает больше времени, чем обычно. Пожалуйста, подождите.');
            }, 10000); // 10 секунд

            try {
                tg.sendData(JSON.stringify({ order, total }));
                console.log('Данные успешно отправлены боту');
                tg.showAlert('Заказ оформляется. Пожалуйста, подождите...');
                
                // Очистка корзины и обновление отображения
                cart = {};
                updateCartDisplay();
                updateMainButton();
                
                clearTimeout(timeoutId);
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('Ошибка при отправке данных боту:', error);
                tg.showAlert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
            }
        }

        function displayQRCode(qrCodeData) {
            console.log('Отображение QR-кода:', qrCodeData);
            if (!qrCodeData || !qrCodeData.url) {
                console.error('Некорректные данные QR-кода');
                tg.showAlert('Не удалось получить QR-код для оплаты. Пожалуйста, попробуйте еще раз.');
                return;
            }

            let qrCodeImg = document.createElement('img');
            qrCodeImg.src = qrCodeData.url;
            qrCodeImg.alt = 'QR-код для оплаты';
            qrCodeImg.style.maxWidth = '100%';
            
            let qrCodeContainer = document.createElement('div');
            qrCodeContainer.id = 'qrCodeContainer';
            qrCodeContainer.style.position = 'fixed';
            qrCodeContainer.style.top = '50%';
            qrCodeContainer.style.left = '50%';
            qrCodeContainer.style.transform = 'translate(-50%, -50%)';
            qrCodeContainer.style.backgroundColor = 'white';
            qrCodeContainer.style.padding = '20px';
            qrCodeContainer.style.borderRadius = '10px';
            qrCodeContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            
            qrCodeContainer.appendChild(qrCodeImg);
            
            let closeButton = document.createElement('button');
            closeButton.textContent = 'Закрыть';
            closeButton.style.marginTop = '10px';
            closeButton.onclick = function() {
                document.body.removeChild(qrCodeContainer);
            };
            qrCodeContainer.appendChild(closeButton);
            
            document.body.appendChild(qrCodeContainer);
        }

        function playTestSound() {
            console.log('Начало функции playTestSound');
            initAudioContext();
            console.log('AudioContext состояние:', audioContext.state);
            
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            console.log('Тестовый звук запущен');
        }

        const testSoundBtn = document.getElementById('testSoundBtn');
        if (testSoundBtn) {
            console.log('Test sound button found');
            testSoundBtn.addEventListener('click', function() {
                console.log('Test sound button clicked');
                playTestSound();
            });
        } else {
            console.error('Test sound button not found');
        }

        document.addEventListener('click', function initAudioContextOnUserGesture() {
            initAudioContext();
            document.removeEventListener('click', initAudioContextOnUserGesture);
        }, { once: true });

    } else {
        console.error('Telegram WebApp API not found');
    }
});

function updateVoiceActivityDisplay(level) {
    const indicator = document.getElementById('voiceActivityIndicator');
    if (indicator) {
        indicator.style.width = `${level * 100}%`;
    }
}

function logCartState() {
    console.log('Текущее состояние корзины:');
    for (let id in cart) {
        console.log(`${id}: ${JSON.stringify(cart[id])}`);
    }
}

// Обработка ошибок сети
window.addEventListener('online', function() {
    console.log('Соединение восстановлено');
    tg.showAlert('Соединение восстановлено. Вы можете продолжить оформление заказа.');
});

window.addEventListener('offline', function() {
    console.log('Соединение потеряно');
    tg.showAlert('Соединение потеряно. Пожалуйста, проверьте подключение к интернету.');
});

// Обновляем обработчик события qr_code_received
tg.onEvent('qr_code_received', function(qrCodeData) {
    console.log('Получен QR-код:', qrCodeData);
    if (typeof qrCodeData === 'string') {
        try {
            qrCodeData = JSON.parse(qrCodeData);
        } catch (error) {
            console.error('Ошибка при парсинге данных QR-кода:', error);
        }
    }
    if (qrCodeData && qrCodeData.url) {
        displayQRCode(qrCodeData);
    } else {
        console.error('Некорректные данные QR-кода');
        tg.showAlert('Не удалось получить корректный QR-код для оплаты. Пожалуйста, попробуйте еще раз.');
    }
});
