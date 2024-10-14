// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

// Проверка поддержки Web Audio API
if (!window.AudioContext && !window.webkitAudioContext) {
    console.error('Web Audio API не поддерживается в этом браузере.');
    tg.showAlert('Ваш браузер не поддерживает воспроизведение аудио. Попробуйте использовать другой браузер.');
}

// Инициализация WebSocket с более подробной обработкой ошибок
const socket = new WebSocket('ws://localhost:3000'); // Замените на актуальный адрес вашего сервера

let audioContext;
let audioBufferQueue = [];
let isPlaying = false;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playAudio(audioData) {
    if (!audioData || audioData.length === 0) {
        console.error('Получены пустые аудиоданные');
        return;
    }

    initAudioContext();

    const audioBuffer = audioContext.createBuffer(1, audioData.length, 44100);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] / 32768.0; // Нормализация Int16 в Float32
    }
    
    audioBufferQueue.push(audioBuffer);
    
    if (!isPlaying) {
        playNextBuffer();
    }
}

function playNextBuffer() {
    if (audioBufferQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    const source = audioContext.createBufferSource();
    source.buffer = audioBufferQueue.shift();
    source.connect(audioContext.destination);
    source.onended = playNextBuffer;
    source.start();

    console.log('Начало воспроизведения аудио буфера');
}

socket.onopen = () => {
    console.log('WebSocket соединение установлено');
};

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        console.log('Получено сообщение:', data);
        if (data.type === 'ai-response') {
            if (data.content && data.content.audio) {
                console.log('Получены аудиоданные:', data.content.audio);
                console.log('Тип аудиоданных:', typeof data.content.audio);
                console.log('Длина аудиоданных:', data.content.audio.length);
                console.log('Пример значений:', data.content.audio.slice(0, 10));
                
                // Преобразование данных в Int16Array, если они приходят как обычный массив
                const audioArray = data.content.audio instanceof Int16Array 
                    ? data.content.audio 
                    : new Int16Array(data.content.audio);
                
                playAudio(audioArray);
            } else {
                console.error('Аудиоданные отсутствуют в ответе');
            }
            if (data.content.message) {
                processAIResponse(data.content.message);
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
        tg.showAlert('Соединение с сервером прервано. Попробуйте обновить страницу.');
    }
};

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

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.filling-btn[data-filling="chicken"]').classList.add('selected');
    updateShawarmaPrice();
    updateCartDisplay();
    updateMainButton();
    console.log('Page loaded, MainButton initialized');
});

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
        {id: 'hummus',
