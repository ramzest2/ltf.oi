// Проверка наличия CONFIG
if (typeof CONFIG === 'undefined' || !CONFIG.SERVER_ENDPOINT) {
    console.error('CONFIG or SERVER_ENDPOINT is not defined. Please check your configuration setup.');
    CONFIG = CONFIG || {};
    CONFIG.SERVER_ENDPOINT = CONFIG.SERVER_ENDPOINT || 'http://localhost:8000';
}

let tg = window.Telegram.WebApp;
tg.expand();

let item = "";
let eventSource;

function setupEventSource() {
    eventSource = new EventSource(`${CONFIG.SERVER_ENDPOINT}/stream`);

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    eventSource.onerror = function(error) {
        console.error('EventSource failed:', error);
        eventSource.close();
        setTimeout(setupEventSource, 5000); // Попытка переподключения через 5 секунд
    };
}

setupEventSource();

function handleServerMessage(data) {
    if (data.type === 'bot_response') {
        addMessageToChat('Бот', data.text);
        if (data.audio) {
            playAudio(data.audio);
        }
        if (data.order_confirmation) {
            processVoiceOrder(data.text);
        }
    }
}

function sendMessage(text) {
    if (text.trim() === '') return;
    
    addMessageToChat('Вы', text);
    
    fetch(`${CONFIG.SERVER_ENDPOINT}/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({type: 'text_message', text: text}),
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
    
    textInput.value = '';
}

function setupButton(btn, text, itemValue) {
    btn.addEventListener("click", function(){
        if (tg.MainButton.isVisible) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.setText(text);
            item = itemValue;
            tg.MainButton.show();
        }
    });
}

setupButton(document.getElementById("btn-shawarma"), "Вы выбрали шаурму!", "1");
setupButton(document.getElementById("btn2"), "Вы выбрали питу!", "2");
setupButton(document.getElementById("btn3"), "Вы выбрали хумус!", "3");
setupButton(document.getElementById("btn4"), "Вы выбрали шашлык из курицы!", "4");
setupButton(document.getElementById("btn5"), "Вы выбрали гёзлеме!", "5");
setupButton(document.getElementById("btn6"), "Вы выбрали чечевичный суп!", "6");

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    sendMessage(`Выбран пункт меню: ${item}`);
});

let usercard = document.getElementById("usercard");
let p = document.createElement("p");
p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
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
    voiceInterface.style.display = voiceInterface.style.display === 'none' ? 'block' : 'none';
    voiceOrderBtn.textContent = voiceInterface.style.display === 'none' ? '🎤' : '❌';
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
        sendAudioMessage(audioBlob);
    });
}

function sendAudioMessage(audioBlob) {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = function() {
        const base64Audio = reader.result.split(',')[1];
        fetch(`${CONFIG.SERVER_ENDPOINT}/send-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({type: 'voice_message', audio: base64Audio}),
        })
        .then(response => response.json())
        .then(data => console.log('Audio sent successfully:', data))
        .catch(error => console.error('Error sending audio:', error));
    }
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
        document.getElementById("btn-shawarma").click();
    } else if (speechText.includes('пита')) {
        document.getElementById("btn2").click();
    } else if (speechText.includes('хумус')) {
        document.getElementById("btn3").click();
    } else if (speechText.includes('шашлык') || speechText.includes('курица')) {
        document.getElementById("btn4").click();
    } else if (speechText.includes('гёзлеме')) {
        document.getElementById("btn5").click();
    } else if (speechText.includes('суп') || speechText.includes('чечевичный')) {
        document.getElementById("btn6").click();
    } else {
        addMessageToChat('Бот', 'Извините, я не смог распознать ваш заказ. Пожалуйста, попробуйте еще раз.');
    }
}

tg.onEvent('viewportChanged', function() {
    console.log('Viewport changed. Checking connection...');
    if (eventSource.readyState === EventSource.CLOSED) {
        console.log('EventSource закрыт, попытка переподключения...');
        setupEventSource();
    }
});
