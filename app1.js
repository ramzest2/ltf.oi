let tg = window.Telegram.WebApp;
tg.expand();

let item = "";
let pusher;
let channel;

// Функция для установки Pusher соединения
function connectPusher() {
    pusher = new Pusher(CONFIG.PUSHER_APP_KEY, {
        cluster: CONFIG.PUSHER_CLUSTER
    });

    channel = pusher.subscribe('my-channel');

    channel.bind('bot_response', function(data) {
        console.log('Получено сообщение от сервера:', data);
        handleServerMessage(data);
    });
}

// Вызываем функцию для установки соединения
connectPusher();

// Функция для обработки сообщений от сервера
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

let btn1 = document.getElementById("btn-shawarma");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

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

setupButton(btn1, "Вы выбрали шаурму!", "1");
setupButton(btn2, "Вы выбрали питу!", "2");
setupButton(btn3, "Вы выбрали хумус!", "3");
setupButton(btn4, "Вы выбрали шашлык из курицы!", "4");
setupButton(btn5, "Вы выбрали гёзлеме!", "5");
setupButton(btn6, "Вы выбрали чечевичный суп!", "6");

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    sendMessage(item);
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

function sendMessage(text) {
    if (text.trim() === '') return;
    
    addMessageToChat('Вы', text);
    
    // Отправка сообщения на сервер
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
        console.log('Отправка аудио сообщения');
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
        btn1.click();
    } else if (speechText.includes('пита')) {
        btn2
