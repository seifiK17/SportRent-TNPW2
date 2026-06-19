// view.js
// IR06 – Renderovací logika (View composition)
// IR07 – Handlery a vazba UI → akce

import {
    getAvailableEquipment,
    getAllEquipment,
    getActiveRentals,
    getRentalHistory,
    getRentalsByUser,
    getReservations,
    getOverdueRentals,
    getCancelledRentals,
    getError,
    getProcessingIds,
    getCurrentUser,
    getEquipmentById,
    getAuthError,
    getRentalPenaltyInfo,
    getRentalTotalPrice,
} from './selectors.js';
import { apiRentEquipment, apiReturnEquipment, apiReserveEquipment, apiCancelReservation, apiCheckDeadlines } from './api.js';
import { dispatch } from './store.js';

// Helper: badge stavu vybavení
const createStatusBadge = (status) => {
    const badge = document.createElement('span');
    badge.classList.add('status-badge', `status-${status.toLowerCase()}`);
    const labels = {
        AVAILABLE: 'Dostupné',
        RENTED: 'Půjčeno',
        MAINTENANCE: 'Údržba',
        RETIRED: 'Vyřazeno'
    };
    badge.textContent = labels[status] || status;
    return badge;
};

// Helper: badge stavu výpůjčky/rezervace
const createRentalBadge = (rental) => {
    const badge = document.createElement('span');

    const statusMap = {
        RESERVATION: { cls: 'status-rented', text: 'Rezervace' },
        ACTIVE:      { cls: 'status-available', text: 'Aktivní' },
        OVERDUE:     { cls: 'status-overdue', text: 'Po splatnosti' },
        RETURNED:    { cls: 'status-returned', text: 'Vráceno' },
        CANCELLED:   { cls: 'status-maintenance', text: 'Zrušeno' },
    };

    const s = statusMap[rental.status] || { cls: 'status-returned', text: rental.status };
    badge.classList.add('status-badge', s.cls);
    badge.textContent = s.text;
    return badge;
};

// Helper: chybová hláška
const createErrorBanner = (msg) => {
    const div = document.createElement('div');
    div.classList.add('error-banner');
    div.textContent = msg;
    return div;
};

// --- PŘIHLAŠOVACÍ OBRAZOVKA ---
export const renderLogin = (container) => {
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.classList.add('login-wrapper');

    const card = document.createElement('div');
    card.classList.add('login-card');

    const logo = document.createElement('div');
    logo.classList.add('login-logo');
    logo.textContent = '🏔️';

    const title = document.createElement('h1');
    title.classList.add('login-title');
    title.textContent = 'SportRent';

    const subtitle = document.createElement('p');
    subtitle.classList.add('login-subtitle');
    subtitle.textContent = 'Půjčovna sportovního vybavení';

    const authError = getAuthError();
    if (authError) {
        card.appendChild(createErrorBanner(authError));
    }

    const form = document.createElement('div');
    form.classList.add('login-form');

    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Uživatelské jméno';
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = 'franta / jana / admin';
    usernameInput.id = 'login-username';

    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = 'Heslo';
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = '••••••••';
    passwordInput.id = 'login-password';

    const loginBtn = document.createElement('button');
    loginBtn.classList.add('btn-primary');
    loginBtn.textContent = 'Přihlásit se';

    // IR07 – Handler přihlášení
    const handleLogin = () => {
        dispatch({
            type: 'LOGIN',
            payload: {
                username: usernameInput.value.trim(),
                password: passwordInput.value
            }
        });
    };

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    const hint = document.createElement('p');
    hint.classList.add('login-hint');
    hint.textContent = 'Zákazník: franta / heslo123 · Správce: admin / admin123';

    form.appendChild(usernameLabel);
    form.appendChild(usernameInput);
    form.appendChild(passwordLabel);
    form.appendChild(passwordInput);
    form.appendChild(loginBtn);

    card.appendChild(logo);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(form);
    card.appendChild(hint);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
};

