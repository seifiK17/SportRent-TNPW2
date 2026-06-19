// api.js
// IR03 – Asynchronní operace a side-effects

import { dispatch } from './store.js';

// Přímé půjčení (bez rezervace) – RENTAL_PENDING → RENTAL_SUCCESS
export const apiRentEquipment = (equipmentId) => {
    dispatch({ type: 'RENTAL_PENDING', payload: { id: equipmentId } });

    setTimeout(() => {
        dispatch({ type: 'RENTAL_SUCCESS', payload: { equipmentId } });
    }, 1200);
};

// Vrácení výpůjčky – RETURN_PENDING → RETURN_SUCCESS
// withFault: true = vybavení jde do MAINTENANCE (nahlášena závada při checkin)
export const apiReturnEquipment = (rentalId, withFault = false) => {
    dispatch({ type: 'RETURN_PENDING', payload: { id: rentalId } });

    setTimeout(() => {
        dispatch({ type: 'RETURN_SUCCESS', payload: { rentalId, withFault } });
    }, 1000);
};

// Vytvoření rezervace – RESERVATION_PENDING → RESERVATION_SUCCESS
// RentalContract: vstup do stavu RESERVATION
export const apiReserveEquipment = (equipmentId, plannedStartDate, plannedReturnDate) => {
    dispatch({ type: 'RESERVATION_PENDING', payload: { id: equipmentId } });

    setTimeout(() => {
        dispatch({
            type: 'RESERVATION_SUCCESS',
            payload: { equipmentId, plannedStartDate, plannedReturnDate }
        });
    }, 1000);
};

// Zrušení rezervace – CANCEL_PENDING → CANCEL_SUCCESS
// RentalContract: RESERVATION → CANCELLED
export const apiCancelReservation = (rentalId) => {
    dispatch({ type: 'CANCEL_PENDING', payload: { id: rentalId } });

    setTimeout(() => {
        dispatch({ type: 'CANCEL_SUCCESS', payload: { rentalId } });
    }, 800);
};

// Spuštění systémové kontroly deadlinů (ACTIVE → OVERDUE)
// Voláno např. při každém načtení stránky výpůjček
export const apiCheckDeadlines = () => {
    dispatch({ type: 'CHECK_DEADLINES' });
};