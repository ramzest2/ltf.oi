// Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Глобальная ошибка:', message, 'Источник:', source, 'Строка:', lineno, 'Колонка:', colno, 'Объект ошибки:', error);
};

// Обработчик необработанных отклонений промисов
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.type === 'BOT_RESPONSE_TIMEOUT') {
        console.error('Превышено время ожидания ответа от бота');
        tg.showAlert('Превышено время ожидания ответа. Пожалуйста, попробуйте еще раз.');
    }
});

let audioContext;
let audioBuffer = [];
let tg;
let socket;
let mediaRecorder;
let audioChunks = [];

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state !== 'running') {
        audioContext.resume().then(() => {
            console.log('AudioContext возобновлен');
        }).catch(error => {
            console.error('Ошибка при возобновлении AudioContext:', error);
        });
    }
}

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:3000'); // Замените на актуальный адрес вашего сервера

    socket.onopen = () => {
        console.log('WebSocket соединение установлено');
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Получено сообщение:', message);
            
            switch (message.type) {
                case "response.audio.delta":
                    const base64AudioChunk = message.delta;
                    const audioBuffer = base64ToArrayBuffer(base64AudioChunk);
                    playAudioChunk(audioBuffer);
                    break;
                case "response.audio.done":
                    console.log('Воспроизведение аудио завершено');
                    break;
                case "response.text.delta":
                    console.log('Получен текст:', message.delta);
                    updateTextResponse(message.delta);
                    break;
                case "response.done":
                    console.log('Ответ полностью получен');
                    break;
                default:
                    processAIResponse(message);
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
            setTimeout(connectWebSocket, 5000); // Попытка переподключения через 5 секунд
        }
    };

    return socket;
}

function startRecording() {
    return new Promise((resolve, reject) => {
        console.log('Запрос доступа к микрофону');
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('Доступ к микрофону получен');
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    console.log('Запись остановлена');
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result.split(',')[1];
                        console.log('Аудио преобразовано в base64');
                        resolve(base64Audio);
                    };
                };

                console.log('Начало записи');
                mediaRecorder.start();
                setTimeout(() => {
                    console.log('Остановка записи через 5 секунд');
                    mediaRecorder.stop();
                }, 5000);
            })
            .catch(error => {
                console.error('Ошибка доступа к микрофону:', error);
                reject(error);
            });
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function sendAudioMessage(base64AudioData) {
    return new Promise((resolve, reject) => {
        if (socket.readyState === WebSocket.OPEN) {
            console.log('Отправка аудиосообщения на сервер');
            const createConversationEvent = {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_audio",
                            audio: base64AudioData,
                        },
                    ],
                },
            };
            socket.send(JSON.stringify(createConversationEvent));

            const createResponseEvent = {
                type: "response.create",
                response: {
                    modalities: ["text", "audio"],
                    instructions: "Please assist the user.",
                },
            };
            socket.send(JSON.stringify(createResponseEvent));
            resolve();
        } else {
            console.error('WebSocket соединение не установлено');
            reject(new Error('Ошибка соединения с сервером'));
        }
    });
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function playAudioChunk(audioBuffer) {
    initAudioContext();
    audioContext.decodeAudioData(audioBuffer, (decodedData) => {
        const source = audioContext.createBufferSource();
        source.buffer = decodedData;
        source.connect(audioContext.destination);
        source.start(0);
    }, (error) => {
        console.error('Error decoding audio data:', error);
    });
}

