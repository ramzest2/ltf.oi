let tg = window.Telegram.WebApp;
tg.expand();

let item = "";

let btn1 = document.getElementById("btn-shawarma");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

// ... (существующий код для обработки кликов по кнопкам) ...

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);

// Новый код для голосового помощника
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
    
    // Отправка сообщения боту
    tg.sendData(JSON.stringify({type: 'text_message', text: text}));
    
    textInput.value = '';
}

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.start();
    recordVoiceBtn.textContent = 'Запись...';
}

function stopRecording() {
    mediaRecorder.stop();
    recordVoiceBtn.textContent = 'Запись';
    mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = function() {
            const base64Audio = reader.result.split(',')[1];
            tg.sendData(JSON.stringify({type: 'voice_message', audio: base64Audio}));
        }
    });
}

function addMessageToChat(sender, message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${sender}: ${message}`;
    chatDiv.appendChild(messageElement);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Обработка входящих сообщений от бота
tg.onEvent('message', function(message) {
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
});

function playAudio(base64Audio) {
    const audio = new Audio("data:audio/mp3;base64," + base64Audio);
    audio.play();
}

function processVoiceOrder(speechText) {
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
