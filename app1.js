let tg = window.Telegram.WebApp;
tg.expand();

let item = "";
let socket;

// Функция для установки WebSocket соединения
function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8765'); // Замените на адрес вашего сервера

    socket.onopen = function(event) {
        console.log('WebSocket соединение установлено');
    };

    socket.onmessage = function(event) {
        console.log('Получено сообщение от сервера:', event.data);
        handleServerMessage(event.data);
    };

    socket.onclose = function(event) {
        console.log('WebSocket соединение закрыто');
        // Можно добавить логику переподключения здесь
    };

    socket.onerror = function(error) {
        console.error('Ошибка WebSocket:', error);
    };
}

// Вызываем функцию для установки соединения
connectWebSocket();

// Функция для обработки сообщений от сервера
function handleServerMessage(message) {
    try {
        const data = JSON.parse(message);
        if (data.type === 'bot_response') {
            addMessageToChat('Бот', data.text);
            if (data.audio) {
                playAudio(data.audio);
            }
            if (data.order_confirmation) {
                processVoiceOrder(data.text);
            }
        }
    } catch (error) {
        console.error('Ошибка при обработке сообщения от сервера:', error);
    }
}

let btn1 = document.getElementById("btn-shawarma");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

btn1.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали шаурму!");
        item = "1";
        tg.MainButton.show();
    }
});

btn2.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали питу!");
        item = "2";
        tg.MainButton.show();
    }
});

btn3.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали хумус!");
        item = "3";
        tg.MainButton.show();
    }
});

btn4.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали шашлык из курицы!");
        item = "4";
        tg.MainButton.show();
    }
});

btn5.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали гёзлеме!");
        item = "5";
        tg.MainButton.show();
    }
});

btn6.addEventListener("click", function(){
    if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
    }
    else {
        tg.MainButton.setText("Вы выбрали чечевичный суп!");
        item = "6";
        tg.MainButton.show();
    }
});

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type: 'menu_selection', item: item}));
    } else {
        console.error('WebSocket не подключен');
    }
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);

const voiceOrderBtn = document.getElementById('voiceOrderBtn');
const voiceInterface = document.getElementById('voiceInterface');
const chatDiv = document.getElementById('chat');
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');
const recordVoiceBtn = document.getElementById('recordVoiceBtn');

let mediaRecorder;
let audioChunks = [];

voiceOrderBtn.addEventListener('click', toggleVoiceInterface);
sendTextBtn.addEventListener('click', () => sendMessage(textInput.value));
recordVoiceBtn.addEventListener('mousedown', startRecording);
recordVoiceBtn.addEventListener('mouseup', stopRecording);

function toggleVoiceInterface() {
    if (voiceInterface.style.display === 'none') {
        voiceInterface.style.display = 'block';
        voiceOrderBtn.textContent = '❌';
    } else {
        voiceInterface.style.display = 'none';
        voiceOrderBtn.textContent = '🎤';
    }
}

function sendMessage(text) {
    if (text.trim() === '') return;
    
    addMessageToChat('Вы', text);
    
    // Отправка сообщения через WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Отправка сообщения:', text);
        socket.send(JSON.stringify({type: 'text_message', text: text}));
    } else {
        console.error('WebSocket не подключен');
    }
    
    textInput.value = '';
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.start();
        recordVoiceBtn.textContent = 'Запись...';
    } catch (error) {
        console.error('Ошибка при начале записи:', error);
        alert('Не удалось начать запись. Пожалуйста, проверьте разрешения микрофона.');
    }
}

function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    recordVoiceBtn.textContent = 'Запись';
    mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = function() {
            const base64Audio = reader.result.split(',')[1];
            console.log('Отправка аудио сообщения');
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({type: 'voice_message', audio: base64Audio}));
            } else {
                console.error('WebSocket не подключен');
            }
        }
    });
}

function addMessageToChat(sender, message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${sender}: ${message}`;
    chatDiv.appendChild(messageElement);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function playAudio(base64Audio) {
    try {
        const audio = new Audio("data:audio/mp3;base64," + base64Audio);
        audio.play();
    } catch (error) {
        console.error('Ошибка при воспроизведении аудио:', error);
    }
}

function processVoiceOrder(speechText) {
    console.log('Обработка голосового заказа:', speechText);
    speechText = speechText.toLowerCase();
    if (speechText.includes('шаурма')) {
        btn1.click();
    } else if (speechText.includes('пита')) {
        btn2.click();
    } else if (speechText.includes('хумус')) {
        btn3.click();
    } else if (speechText.includes('шашлык') || speechText.includes('курица')) {
        btn4.click();
    } else if (speechText.includes('гёзлеме')) {
        btn5.click();
    } else if (speechText.includes('суп') || speechText.includes('чечевичный')) {
        btn6.click();
    } else {
        addMessageToChat('Бот', 'Извините, я не смог распознать ваш заказ. Пожалуйста, попробуйте еще раз.');
    }
}

// Обработчик для проверки соединения
tg.onEvent('viewportChanged', function() {
    console.log('Viewport changed. Checking connection...');
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type: 'connection_check'}));
    } else {
        console.log('WebSocket не подключен, попытка переподключения...');
        connectWebSocket();
    }
});
