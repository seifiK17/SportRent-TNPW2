// selectors.js
// IR05 – Výběr a transformace dat ze stavu pro UI

import { getState, OVERDUE_FEE_PER_DAY } from './store.js';

export const getIsLoggedIn = () => getState().isLoggedIn;

export const getCurrentUser = () => getState().currentUser;

export const getAuthError = () => getState().authError;

export const getError = () => getState().error;

export const getProcessingIds = () => getState().processingIds;

export const getSelectedEquipmentId = () => getState().selectedEquipmentId;

// Zákazník vidí pouze AVAILABLE
export const getAvailableEquipment = () =>
    getState().equipment.filter(item => item.status === 'AVAILABLE');

// Správce vidí vše
export const getAllEquipment = () => getState().equipment;

export const getEquipmentById = (id) =>
    getState().equipment.find(e => e.id === id);

// Pouze aktivní výpůjčky (ACTIVE + OVERDUE)
export const getActiveRentals = () =>
    getState().rentals.filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE');

// Pouze rezervace čekající na převzetí
export const getReservations = () =>
    getState().rentals.filter(r => r.status === 'RESERVATION');

// Po splatnosti (OVERDUE)
export const getOverdueRentals = () =>
    getState().rentals.filter(r => r.status === 'OVERDUE');

// Zrušené rezervace
export const getCancelledRentals = () =>
    getState().rentals.filter(r => r.status === 'CANCELLED');

// Celá historie (vrácené)
export const getRentalHistory = () => getState().rentals;

// Výpůjčky konkrétního zákazníka
export const getRentalsByUser = (customerName) =>
    getState().rentals.filter(r => r.customerName === customerName);

// Pomocný selektor: vypočítá počet dní prodlení a výši penále pro danou výpůjčku
export const getRentalPenaltyInfo = (rental) => {
    if (!rental.plannedReturnDate) return { overdueDays: 0, penaltyFee: 0 };
    const today = new Date().toISOString().split('T')[0];
    const compareDate = rental.endDate || today;
    const overdueDays = Math.max(0, Math.floor(
        (new Date(compareDate) - new Date(rental.plannedReturnDate)) / (1000 * 60 * 60 * 24)
    ));
    return {
        overdueDays,
        penaltyFee: overdueDays * OVERDUE_FEE_PER_DAY,
    };
};

// Pomocný selektor: celková cena výpůjčky dle délky trvání
export const getRentalTotalPrice = (rental) => {
    if (rental.totalPrice !== null && rental.totalPrice !== undefined) return rental.totalPrice;
    const eq = getEquipmentById(rental.equipmentId);
    if (!eq) return 0;
    const today = new Date().toISOString().split('T')[0];
    const returnDate = rental.endDate || today;
    const days = Math.max(1, Math.floor(
        (new Date(returnDate) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24)
    ));
    return eq.price * days;
};

// Kontrola, zda existuje časový konflikt rezervace pro dané vybavení
export const hasReservationConflict = (equipmentId, plannedStartDate, plannedReturnDate, excludeRentalId = null) =>
    getState().rentals.some(r =>
        r.equipmentId === equipmentId &&
        r.id !== excludeRentalId &&
        (r.status === 'RESERVATION' || r.status === 'ACTIVE') &&
        r.plannedReturnDate > plannedStartDate &&
        r.startDate < plannedReturnDate
    );