// --- KATALOG VYBAVENÍ ---
export const renderEquipmentList = (container) => {
    container.replaceChildren();

    const currentUser = getCurrentUser();
    const isSpravce = currentUser.role === 'SPRAVCE';
    const items = isSpravce ? getAllEquipment() : getAvailableEquipment();

    const error = getError();
    if (error) container.appendChild(createErrorBanner(error));

    const header = document.createElement('div');
    header.classList.add('page-header');
    const title = document.createElement('h2');
    title.textContent = isSpravce ? 'Správa vybavení' : 'Katalog vybavení';
    const count = document.createElement('span');
    count.classList.add('item-count');
    count.textContent = `${items.length} položek`;
    header.appendChild(title);
    header.appendChild(count);
    container.appendChild(header);

    if (items.length === 0) {
        const empty = document.createElement('p');
        empty.classList.add('empty-msg');
        empty.textContent = 'Bohužel, momentálně není žádné vybavení k dispozici.';
        container.appendChild(empty);
        return;
    }

    const grid = document.createElement('div');
    grid.classList.add('equipment-grid');

    const processingIds = getProcessingIds();

    items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('equipment-card');
        if (item.status !== 'AVAILABLE') card.classList.add('card-unavailable');

        const cardTop = document.createElement('div');
        cardTop.classList.add('card-top');

        const categoryTag = document.createElement('span');
        categoryTag.classList.add('category-tag');
        categoryTag.textContent = item.category;

        cardTop.appendChild(categoryTag);
        cardTop.appendChild(createStatusBadge(item.status));

        const cardName = document.createElement('h3');
        cardName.classList.add('card-name');
        cardName.textContent = item.name;

        const cardDesc = document.createElement('p');
        cardDesc.classList.add('card-desc');
        cardDesc.textContent = item.description;

        const cardFooter = document.createElement('div');
        cardFooter.classList.add('card-footer');

        const price = document.createElement('span');
        price.classList.add('card-price');
        price.textContent = `${item.price} Kč / den`;
        cardFooter.appendChild(price);

        if (isSpravce) {
            // Správce: správa stavu vybavení
            if (item.status === 'AVAILABLE') {
                const btnMaint = document.createElement('button');
                btnMaint.classList.add('btn-outline');
                btnMaint.textContent = 'Do údržby';
                btnMaint.addEventListener('click', () => {
                    dispatch({ type: 'SEND_TO_MAINTENANCE', payload: { equipmentId: item.id } });
                });
                cardFooter.appendChild(btnMaint);

                const btnRetire = document.createElement('button');
                btnRetire.classList.add('btn-outline');
                btnRetire.classList.add('btn-danger');
                btnRetire.textContent = 'Vyřadit';
                btnRetire.addEventListener('click', () => {
                    if (confirm(`Opravdu vyřadit "${item.name}"? Tato akce je nevratná.`)) {
                        dispatch({ type: 'DECOMMISSION', payload: { equipmentId: item.id } });
                    }
                });
                cardFooter.appendChild(btnRetire);

            } else if (item.status === 'MAINTENANCE') {
                const btnBack = document.createElement('button');
                btnBack.classList.add('btn-secondary');
                btnBack.textContent = 'Zpět k dispozici';
                btnBack.addEventListener('click', () => {
                    dispatch({ type: 'RETURN_FROM_MAINTENANCE', payload: { equipmentId: item.id } });
                });
                cardFooter.appendChild(btnBack);

            } else if (item.status === 'RENTED') {
                // Správce může nahlásit závadu při vrácení – přechod RENTED → MAINTENANCE
                const btnFault = document.createElement('button');
                btnFault.classList.add('btn-outline');
                btnFault.textContent = 'Hlásit závadu';
                btnFault.addEventListener('click', () => {
                    dispatch({ type: 'SEND_TO_MAINTENANCE', payload: { equipmentId: item.id } });
                });
                cardFooter.appendChild(btnFault);
            }
            // RETIRED: žádná tlačítka (invariant: nelze vrátit do oběhu)

        } else {
            // Zákazník: detail a půjčení
            const btnDetail = document.createElement('button');
            btnDetail.classList.add('btn-outline');
            btnDetail.textContent = 'Detail';
            btnDetail.addEventListener('click', () => {
                dispatch({ type: 'SELECT_EQUIPMENT', payload: { equipmentId: item.id } });
            });
            cardFooter.appendChild(btnDetail);

            const isProcessing = processingIds.includes(item.id);
            const btnRent = document.createElement('button');
            btnRent.classList.add('btn-primary');
            btnRent.textContent = isProcessing ? 'Zpracovávám...' : 'Půjčit';
            btnRent.disabled = isProcessing;
            btnRent.addEventListener('click', () => apiRentEquipment(item.id));
            cardFooter.appendChild(btnRent);
        }

        card.appendChild(cardTop);
        card.appendChild(cardName);
        card.appendChild(cardDesc);
        card.appendChild(cardFooter);
        grid.appendChild(card);
    });

    container.appendChild(grid);
};

