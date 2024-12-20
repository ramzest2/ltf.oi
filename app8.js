import { RealtimeClient } from '@openai/realtime-api-beta';

import dotenv from 'dotenv';
dotenv.config();

console.log('App7.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');

    let tg = window.Telegram.WebApp;

    tg.expand();

    tg.MainButton.textColor = '#FFFFFF';
    tg.MainButton.color = '#2cab37';

    let cart = {};

    const client = new RealtimeClient({ apiKey: process.env.OPENAI_API_KEY });

    client.updateSession({
        instructions: 'Вы помощник в ресторане шаурмы. Помогайте клиентам с заказами и отвечайте на вопросы о меню.',
        voice: 'alloy',
        turn_detection: 'server_vad'
    });

    client.connect().then(() => {
        console.log('Connected to Realtime API');
    }).catch(error => {
        console.error('Failed to connect to Realtime API:', error);
    });

    function updateMainButton() {
        let total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (total > 0) {
            tg.MainButton.setText(`Заказать (${formatPrice(total)})`);
            tg.MainButton.show();
        } else {
            tg.MainButton.hide();
        }
    }

    let selectedFilling = 'chicken';
    const fillingPrices = {
        'chicken': 35000,
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
        if (priceElement) {
            priceElement.textContent = formatPrice(fillingPrices[selectedFilling]);
        } else {
            console.error('Price element not found');
        }
    }

    const btnShawarma = document.getElementById('btn-shawarma');
    if (btnShawarma) {
        btnShawarma.addEventListener('click', function() {
            const filling = document.querySelector('.filling-btn.selected');
            const fillingEmoji = filling ? filling.dataset.emoji : '🐓';
            addToCart('shawarma', `Шаурма ${fillingEmoji}`, fillingPrices[selectedFilling]);
        });
    } else {
        console.error('Shawarma button not found');
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
            alert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
        }
    });

    let usercard = document.getElementById("usercard");
    if (usercard) {
        let p = document.createElement("p");
        p.innerText = `${tg.initDataUnsafe.user.first_name} ${tg.initDataUnsafe.user.last_name}`;
        usercard.appendChild(p);
    } else {
        console.error('Usercard element not found');
    }

    const chickenBtn = document.querySelector('.filling-btn[data-filling="chicken"]');
    if (chickenBtn) {
        chickenBtn.classList.add('selected');
        updateShawarmaPrice();
    } else {
        console.error('Chicken button not found');
    }

    updateCartDisplay();
    updateMainButton();
    console.log('Page loaded, MainButton initialized');

    function formatPrice(price) {
        return `${(price / 1000).toFixed(0)}k рупий`;
    }

    function speakText(text) {
        if ('speechSynthesis' in window) {
            let utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            speechSynthesis.speak(utterance);
        } else {
            console.error('Синтез речи не поддерживается в этом браузере.');
            tg.showAlert('Голосовой ответ не поддерживается в вашем браузере.');
        }
    }

    const voiceOrderBtn = document.getElementById('voiceOrderBtn');
    console.log('Voice order button:', voiceOrderBtn);
    if (voiceOrderBtn) {
        voiceOrderBtn.addEventListener('click', function() {
            console.log('Voice input button clicked');
            let voiceInput = document.getElementById('voiceInput');
            if (voiceInput) {
                voiceInput.value = 'Слушаю...';
            } else {
                console.error('Voice input element not found');
            }

            if ('webkitSpeechRecognition' in window) {
                console.log('Web Speech API поддерживается');
                let recognition = new webkitSpeechRecognition();
                recognition.lang = 'ru-RU';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.start();

                recognition.onstart = function() {
                    console.log('Распознавание начато');
                };

                recognition.onresult = function(event) {
                    let result = event.results[0][0].transcript;
                    console.log('Распознанный текст:', result);
                    if (voiceInput) {
                        voiceInput.value = result;
                    }
                    processVoiceCommand(result);
                };

                recognition.onerror = function(event) {
                    console.error('Ошибка распознавания:', event.error);
                    if (voiceInput) {
                        voiceInput.value = 'Ошибка распознавания речи';
                    }
                    tg.showAlert('Произошла ошибка при распознавании речи. Попробуйте еще раз.');
                };

                recognition.onend = function() {
                    console.log('Распознавание завершено');
                };
            } else {
                console.error('Web Speech API не поддерживается в этом браузере.');
                if (voiceInput) {
                    voiceInput.value = 'Голосовой ввод не поддерживается';
                }
                tg.showAlert('Голосовой ввод не поддерживается в вашем браузере.');
            }
        });
    } else {
        console.error('Voice order button not found');
    }

    function processVoiceCommand(command) {
        console.log('Processing voice command:', command);
        client.sendUserMessageContent([{ type: 'text', text: command }]);
    }

    client.on('conversation.updated', ({ item, delta }) => {
        if (item.role === 'assistant' && delta && delta.text) {
            console.log('Ответ ассистента:', delta.text);
            tg.showAlert(delta.text);
            speakText(delta.text);
        }
    });

    client.addTool(
      {
        name: 'get_menu',
        description: 'Получает текущее меню ресторана',
        parameters: {},
      },
      async () => {
        return {
          items: [
            { name: 'Шаурма с курицей', price: fillingPrices['chicken'] },
            { name: 'Шаурма с говядиной', price: fillingPrices['beef'] },
            { name: 'Шаурма с креветками', price: fillingPrices['shrimp'] },
            { name: 'Фалафель', price: fillingPrices['falafel'] },
            { name: 'Пита', price: 25000 },
            { name: 'Хумус', price: 25000 },
            { name: 'Шашлык из курицы', price: 35000 },
            { name: 'Гёзлеме', price: 25000 },
            { name: 'Чечевичный суп', price: 20000 },
          ]
        };
      }
    );

    client.addTool(
      {
        name: 'place_order',
        description: 'Размещает заказ клиента',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
          },
        },
      },
      async ({ items }) => {
        items.forEach(item => {
          let price;
          if (item.name.toLowerCase().includes('шаурма')) {
            const filling = item.name.split(' ')[2].toLowerCase();
            price = fillingPrices[filling];
          } else {
            const menuItem = document.querySelector(`.item h3:contains('${item.name}')`);
            if (menuItem) {
              const priceElement = menuItem.nextElementSibling;
              price = parseInt(priceElement.textContent.replace(/[^0-9]/g, '')) * 1000;
            }
          }
          if (price) {
            addToCart(item.name.toLowerCase(), item.name, price, item.quantity);
          }
        });
        updateCartDisplay();
        updateMainButton();
        return { status: 'Заказ добавлен в корзину' };
      }
    );
});
