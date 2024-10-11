let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let cart = {};

function updateMainButton() {
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > 0) {
        let formattedTotal = (total / 1000).toFixed(0);
        tg.MainButton.setText(`Заказать (${formattedTotal}k рупий)`);
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
    priceElement.textContent = `${fillingPrices[selectedFilling] / 1000}k рупий.`;
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
        cart[id] = { name, price: price * 1000, quantity: 1 };
    }
    updateCartDisplay();
    updateMainButton();
}

document.querySelectorAll('.btn').forEach(btn => {
    if (btn) {
        btn.addEventListener('click', function() {
            let id = this.id.replace('btn', '');
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
    let order = Object.values(cart).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }));
    let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        tg.sendData(JSON.stringify({ order, total }));
    } catch (error) {
        console.error('Error sending data to bot:', error);
    }
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

// Голосовой интерфейс
const voiceOrderBtn = document.getElementById('voiceOrderBtn');
const voiceInterface = document.getElementById('voiceInterface');
const chatDiv = document.getElementById('chat');
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');
const recordVoiceBtn = document.getElementById('recordVoiceBtn');

let isRecording = false;
let mediaRecorder;
let audioChunks = [];

voiceOrderBtn.addEventListener('click', toggleVoiceInterface);
sendTextBtn.addEventListener('click', () => sendMessage(textInput.value));
recordVoiceBtn.addEventListener('click', toggleRecording);

function toggleVoiceInterface() {
    voiceInterface.style.display = voiceInterface.style.display === 'none' ? 'block' : 'none';
    voiceOrderBtn.textContent = voiceInterface.style.display === 'none' ? '🎤' : '❌';
}

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
    isRecording = !isRecording;
    recordVoiceBtn.textContent = isRecording ? '⏹️' : '🎤';
}

async function startRecording() {
    console.log('Starting recording...');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendAudioMessage(audioBlob);
        });

        mediaRecorder.start();
        document.getElementById('recordingStatus').textContent = 'Запись...';
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Не удалось начать запись. Пожалуйста, проверьте разрешения микрофона.');
        isRecording = false;
        recordVoiceBtn.textContent = '🎤';
    }
}

function stopRecording() {
    console.log('Stopping recording...');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('recordingStatus').textContent = 'Запись остановлена. Обработка...';
    }
}

function sendAudioMessage(audioBlob) {
    console.log('Sending audio message...');
    addMessageToChat('Система', 'Отправка аудиосообщения...');
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = function() {
        const base64Audio = reader.result.split(',')[1];
        fetch(CONFIG.AUDIO_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({type: 'voice_message', audio: base64Audio}),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Audio sent successfully:', data);
            addMessageToChat('Система', 'Аудиосообщение отправлено успешно.');
        })
        .catch(error => {
            console.error('Error sending audio:', error);
            addMessageToChat('Система', 'Произошла ошибка при отправке аудиосообщения. Пожалуйста, попробуйте еще раз.');
        });
    }
}

function sendMessage(text) {
    if (text.trim() === '') return;
    
    console.log('Sending message:', text);
    addMessageToChat('Вы', text);
    
    fetch(CONFIG.MESSAGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({type: 'text_message', text: text}),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        handleServerMessage(data);
    })
    .catch((error) => {
        console.error('Error sending message:', error);
        addMessageToChat('Система', 'Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте еще раз.');
    });
    
    textInput.value = '';
}

function addMessageToChat(sender, message) {
    console.log('Adding message to chat:', sender, message);
    const messageElement = document.createElement('p');
    messageElement.textContent = `${sender}: ${message}`;
    chatDiv.appendChild(messageElement);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function handleServerMessage(data) {
    console.log('Received server message:', data);
    if (data.type === 'bot_response') {
        addMessageToChat('Бот', data.text);
        if (data.audio) {
            playAudio(data.audio);
        }
        if (data.order_confirmation) {
            processVoiceOrder(data.text);
        }
    } else if (data.type === 'error') {
        addMessageToChat('Система', `Ошибка: ${data.message}`);
    } else {
        console.warn('Unknown message type:', data.type);
        addMessageToChat('Система', 'Получено неизвестное сообщение от сервера.');
    }
}

function playAudio(base64Audio) {
    console.log('Playing audio...');
    try {
        const audio = new Audio("data:audio/mp3;base64," + base64Audio);
        audio.play