// --- DETAIL VYBAVENÍ (zákazník) ---
export const renderEquipmentDetail = (container, equipmentId) => {
    container.replaceChildren();

    const item = getEquipmentById(equipmentId);
    if (!item) {
        container.appendChild(createErrorBanner('Vybavení nenalezeno.'));
        return;
    }

    const processingIds = getProcessingIds();
    const isProcessing = processingIds.includes(item.id);

    const backBtn = document.createElement('button');
    backBtn.classList.add('btn-back');
    backBtn.textContent = '← Zpět do katalogu';
    backBtn.addEventListener('click', () => {
        dispatch({ type: 'DESELECT_EQUIPMENT' });
    });

    const card = document.createElement('div');
    card.classList.add('detail-card');

    const imgPlaceholder = document.createElement('div');
    imgPlaceholder.classList.add('detail-img');
    const imgEmoji = document.createElement('span');
    const emojiMap = { 'Kola': '🚵', 'Lyže': '⛷️', 'Snowboard': '🏂', 'Voda': '🚣' };
    imgEmoji.textContent = emojiMap[item.category] || '🏔️';
    imgPlaceholder.appendChild(imgEmoji);

    const info = document.createElement('div');
    info.classList.add('detail-info');

    const topRow = document.createElement('div');
    topRow.classList.add('detail-top-row');
    const catTag = document.createElement('span');
    catTag.classList.add('category-tag');
    catTag.textContent = item.category;
    topRow.appendChild(catTag);
    topRow.appendChild(createStatusBadge(item.status));

    const name = document.createElement('h2');
    name.classList.add('detail-name');
    name.textContent = item.name;

    const desc = document.createElement('p');
    desc.classList.add('detail-desc');
    desc.textContent = item.description;

    const priceRow = document.createElement('div');
    priceRow.classList.add('detail-price-row');
    const priceLabel = document.createElement('span');
    priceLabel.textContent = 'Cena za den:';
    const priceVal = document.createElement('strong');
    priceVal.textContent = `${item.price} Kč`;
    priceRow.appendChild(priceLabel);
    priceRow.appendChild(priceVal);

    const actions = document.createElement('div');
    actions.classList.add('detail-actions');

    if (item.status === 'AVAILABLE') {
        // Přímé půjčení
        const rentBtn = document.createElement('button');
        rentBtn.classList.add('btn-primary', 'btn-large');
        rentBtn.textContent = isProcessing ? 'Zpracovávám...' : 'Půjčit toto vybavení';
        rentBtn.disabled = isProcessing;
        rentBtn.addEventListener('click', () => apiRentEquipment(item.id));
        actions.appendChild(rentBtn);

        // Rezervace – formulář s výběrem dat
        const reserveTitle = document.createElement('p');
        reserveTitle.classList.add('reserve-title');
        reserveTitle.textContent = 'Nebo si vybavení rezervujte na konkrétní termín:';

        const reserveForm = document.createElement('div');
        reserveForm.classList.add('reserve-form');

        const today = new Date().toISOString().split('T')[0];

        const startLabel = document.createElement('label');
        startLabel.classList.add('reserve-label');
        startLabel.textContent = 'Datum převzetí';
        const startInput = document.createElement('input');
        startInput.type = 'date';
        startInput.min = today;
        startInput.value = today;
        startInput.classList.add('reserve-input');
        startLabel.appendChild(startInput);

        const endLabel = document.createElement('label');
        endLabel.classList.add('reserve-label');
        endLabel.textContent = 'Datum vrácení';
        const endInput = document.createElement('input');
        endInput.type = 'date';
        endInput.min = today;
        endInput.classList.add('reserve-input');
        // Výchozí: o 7 dní od dnes
        const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endInput.value = defaultEnd;
        endLabel.appendChild(endInput);

        const reserveBtn = document.createElement('button');
        reserveBtn.classList.add('btn-secondary');
        reserveBtn.classList.add('reserve-btn-align');
        reserveBtn.textContent = isProcessing ? 'Zpracovávám...' : 'Rezervovat';
        reserveBtn.disabled = isProcessing;
        reserveBtn.addEventListener('click', () => {
            apiReserveEquipment(item.id, startInput.value, endInput.value);
        });

        reserveForm.appendChild(startLabel);
        reserveForm.appendChild(endLabel);
        reserveForm.appendChild(reserveBtn);

        actions.appendChild(reserveTitle);
        actions.appendChild(reserveForm);

    } else {
        const unavailMsg = document.createElement('p');
        unavailMsg.classList.add('unavail-msg');
        const msgMap = {
            RENTED: 'Toto vybavení je momentálně půjčeno.',
            MAINTENANCE: 'Toto vybavení je v údržbě.',
            RETIRED: 'Toto vybavení bylo vyřazeno z provozu.',
        };
        unavailMsg.textContent = msgMap[item.status] || 'Vybavení není dostupné.';
        actions.appendChild(unavailMsg);
    }

    info.appendChild(topRow);
    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(priceRow);
    info.appendChild(actions);

    card.appendChild(imgPlaceholder);
    card.appendChild(info);

    container.appendChild(backBtn);
    container.appendChild(card);
};

