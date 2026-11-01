import { Game } from './game.js';
import { preloadModels } from './models.js';
import { preloadCharacter } from './character-assets.js';

const start = document.getElementById('btn-start');
const serial = document.querySelector('.menu-serial');
const original = serial.textContent;
start.disabled = true;
document.getElementById('btn-continue').disabled = true;
serial.textContent = 'ЗАГРУЗКА ОБОРУДОВАНИЯ ECHO…';
try {
    await Promise.all([preloadModels(), preloadCharacter()]);
    const game = new Game();
    game.init();
    window.__game = game;
    start.disabled = false;
    serial.textContent = original;
} catch (error) {
    console.error('ECHO initialization failed', error);
    serial.textContent = 'Не удалось загрузить игру. Перезапустите локальный сервер и обновите страницу.';
}
