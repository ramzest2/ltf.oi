let tg = window.Telegram.WebApp;
tg.expand();

let item = "";

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
    tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);

function handleVoiceOrder() {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();
        alert('Говорите, пожалуйста...');

        recognition.onresult = function(event) {
            const speechResult = event.results[0][0].transcript.toLowerCase();
            console.log('Распознанная речь:', speechResult);
            processVoiceOrder(speechResult);
        };

        recognition.onerror = function(event) {
            console.error('Ошибка распознавания речи:', event.error);
            alert('Извините, произошла ошибка при распознавании речи. Попробуйте еще раз.');
        };

        recognition.onend = function() {
            console.log('Распознавание речи завершено');
        };
    } else {
        alert('Ваш браузер не поддерживает распознавание речи.');
    }
}

function processVoiceOrder(speechText) {
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
        alert('Извините, я не смог распознать ваш заказ. Пожалуйста, попробуйте еще раз.');
    }
}

document.getElementById('voiceOrderBtn').addEventListener('click', handleVoiceOrder);