// --- VÝPŮJČKY ---
export const renderRentalList = (container) => {
    container.replaceChildren();

    const currentUser = getCurrentUser();
    const isSpravce = currentUser.role === 'SPRAVCE';

    const error = getError();
    if (error) container.appendChild(createErrorBanner(error));

    // --- SEKCE: Čekající rezervace ---
    const reservations = isSpravce
        ? getReservations()
        : getRentalsByUser(currentUser.name).filter(r => r.status === 'RESERVATION');

    if (reservations.length > 0) {
        const resHeader = document.createElement('div');
        resHeader.classList.add('page-header');
        const resTitle = document.createElement('h2');
        resTitle.textContent = 'Rezervace čekající na převzetí';
        const resCount = document.createElement('span');
        resCount.classList.add('item-count');
        resCount.textContent = `${reservations.length}`;
        resHeader.appendChild(resTitle);
        resHeader.appendChild(resCount);
        container.appendChild(resHeader);

        const resList = document.createElement('div');
        resList.classList.add('rental-list');
        const processingIds = getProcessingIds();
        reservations.forEach(rental => {
            resList.appendChild(createRentalRow(rental, processingIds, isSpravce));
        });
        container.appendChild(resList);
    }

    // --- SEKCE: Aktivní výpůjčky ---
    const header = document.createElement('div');
    header.classList.add('page-header');
    if (reservations.length > 0) header.classList.add('section-gap');
    const title = document.createElement('h2');
    title.textContent = isSpravce ? 'Aktivní výpůjčky' : 'Moje výpůjčky';
    header.appendChild(title);
    container.appendChild(header);

    const activeRentals = isSpravce
        ? getActiveRentals()
        : getRentalsByUser(currentUser.name).filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE');

    if (activeRentals.length === 0) {
        const empty = document.createElement('p');
        empty.classList.add('empty-msg');
        empty.textContent = isSpravce ? 'Žádné aktivní výpůjčky.' : 'Nemáte žádné aktivní výpůjčky.';
        container.appendChild(empty);
    } else {
        const list = document.createElement('div');
        list.classList.add('rental-list');
        const processingIds = getProcessingIds();
        activeRentals.forEach(rental => {
            list.appendChild(createRentalRow(rental, processingIds, isSpravce));
        });
        container.appendChild(list);
    }

    // --- SEKCE: Historie (RETURNED) ---
    const historyRentals = isSpravce
        ? getRentalHistory().filter(r => r.status === 'RETURNED')
        : getRentalsByUser(currentUser.name).filter(r => r.status === 'RETURNED');

    if (historyRentals.length > 0) {
        const histHeader = document.createElement('div');
        histHeader.classList.add('page-header', 'section-gap');
        const histTitle = document.createElement('h3');
        histTitle.textContent = 'Historie výpůjček';
        histHeader.appendChild(histTitle);
        container.appendChild(histHeader);

        const histList = document.createElement('div');
        histList.classList.add('rental-list');
        historyRentals.forEach(rental => {
            histList.appendChild(createRentalRow(rental, [], false));
        });
        container.appendChild(histList);
    }

    // --- SEKCE: Zrušené rezervace (jen zákazník nebo správce) ---
    const cancelledRentals = isSpravce
        ? getCancelledRentals()
        : getRentalsByUser(currentUser.name).filter(r => r.status === 'CANCELLED');

    if (cancelledRentals.length > 0) {
        const cancelHeader = document.createElement('div');
        cancelHeader.classList.add('page-header', 'section-gap');
        const cancelTitle = document.createElement('h3');
        cancelTitle.textContent = 'Zrušené rezervace';
        cancelHeader.appendChild(cancelTitle);
        container.appendChild(cancelHeader);

        const cancelList = document.createElement('div');
        cancelList.classList.add('rental-list');
        cancelledRentals.forEach(rental => {
            cancelList.appendChild(createRentalRow(rental, [], false));
        });
        container.appendChild(cancelList);
    }
};

