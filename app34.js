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
let tg;
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext создан, состояние:', audioContext.state);
        } catch (error) {
            console.error('Ошибка при создании AudioContext:', error);
            return;
        }
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
    socket = new WebSocket('ws://localhost:3000'); // Замените на актуальный адрес вашего сервера
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log('WebSocket соединение установлено');
        reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
        try {
            if (event.data instanceof ArrayBuffer) {
                // Если получены аудиоданные (ArrayBuffer)
                playAudio(event.data);
            } else {
                // Если получены текстовые данные
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
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.log(`Попытка переподключения ${reconnectAttempts}/${maxReconnectAttempts}`);
                setTimeout(connectWebSocket, 5000);
            } else {
                tg.showAlert('Не удалось установить соединение с сервером. Пожалуйста, проверьте подключение к интернету и обновите страницу.');
            }
        }
    };

    return socket;
}

function sendMessage(message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'user-message',
            content: message
        }));
    } else {
        console.error('WebSocket не подключен. Попытка переподключения...');
        connectWebSocket();
        setTimeout(() => sendMessage(message), 1000); // Повторная попытка отправки через 1 секунду
    }
}

function decodeAudioData(arrayBuffer) {
    // Преобразование ArrayBuffer в Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Преобразование Uint8Array в строку
    const string = new TextDecoder('utf-8').decode(uint8Array);
    
    // Декодирование Base64
    const binaryString = window.atob(string);
    
    // Преобразование бинарной строки обратно в ArrayBuffer
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
}

function playAudio(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('Получены пустые аудиоданные');
        return;
    }

    console.log('Начало обработки аудио, длина данных:', arrayBuffer.byteLength);

    try {
        initAudioContext();

        // Декодирование полученного ArrayBuffer
        const decodedBuffer = decodeAudioData(arrayBuffer);

        // Проверка наличия WAV-заголовка
        const dataView = new DataView(decodedBuffer);
        const isWav = String.fromCharCode(dataView.getUint8(0), dataView.getUint8(1), dataView.getUint8(2), dataView.getUint8(3)) === 'RIFF' &&
                      String.fromCharCode(dataView.getUint8(8), dataView.getUint8(9), dataView.getUint8(10), dataView.getUint8(11)) === 'WAVE';

        if (!isWav) {
            console.error('Расшифрованные данные не являются WAV-файлом');
            return;
        }

        audioContext.decodeAudioData(decodedBuffer, 
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

function playTestSound() {
    console.log('Начало функции playTestSound');
    initAudioContext();
    console.log('AudioContext состояние:', audioContext.state);
    
    const duration = 0.5;  // длительность звука в секундах
    const frequency = 440; // частота звука в герцах (ля первой октавы)
    
    const sampleRate = audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    
    const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
        console.log('Воспроизведение тестового звука завершено');
    };
    
    source.start();
    console.log('Тестовый звук запущен');
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
            const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
            const totalPrice = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);

            if (totalItems > 0) {
                tg.MainButton.text = `Оформить заказ (${totalItems} шт., ${totalPrice} руб.)`;
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }
        }

        function updateCartDisplay() {
            const cartElement = document.getElementById('cart');
            cartElement.innerHTML = '';
            for (const [id, item] of Object.entries(cart)) {
                const itemElement = document.createElement('div');
                itemElement.textContent = `${item.name} x${item.quantity} - ${item.price * item.quantity} руб.`;
                cartElement.appendChild(itemElement);
            }
        }

        function addToCart(id, name, price, quantity = 1) {
            if (cart[id]) {
                cart[id].quantity += quantity;
            } else {
                cart[id] = { name, price, quantity };
            }
            updateCartDisplay();
            updateMainButton();
        }

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                const price = parseInt(this.dataset.price);
                addToCart(id, name, price);
            });
        });

        document.getElementById('fillingSelect').addEventListener('change', function() {
            selectedFilling = this.value;
            const price = fillingPrices[selectedFilling];
            document.getElementById('shawarmaPrice').textContent = price;
        });

        tg.MainButton.onClick(function() {
            let order = Object.values(cart).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            tg.sendData(JSON.stringify({ order, total }));
        });

        console.log('Page loaded, MainButton initialized');

        const voiceInput = document.getElementById('voiceInput');
        const voiceButton = document.getElementById('voiceButton');

        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'ru-RU';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            voiceButton.addEventListener('click', function() {
                console.log('Нажата кнопка голосового ввода');
                if (this.textContent === 'Голосовой ввод') {
                    this.textContent = 'Остановить запись';
                    this.disabled = true;
                    voiceInput.value = 'Говорите...';
                    recognition.start();
                    console.log('Начало записи аудио');
                } else {
                    recognition.stop();
                    this.textContent = 'Голосовой ввод';
                }
            });

            recognition.onresult = function(event) {
                let result = event.results[0][0].transcript;
                console.log('Распознанный текст:', result);
                voiceInput.value = result;
                sendMessage(result);
            };

            recognition.onerror = function(event) {
                console.error('Ошибка распознавания:', event.error);
                voiceButton.textContent = 'Голосовой ввод';
                voiceButton.disabled = false;
                voiceInput.value = 'Ошибка распознавания. Попробуйте еще раз.';
            };

            recognition.onend = function() {
                console.log('Распознавание завершено');
                voiceButton.textContent = 'Голосовой ввод';
                voiceButton.disabled = false;
            };

            // Создаем AudioContext и анализатор для визуализации голосовой активности
            let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            let analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            let bufferLength = analyser.frequencyBinCount;
            let dataArray = new Uint8Array(bufferLength);

            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);

                    function updateLevel() {
                        analyser.getByteFrequencyData(dataArray);
                        let sum = dataArray.reduce((a, b) => a + b);
                        let average = sum / bufferLength;
                        let level = average / 255; // нормализуем до диапазона 0-1
                        updateVoiceActivityDisplay(level);
                        requestAnimationFrame(updateLevel);
                    }
                    updateLevel();
                })
                .catch(err => console.error('Ошибка при получении доступа к микрофону:', err));
        } else {
            console.error('Web Speech API не поддерживается в этом браузере.');
            voiceInput.value = 'Голосовой ввод не поддерживается';
            tg.showAlert('Голосовой ввод не поддерживается в вашем браузере. Попробуйте использовать другой браузер или устройство.');
            voiceButton.disabled = true;
        }

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

        // Добавляем обработчик для создания AudioContext после взаимодействия с пользователем
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