function updateTextResponse(textDelta) {
    const responseElement = document.getElementById('aiResponse');
    if (responseElement) {
        responseElement.textContent += textDelta;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    // Инициализация Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram WebApp API initialized');
        tg = window.Telegram.WebApp;

        tg.expand();

        tg.MainButton.textColor = '#FFFFFF';
        tg.MainButton.color = '#2cab37';

        // Проверка поддержки Web Audio API
        if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
            console.error('Web Audio API не поддерживается в этом браузере.');
            tg.showAlert('Ваш браузер не поддерживает воспроизведение аудио. Попробуйте использовать другой браузер.');
        }

        // Проверка поддержки MediaRecorder
        if (!window.MediaRecorder) {
            console.error('MediaRecorder не поддерживается в этом браузере.');
            tg.showAlert('Ваш браузер не поддерживает запись аудио. Попробуйте использовать другой браузер.');
        }

        initAudioContext();
        socket = connectWebSocket();

        let cart = {};

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
            const fillingEmoji = filling ? filling.dataset.emoji : '🐓';
            addToCart('shawarma', `Шаурма ${fillingEmoji}`, fillingPrices[selectedFilling]);
        });

        function addToCart(id, name, price, quantity = 1) {
            if (cart[id]) {
                cart[id].quantity += quantity;
            } else {
                cart[id] = { name, price: price * 1000, quantity };
            }
            updateCartDisplay();
            updateMainButton();
        }

        document.querySelectorAll('.btn').forEach(btn => {
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
                itemElement.textContent = `${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`;
                
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

        tg.MainButton.onClick(function() {
            placeOrder();
        });

        let usercard = document.getElementById("usercard");
        let p = document.createElement("p");
        p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
        usercard.appendChild(p);

        document.querySelector('.filling-btn[data-filling="chicken"]').classList.add('selected');
        updateShawarmaPrice();
        updateCartDisplay();
        updateMainButton();
        console.log('Page loaded, MainButton initialized');

        function formatPrice(price) {
            return `${(price / 1000).toFixed(0)}k рупий`;
        }

        document.getElementById('voiceOrderBtn').addEventListener('click', async function() {
            console.log('Нажата кнопка голосового ввода');
            let voiceInput = document.getElementById('voiceInput');
            voiceInput.value = 'Слушаю...';
            this.disabled = true;
            this.textContent = '🔴 Запись...';

            try {
                console.log('Начало записи аудио');
                const base64AudioData = await startRecording();
                console.log('Аудио успешно записано, длина данных:', base64AudioData.length);
                voiceInput.value = 'Обработка...';
                await sendAudioMessage(base64AudioData);
                voiceInput.value = 'Аудио отправлено';
            } catch (error) {
                console.error('Ошибка при записи или отправке аудио:', error);
                tg.showAlert('Произошла ошибка: ' + error.message);
                voiceInput.value = 'Ошибка: ' + error.message;
            } finally {
                this.disabled = false;
                this.textContent = '🎤';
            }
        });

        function processAIResponse(response) {
            console.log('Processing AI response:', response);
            if (typeof response === 'object' && response.type === 'audio') {
                playAudio(response.content);
            } else if (typeof response === 'string') {
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
                {id: 'shawarma_chicken', name: 'Шаурма с курицей', price: 25},
                {id: 'shawarma_beef', name: 'Шаурма с говядиной', price: 40},
                {id: 'shawarma_shrimp', name: 'Шаурма с креветками', price: 40},
                {id: 'falafel', name: 'Фалафель', price: 25},
                {id: 'pita', name: 'Пита', price: 25},
                {id: 'hummus', name: 'Хумус', price: 25},
                {id: 'chicken_kebab', name: 'Шашлык из курицы', price: 35},
                {id: 'gozleme', name: 'Гёзлеме', price: 25},
                {id: 'lentil_soup', name: 'Чечевичный суп', price: 20},
            ];
            return menu.find(item => item.name.toLowerCase().includes(itemName.toLowerCase()));
        }

        function placeOrder() {
            let order = Object.values(cart).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            
            try {
                tg.sendData(JSON.stringify({ order, total }));
                tg.showAlert('Заказ оформлен!');
                cart = {};
                updateCartDisplay();
                updateMainButton();
            } catch (error) {
                console.error('Error sending data to bot:', error);
                tg.showAlert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
            }
        }

        function playAudio(audioData) {
            if (!audioData || audioData.length === 0) {
                console.error('Получены пустые аудиоданные');
                return;
            }

            console.log('Начало воспроизведения аудио, длина данных:', audioData.length);

            try {
                initAudioContext();
                const audioBuffer = audioContext.createBuffer(1, audioData.length, 44100);
                const channelData = audioBuffer.getChannelData(0);
                
                for (let i = 0; i < audioData.length; i++) {
                    channelData[i] = audioData[i] / 32768.0; // Нормализация Int16 в Float32
                }
                
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                
                source.onended = () => {
                    console.log('Воспроизведение аудио завершено');
                    // Здесь можно добавить дополнительные действия после окончания воспроизведения
                };
                
                console.log('Аудио успешно запущено');
            } catch (error) {
                console.error('Ошибка при воспроизведении аудио:', error);
                tg.showAlert('Произошла ошибка при воспроизведении аудио: ' + error.message);
            }
        }

        function playTestSound() {
            initAudioContext();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5); // Звучит 0.5 секунды
            console.log('Тестовый звук воспроизведен');
        }

        const testSoundBtn = document.getElementById('testSoundBtn');
        if (testSoundBtn) {
            console.log('Test sound button found');
            testSoundBtn.addEventListener('click', function() {
                console.log('Test sound button clicked');
                try {
                    playTestSound();
                } catch (error) {
                    console.error('Error playing test sound:', error);
                    tg.showAlert('Ошибка при воспроизведении тестового звука: ' + error.message);
                }
            });
        } else {
            console.error('Test sound button not found');
        }

        // Добавляем обработчик для создания AudioContext после взаимодействия с пользователем
        document.addEventListener('click', initAudioContext);

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
