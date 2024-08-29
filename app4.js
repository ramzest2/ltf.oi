// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Функция для получения цен из URL параметров
function getPricesFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pricesParam = urlParams.get('prices');
    return pricesParam ? JSON.parse(decodeURIComponent(pricesParam)) : null;
}

// Функция для отображения цен на странице
function displayPrices(prices) {
    for (let i = 1; i <= 6; i++) {
        const priceElement = document.getElementById(`price-${i}`);
        if (priceElement && prices[i]) {
            priceElement.textContent = `${(prices[i] / 100).toFixed(2)} руб.`;
        }
    }
}

// Функция для обработки нажатия кнопки
function handleButtonClick(itemId) {
    tg.sendData(itemId.toString());
    tg.close();
}

// Инициализация приложения
function initApp() {
    // Получение цен
    const prices = getPricesFromUrl();
    if (prices) {
        displayPrices(prices);
    } else {
        console.error('Не удалось получить цены');
    }

    // Назначение обработчиков событий для кнопок
    for (let i = 1; i <= 6; i++) {
        const button = document.getElementById(`btn${i}`);
        if (button) {
            button.addEventListener('click', () => handleButtonClick(i));
        }
    }

    // Настройка темы Telegram WebApp
    tg.expand();
    tg.MainButton.hide();
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);
