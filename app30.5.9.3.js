// Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Глобальная ошибка:', message, 'Источник:', source, 'Строка:', lineno, 'Колонка:', colno, 'Объект ошибки:', error);
    tg.showAlert('Произошла ошибка. Пожалуйста, попробуйте еще раз или обратитесь в поддержку.');
};

// Улучшенный обработчик необработанных отклонений промисов
window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанное отклонение промиса:', event.reason);
    if (event.reason && event.reason.type === 'BOT_RESPONSE_TIMEOUT') {
        console.error('Превышено время ожидания ответа от бота');
        tg.showAlert('Превышено время ожидания ответа. Пожалуйста, попробуйте еще раз.');
    } else {
        tg.showAlert('Произошла неизвестная ошибка. Пожалуйста, попробуйте еще раз.');
    }
});

let audioContext;
let tg;
let socket;
let cart = {};
let retryCount = 0;
const maxRetries = 3;

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

// Добавление механизма heartbeat для WebSocket
function heartbeat() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
    }
}
setInterval(heartbeat, 30000);

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

        // Проверка поддержки Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.error('Web Audio API не поддерживается в этом браузере.');
            tg.showAlert('Ваш браузер не поддерживает необходимые аудио функции. Попробуйте использовать другой браузер.');
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
                updateShawarmaPrice();
            });
        });

        function updateShawarmaPrice() {
            const priceElement = document.getElementById('shawarma-price');
            priceElement.textContent = formatPrice(fillingPrices[selectedFilling]);
        }

        document.getElementById('btn-shawarma').addEventListener('click', function() {
            const filling = document.querySelector('.filling-btn.selected');
            if (filling) {
                const fillingName = filling.textContent.trim();
                const fillingId = filling.dataset.filling;
                const price = fillingPrices[fillingId];
                const id = `shawarma_${fillingId}`;
                const name = `Шаурма (${filling.dataset.emoji})`;
                console.log(`Добавление шаурмы: id=${id}, name=${name}, price=${price}`);
                addToCart(id, name, price, 1);
            } else {
                console.error('Начинка для шаурмы не выбрана');
                tg.showAlert('Пожалуйста, выберите начинку для шаурмы');
            }
        });

        function addToCart(id, name, price, quantity = 1) {
            console.log(`Добавление в корзину: id=${id}, name=${name}, price=${price}, quantity=${quantity}`);
            console.log(`Вызов addToCart с параметрами:`, {id, name, price, quantity});
            console.trace('Трассировка вызова addToCart');
            console.log(`Начало addToCart: id=${id}, name=${name}, price=${price}, quantity=${quantity}`);

            if (price < 1000) {
                console.error(`Попытка добавить товар с некорректной ценой: ${price}. Операция отменена.`);
                return;
            }
            
            if (id.startsWith('shawarma_')) {
                const filling = id.split('_')[1];
                id = 'shawarma';
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

        document.querySelectorAll('.btn:not(#btn-shawarma)').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function() {
                    let id = this.id.replace('btn-', '');
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

        const showCartBtn = document.getElementById('showCartBtn');
        const cartDisplay = document.getElementById('cartDisplay');

        if (showCartBtn && cartDisplay) {
            showCartBtn.addEventListener('click', function() {
                if (cartDisplay.style.display === 'none') {
                    updateCartDisplay();
                    cartDisplay.style.display = 'block';
                } else {
                    cartDisplay.style.display = 'none';
                }
            });
        }

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
                console.log(`Отображение товара: id=${id}, name=${item.name}, price=${item.price}, quantity=${item.quantity}`);
                let itemElement = document.createElement('div');
                const itemTotal = item.price * item.quantity;
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
            
            console.log('Обновленное отображение корзины:', cartElement.innerHTML);
        }

        function removeFromCart(id) {
            if (cart[id]) {
                if (cart[id].quantity > 1) {
                    cart[id].quantity--;
                } else {
                    delete cart[id];
                }
                updateCartDisplay();
                updateMainButton();
            }
        }

        function formatPrice(price) {
            return `${(price / 1000).toFixed(0)}k рупий`;
        }

        tg.MainButton.onClick(placeOrder);

        document.getElementById('voiceOrderBtn').addEventListener('click', function() {
            console.log('Нажата кнопка голосового ввода');
            let voiceInput = document.getElementById('voiceInput');
            voiceInput.value = 'Слушаю...';
            this.disabled = true;
            this.textContent = 'Слушаю...';

            if ('webkitSpeechRecognition' in window) {
                let recognition = new webkitSpeechRecognition();
                recognition.lang = 'ru-RU';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.start();

                recognition.onresult = function(event) {
                    let result = event.results[0][0].transcript;
                    console.log('Распознанный текст:', result);
                    voiceInput.value = result;

                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'user-message', content: result }));
                    } else {
                        console.error('WebSocket не открыт. Статус:', socket.readyState);
                        tg.showAlert('Ошибка отправки сообщения. Проверьте соединение и попробуйте еще раз.');
                    }
                };

                recognition.onerror = function(event) {
                    console.error('Ошибка распознавания речи:', event.error);
                    let errorMessage = 'Произошла ошибка при распознавании речи.';
                    switch(event.error) {
                        case 'network':
                            errorMessage += ' Проверьте подключение к интернету.';
                            break;
                        case 'not-allowed':
                        case 'service-not-allowed':
                            errorMessage += ' Убедитесь, что вы разрешили доступ к микрофону.';
                            break;
                        case 'aborted':
                            errorMessage += ' Распознавание было прервано.';
                            break;
                        case 'no-speech':
                            errorMessage += ' Речь не обнаружена. Попробуйте говорить громче.';
                            break;
                        case 'audio-capture':
                            errorMessage += ' Проблема с захватом аудио. Проверьте ваш микрофон.';
                            break;
                        default:
                            errorMessage += ' Попробуйте еще раз.';
                    }
                    voiceInput.value = 'Ошибка распознавания речи';
                    tg.showAlert(errorMessage);
                };

                recognition.onend = function() {
                    console.log('Распознавание завершено');
                    document.getElementById('voiceOrderBtn').disabled = false;
                    document.getElementById('voiceOrderBtn').textContent = 'Голосовой ввод';
                };

                recognition.onaudiostart = function() {
                    console.log('Начало записи аудио');
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const analyser = audioContext.createAnalyser();
                    analyser.fftSize = 256;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);

                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(stream => {
                            const source = audioContext.createMediaStreamSource(stream);
                            source.connect(analyser);

                            function updateLevel() {
                                analyser.getByteFrequencyData(dataArray);
                                let sum = dataArray.reduce((a, b) => a + b);
                                let average = sum / bufferLength;
                                let level = average / 255;
                                updateVoiceActivityDisplay(level);
                                requestAnimationFrame(updateLevel);
                            }
                            updateLevel();
                        })
                        .catch(err => console.error('Ошибка при получении доступа к микрофону:', err));
                };
            } else {
                console.error('Web Speech API не поддерживается в этом браузере.');
                voiceInput.value = 'Голосовой ввод не поддерживается';
                tg.showAlert('Голосовой ввод не поддерживается в вашем браузере. Попробуйте использовать другой браузер или устройство.');
                this.disabled = false;
                this.textContent = 'Голосовой ввод';
            }
        });

        function processAIResponse(response) {
            console.log('Processing AI response:', response);
            if (typeof response === 'string') {
                if (response.toLowerCase().includes('добавить в корзину')) {
                    const match = response.match(/добавить в корзину (\d+) (.+)/i);
                    if (match) {
                        const quantity = parseInt(match[1]);
                        const item = match[2];
                        addToCartFromVoice(item, quantity);
                    }
                } else if (response.toLowerCase().includes('оформить заказ')) {
                    placeOrder();
                }
            }
        }

        function addToCartFromVoice(item, quantity) {
            const menuItem = findMenuItem(item);
            if (menuItem) {
                addToCart(menuItem.id, menuItem.name, menuItem.price, quantity);
                tg.showAlert(`Добавлено в корзину: ${menuItem.name} x${quantity}`);
            } else {
                tg.showAlert(`Товар "${item}" не найден в меню`);
            }
        }

        function findMenuItem(itemName) {
            const menu = [
                {id: 'shawarma_chicken', name: 'Шаурма с курицей', price: 25000},
                {id: 'shawarma_beef', name: 'Шаурма с говядиной', price: 40000},
                {id: 'shawarma_shrimp', name: 'Шаурма с креветками', price: 40000},
                {id: 'falafel', name: 'Фалафель', price: 25000},
                {id: 'pita', name: 'Пита', price: 25000},
                {id: 'hummus', name: 'Хумус', price: 25000},
                {id: 'chicken_kebab', name: 'Шашлык из курицы', price: 35000},
                {id: 'gozleme', name: 'Гёзлеме', price: 25000},
                {id: 'lentil_soup', name: 'Чечевичный суп', price: 20000},
            ];
            return menu.find(item => item.name.toLowerCase().includes(itemName.toLowerCase()));
        }

        // Валидация данных перед отправкой заказа
        function validateOrder(order) {
            if (!Array.isArray(order) || order.length === 0) {
                throw new Error('Некорректный формат заказа');
            }
            for (let item of order) {
                if (!item[0] || typeof item[1] !== 'number') {
                    throw new Error('Некорректные данные товара в заказе');
                }
            }
        }
        
        function placeOrder() {
            console.log('Начало функции placeOrder');
            
            // Преобразуем корзину в формат, ожидаемый сервером
            let order = Object.values(cart).map(item => [item.name, item.price]);
            
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            
            console.log('Подготовленный заказ:', JSON.stringify(order, null, 2));
            console.log('Общая сумма заказа:', total);
            
            try {
                validateOrder(order);
                
                // Формируем данные в формате, ожидаемом сервером
                let dataToSend = {
                    order: order,
                    total: total
                };
                
                console.log('Данные для отправки в Telegram:', JSON.stringify(dataToSend));
                
                tg.sendData(JSON.stringify(dataToSend));
                console.log('Данные успешно отправлены в Telegram');
                
                console.log('Отображение уведомления пользователю');
                tg.showPopup({
                    title: 'Оформление заказа',
                    message: 'Заказ оформляется. Пожалуйста, подождите...',
                    buttons: [{ type: 'close' }]
                });
                
                // Ожидание ответа от бота с URL QRIS
                tg.onEvent('viewportChanged', function(){
                    if (tg.isExpanded) {
                        tg.onEvent('writeAccessRequested', function(isGranted) {
                            if (isGranted) {
                                tg.readTextFromClipboard(function(clipboardText) {
                                    try {
                                        const response = JSON.parse(clipboardText);
                                        if (response.qris_url) {
                                            displayQRIS(response.qris_url);
                                        } else {
                                            console.error('URL QRIS не получен');
                                            tg.showAlert('Не удалось получить QR-код для оплаты. Пожалуйста, попробуйте еще раз.');
                                        }
                                    } catch (e) {
                                        console.error('Ошибка при обработке ответа:', e);
                                        tg.showAlert('Произошла ошибка при обработке данных оплаты. Пожалуйста, попробуйте еще раз.');
                                    }
                                });
                            }
                        });
                        tg.requestWriteAccess();
                    }
                });
            } catch (error) {
                console.error('Ошибка при отправке данных в Telegram:', error);
                tg.showAlert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
                
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Попытка повторной отправки ${retryCount}/${maxRetries}`);
                    setTimeout(() => {
                        console.log(`Начало повторной попытки отправки ${retryCount}`);
                        tg.showAlert(`Повторная попытка отправки заказа (${retryCount}/${maxRetries})...`);
                        placeOrder();
                    }, 2000 * retryCount);
                } else {
                    console.log('Достигнуто максимальное количество попыток');
                    tg.showAlert('Не удалось отправить заказ после нескольких попыток. Пожалуйста, попробуйте позже.');
                    retryCount = 0;
                }
                return;
            }
            
            retryCount = 0;
            console.log('Завершение функции placeOrder');
        }

        function displayQRIS(qrisUrl) {
            let qrisImg = document.createElement('img');
            qrisImg.src = qrisUrl;
            qrisImg.alt = 'QRIS для оплаты';
            qrisImg.style.maxWidth = '100%';
            qrisImg.onerror = function() {
                console.error('Ошибка при загрузке QRIS');
                tg.showAlert('Не удалось загрузить QR-код для оплаты. Пожалуйста, попробуйте еще раз.');
            };
            
            let qrisContainer = document.createElement('div');
            qrisContainer.id = 'qrisContainer';
            qrisContainer.style.position = 'fixed';
            qrisContainer.style.top = '50%';
            qrisContainer.style.left = '50%';
            qrisContainer.style.transform = 'translate(-50%, -50%)';
            qrisContainer.style.backgroundColor = 'white';
            qrisContainer.style.padding = '20px';
            qrisContainer.style.borderRadius = '10px';
            qrisContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            
            qrisContainer.appendChild(qrisImg);
            
            let closeButton = document.createElement('button');
            closeButton.textContent = 'Закрыть';
            closeButton.style.marginTop = '10px';
            closeButton.onclick = function() {
                document.body.removeChild(qrisContainer);
            };
            qrisContainer.appendChild(closeButton);
            
            document.body.appendChild(qrisContainer);
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
