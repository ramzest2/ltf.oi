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
    const serverIP = '192.168.1.8'; // Замените на реальный локальный IP-адрес вашего сервера
    const serverPort = 3000; // Убедитесь, что это соответствует порту вашего сервера
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const protocol = window.location.protocol === 'https:' ? 'ws:' : 'ws:';
    const protocol = 'ws:'; // Используем ws:// для локального тестирования
   // socket = new WebSocket(`${protocol}//${serverIP}:${serverPort}`);
    
    socket = new WebSocket(`${protocol}//${serverIP}:${serverPort}`);
    
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log('WebSocket соединение установлено');
    };

    socket.onmessage = (event) => {
        try {
            console.log('Получено сообщение. Тип данных:', typeof event.data);
            console.log('Размер данных:', event.data.length || event.data.byteLength);

            if (typeof event.data === 'string') {
                const data = JSON.parse(event.data);
                console.log('Получено JSON сообщение:', data);
                if ((data.type === 'ai-response' || data.type === 'ai-response-delta') && 
                    data.content && data.content[0] && data.content[0].type === 'audio') {
                    console.log('Получен ответ с аудио');
                    processAudioData(data.content[0].data);
                } else if (data.content && data.content.message) {
                    processAIResponse(data.content.message);
                }
            } else if (event.data instanceof ArrayBuffer) {
                console.log('Получены бинарные данные (ArrayBuffer)');
                processAudioData(event.data);
            } else {
                console.log('Получен неизвестный тип данных');
            }
        } catch (error) {
            console.error('Ошибка при обработке полученного сообщения:', error);
            tg.showAlert('Произошла ошибка при обработке данных. Попробуйте еще раз.');
        }
    };

    socket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        console.log('Детали ошибки:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        tg.showAlert(`Произошла ошибка соединения: ${error.message}. Проверьте подключение к интернету и попробуйте обновить страницу.`);
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

function processAudioData(audioData) {
    console.log('Начало обработки аудиоданных');
    
    let pcm16ArrayBuffer;
    if (typeof audioData === 'string') {
        const binaryString = atob(audioData);
        pcm16ArrayBuffer = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(pcm16ArrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
            view[i] = binaryString.charCodeAt(i);
        }
    } else if (audioData instanceof ArrayBuffer) {
        pcm16ArrayBuffer = audioData;
    } else {
        console.error('Неподдерживаемый формат аудиоданных');
        return;
    }

    console.log('Длина PCM16 ArrayBuffer:', pcm16ArrayBuffer.byteLength);

    const wavHeader = createWavHeader(24000, 16, 1, pcm16ArrayBuffer.byteLength);
    console.log('Длина WAV заголовка:', wavHeader.byteLength);

    const finalArrayBuffer = new ArrayBuffer(wavHeader.byteLength + pcm16ArrayBuffer.byteLength);
    new Uint8Array(finalArrayBuffer).set(new Uint8Array(wavHeader), 0);
    new Uint8Array(finalArrayBuffer).set(new Uint8Array(pcm16ArrayBuffer), wavHeader.byteLength);
    console.log('Длина финального ArrayBuffer:', finalArrayBuffer.byteLength);

    playAudio(finalArrayBuffer);
}

function createWavHeader(sampleRate, bitsPerSample, numChannels, dataLength) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    view.setUint16(32, numChannels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function playAudio(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('Получены пустые аудиоданные');
        return;
    }

    console.log('Начало воспроизведения аудио, длина данных:', arrayBuffer.byteLength);

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
        console.error('Ошибка при воспроизведении аудио:', error);
        tg.showAlert('Произошла ошибка при воспроизведении аудио: ' + error.message);
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
            
            const language = document.getElementById('languageSelect').value;
            let removeText;
            switch(language) {
                case 'ru-RU': removeText = 'Удалить'; break;
                case 'en-US': removeText = 'Remove'; break;
                case 'id-ID': removeText = 'Hapus'; break;
                default: removeText = 'Remove';
            }
            
            for (let id in cart) {
                let item = cart[id];
                let itemElement = document.createElement('div');
                itemElement.textContent = `${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`;
                
                let removeButton = document.createElement('button');
                removeButton.textContent = removeText;
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

        document.getElementById('voiceOrderBtn').addEventListener('click', function() {
            console.log('Нажата кнопка голосового ввода');
            let voiceInput = document.getElementById('voiceInput');
            voiceInput.value = 'Слушаю...';
            this.disabled = true;
            this.textContent = 'Слушаю...';

            if ('webkitSpeechRecognition' in window) {
                let recognition = new webkitSpeechRecognition();
                let languageSelect = document.getElementById('languageSelect');
                recognition.lang = languageSelect.value;
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.start();

                recognition.onresult = function(event) {
                    let result = event.results[0][0].transcript;
                    console.log('Распознанный текст:', result);
                    voiceInput.value = result;

                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ 
                            type: 'user-message', 
                            content: result,
                            language: languageSelect.value
                        }));
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
                const language = document.getElementById('languageSelect').value;
                if (language === 'ru-RU') {
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
                } else if (language === 'en-US') {
                    if (response.toLowerCase().includes('add to cart')) {
                        const match = response.match(/add to cart (\d+) (.+)/i);
                        if (match) {
                            const quantity = parseInt(match[1]);
                            const item = match[2];
                            addToCartFromVoice(item, quantity);
                        }
                    } else if (response.toLowerCase().includes('place order')) {
                        placeOrder();
                    }
                } else if (language === 'id-ID') {
                    if (response.toLowerCase().includes('tambahkan ke keranjang')) {
                        const match = response.match(/tambahkan ke keranjang (\d+) (.+)/i);
                        if (match) {
                            const quantity = parseInt(match[1]);
                            const item = match[2];
                            addToCartFromVoice(item, quantity);
                        }
                    } else if (response.toLowerCase().includes('buat pesanan')) {
                        placeOrder();
                    }
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
            const language = document.getElementById('languageSelect').value;
            const menu = [
                {id: 'shawarma_chicken', ru: 'Шаурма с курицей', en: 'Chicken Shawarma', id: 'Shawarma Ayam', price: 25},
                {id: 'shawarma_beef', ru: 'Шаурма с говядиной', en: 'Beef Shawarma', id: 'Shawarma Sapi', price: 40},
                {id: 'shawarma_shrimp', ru: 'Шаурма с креветками', en: 'Shrimp Shawarma', id: 'Shawarma Udang', price: 40},
                {id: 'falafel', ru: 'Фалафель', en: 'Falafel', id: 'Falafel', price: 25},
                {id: 'pita', ru: 'Пита', en: 'Pita', id: 'Pita', price: 25},
                {id: 'hummus', ru: 'Хумус', en: 'Hummus', id: 'Hummus', price: 25},
                {id: 'chicken_kebab', ru: 'Шашлык из курицы', en: 'Chicken Kebab', id: 'Kebab Ayam', price: 35},
                {id: 'gozleme', ru: 'Гёзлеме', en: 'Gozleme', id: 'Gozleme', price: 25},
                {id: 'lentil_soup', ru: 'Чечевичный суп', en: 'Lentil Soup', id: 'Sup Lentil', price: 20},
            ];
            
            let langKey;
            switch(language) {
                case 'ru-RU': langKey = 'ru'; break;
                case 'en-US': langKey = 'en'; break;
                case 'id-ID': langKey = 'id'; break;
                default: langKey = 'en';
            }

            return menu.find(item => item[langKey].toLowerCase().includes(itemName.toLowerCase()));
        }

        function placeOrder() {
            let order = Object.values(cart).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));
            let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
            
            const language = document.getElementById('languageSelect').value;
            let orderPlacedText;
            switch(language) {
                case 'ru-RU': orderPlacedText = 'Заказ оформлен!'; break;
                case 'en-US': orderPlacedText = 'Order placed!'; break;
                case 'id-ID': orderPlacedText = 'Pesanan dibuat!'; break;
                default: orderPlacedText = 'Order placed!';
            }
            
            try {
                tg.sendData(JSON.stringify({ order, total }));
                tg.showAlert(orderPlacedText);
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
