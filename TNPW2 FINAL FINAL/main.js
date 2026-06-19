// main.js
// IR04 – Router / Navigační logika

import { subscribe, dispatch } from './store.js';
import { getIsLoggedIn, getCurrentUser, getSelectedEquipmentId } from './selectors.js';
import { renderLogin, renderEquipmentList, renderRentalList, renderEquipmentDetail } from './view.js';

const appContainer = document.getElementById('app');
const navEl = document.getElementById('main-nav');
const userInfoEl = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

// IR04 – Router: rozhoduje co vykreslit podle stavu a URL
const router = () => {
    const isLoggedIn = getIsLoggedIn();

    // Není přihlášen → vždy zobraz login
    if (!isLoggedIn) {
        navEl.classList.add('hidden');
        userInfoEl.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        renderLogin(appContainer);
        return;
    }

    // Přihlášen → zobraz navigaci
    navEl.classList.remove('hidden');
    userInfoEl.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    const currentUser = getCurrentUser();
    userInfoEl.textContent = `${currentUser.name} (${currentUser.role === 'SPRAVCE' ? 'Správce' : 'Zákazník'})`;

    // Zkontroluj jestli je vybrán detail vybavení
    const selectedId = getSelectedEquipmentId();
    if (selectedId) {
        renderEquipmentDetail(appContainer, selectedId);
        return;
    }

    // Hash routing
    const hash = window.location.hash || '#katalog';

    if (hash === '#katalog') {
        renderEquipmentList(appContainer);
    } else if (hash === '#vypujcky') {
        renderRentalList(appContainer);
    } else {
        appContainer.replaceChildren();
        const h = document.createElement('h2');
        h.textContent = 'Stránka nenalezena (404)';
        appContainer.appendChild(h);
    }
};

// IR07 – Odhlášení
logoutBtn.addEventListener('click', () => {
    dispatch({ type: 'LOGOUT' });
    window.location.hash = '#katalog';
});

// Hashchange – navigace + kontrola deadlinů při přechodu na výpůjčky
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#vypujcky') {
        dispatch({ type: 'CHECK_DEADLINES' });
    }
    router();
});

// Přihlásíme render smyčku
subscribe(router);

// Prvotní start
router();