// Helper: jeden řádek výpůjčky / rezervace
const createRentalRow = (rental, processingIds, showActions) => {
    const row = document.createElement('div');
    row.classList.add('rental-row');

    const eq = getEquipmentById(rental.equipmentId);
    const eqName = eq ? eq.name : 'Neznámé vybavení';

    const left = document.createElement('div');
    left.classList.add('rental-left');

    const name = document.createElement('strong');
    name.textContent = eqName;

    const meta = document.createElement('span');
    meta.classList.add('rental-meta');

    let metaText = `${rental.customerName} · od ${rental.startDate}`;
    if (rental.plannedReturnDate) metaText += ` → plán. vrácení ${rental.plannedReturnDate}`;
    if (rental.endDate) metaText += ` · vráceno ${rental.endDate}`;
    meta.textContent = metaText;

    left.appendChild(name);
    left.appendChild(meta);

    // Cena výpůjčky
    if (rental.status === 'RETURNED' || rental.status === 'ACTIVE' || rental.status === 'OVERDUE') {
        const priceInfo = document.createElement('span');
        priceInfo.classList.add('rental-meta');
        const total = getRentalTotalPrice(rental);
        const { overdueDays, penaltyFee } = getRentalPenaltyInfo(rental);
        let priceText = `Cena: ${total} Kč`;
        if (penaltyFee > 0) {
            priceText += ` + penále ${penaltyFee} Kč (${overdueDays} dní po splatnosti)`;
        }
        if (rental.status === 'RETURNED' && rental.totalPrice !== null) {
            priceText = `Zaplaceno: ${rental.totalPrice} Kč`;
            if (rental.penaltyFee > 0) priceText += ` + penále ${rental.penaltyFee} Kč`;
        }
        priceInfo.textContent = priceText;
        left.appendChild(priceInfo);
    }

    const right = document.createElement('div');
    right.classList.add('rental-right');
    right.appendChild(createRentalBadge(rental));

    const currentUser = getCurrentUser();
    const isSpravceUser = currentUser && currentUser.role === 'SPRAVCE';
    const isProcessing = processingIds.includes(rental.id);

    if (isSpravceUser) {
        // Správce: potvrdit převzetí rezervace (RESERVATION → ACTIVE)
        if (rental.status === 'RESERVATION') {
            const btnHandover = document.createElement('button');
            btnHandover.classList.add('btn-primary');
            btnHandover.textContent = 'Potvrdit převzetí';
            btnHandover.disabled = isProcessing;
            btnHandover.addEventListener('click', () => {
                dispatch({ type: 'HANDOVER', payload: { rentalId: rental.id } });
            });
            right.appendChild(btnHandover);
        }

        // Správce: vrácení se závadou (equipment → MAINTENANCE)
        if (rental.status === 'ACTIVE' || rental.status === 'OVERDUE') {
            const btnFaultReturn = document.createElement('button');
            btnFaultReturn.classList.add('btn-outline');
            btnFaultReturn.textContent = 'Vrátit se závadou';
            btnFaultReturn.disabled = isProcessing;
            btnFaultReturn.addEventListener('click', () => apiReturnEquipment(rental.id, true));
            right.appendChild(btnFaultReturn);
        }
    }

    if (!isSpravceUser) {
        // Zákazník: zrušení vlastní rezervace (RESERVATION → CANCELLED)
        if (rental.status === 'RESERVATION') {
            const btnCancel = document.createElement('button');
            btnCancel.classList.add('btn-outline');
            btnCancel.classList.add('btn-danger');
            btnCancel.textContent = 'Zrušit rezervaci';
            btnCancel.disabled = isProcessing;
            btnCancel.addEventListener('click', () => apiCancelReservation(rental.id));
            right.appendChild(btnCancel);
        }
    }

    // Oba: vrácení vlastní výpůjčky (ACTIVE/OVERDUE → RETURNED)
    if (rental.status === 'ACTIVE' || rental.status === 'OVERDUE') {
        const btnReturn = document.createElement('button');
        btnReturn.classList.add('btn-secondary');
        btnReturn.textContent = isProcessing ? 'Odesílám...' : 'Vrátit';
        btnReturn.disabled = isProcessing;
        btnReturn.addEventListener('click', () => apiReturnEquipment(rental.id, false));
        right.appendChild(btnReturn);
    }

    row.appendChild(left);
    row.appendChild(right);
    return row;
};