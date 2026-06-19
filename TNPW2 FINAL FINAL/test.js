import { dispatch, getState } from './store.js';
 
console.log("=== SPUŠTĚNÍ TESTOVACÍCH SCÉNÁŘŮ ===\n");
 
// --- TEST 1: Přihlášení zákazníka ---
console.log("TEST 1: Přihlášení zákazníka (správné heslo)");
dispatch({ type: 'LOGIN', payload: { username: 'franta', password: 'heslo123' } });
const afterLogin = getState();
console.log(`isLoggedIn: ${afterLogin.isLoggedIn} (Očekáváno: true)`);
console.log(`role: ${afterLogin.currentUser.role} (Očekáváno: ZAKAZNIK)`);
console.assert(afterLogin.isLoggedIn === true, "CHYBA: Přihlášení selhalo!");
console.assert(afterLogin.currentUser.role === 'ZAKAZNIK', "CHYBA: Špatná role!");
 
// --- TEST 2: Přihlášení se špatným heslem ---
console.log("\nTEST 2: Přihlášení se špatným heslem");
dispatch({ type: 'LOGIN', payload: { username: 'franta', password: 'spatne' } });
const afterBadLogin = getState();
console.log(`authError: ${afterBadLogin.authError} (Očekáváno: nenulové)`);
console.assert(afterBadLogin.authError !== null, "CHYBA: Chyba by měla být nastavena!");
 
// --- TEST 3: Správce posílá vybavení do údržby (z AVAILABLE) ---
console.log("\nTEST 3: Správce posílá vybavení do údržby");
dispatch({ type: 'LOGIN', payload: { username: 'admin', password: 'admin123' } });
const eqBefore = getState().equipment.find(e => e.id === 'eq1');
console.log(`Stav eq1 před: ${eqBefore.status} (Očekáváno: AVAILABLE)`);
dispatch({ type: 'SEND_TO_MAINTENANCE', payload: { equipmentId: 'eq1' } });
const eqAfter = getState().equipment.find(e => e.id === 'eq1');
console.log(`Stav eq1 po: ${eqAfter.status} (Očekáváno: MAINTENANCE)`);
console.assert(eqAfter.status === 'MAINTENANCE', "CHYBA: Vybavení se nepřesunulo do údržby!");
 
// --- TEST 3b: Správce posílá vybavení do údržby (z RENTED – při nahlášení závady) ---
console.log("\nTEST 3b: Správce posílá RENTED vybavení do údržby (závada při vrácení)");
const rentedEq = getState().equipment.find(e => e.id === 'eq2');
console.log(`Stav eq2 před: ${rentedEq.status} (Očekáváno: RENTED)`);
dispatch({ type: 'SEND_TO_MAINTENANCE', payload: { equipmentId: 'eq2' } });
const rentedEqAfter = getState().equipment.find(e => e.id === 'eq2');
console.log(`Stav eq2 po: ${rentedEqAfter.status} (Očekáváno: MAINTENANCE)`);
console.assert(rentedEqAfter.status === 'MAINTENANCE', "CHYBA: RENTED vybavení se nepřesunulo do údržby!");
 
// --- TEST 4: Zákazník nemůže provést údržbu ---
console.log("\nTEST 4: Zákazník nemůže dát vybavení do údržby");
dispatch({ type: 'LOGIN', payload: { username: 'franta', password: 'heslo123' } });
dispatch({ type: 'SEND_TO_MAINTENANCE', payload: { equipmentId: 'eq4' } });
const eq4 = getState().equipment.find(e => e.id === 'eq4');
console.log(`Stav eq4: ${eq4.status} (Očekáváno: AVAILABLE – zákazník nesmí měnit)`);
console.log(`Chyba: ${getState().error}`);
console.assert(eq4.status === 'AVAILABLE', "CHYBA: Zákazník neměl mít přístup!");
 
// --- TEST 5: Vrácení výpůjčky ---
console.log("\nTEST 5: Vrácení výpůjčky");
dispatch({ type: 'LOGIN', payload: { username: 'admin', password: 'admin123' } });
const rentalBefore = getState().rentals.find(r => r.id === 'r1');
console.log(`Stav výpůjčky r1 před: ${rentalBefore.status} (Očekáváno: ACTIVE)`);
dispatch({ type: 'RETURN_SUCCESS', payload: { rentalId: 'r1', withFault: false } });
const rentalAfter = getState().rentals.find(r => r.id === 'r1');
console.log(`Stav výpůjčky r1 po: ${rentalAfter.status} (Očekáváno: RETURNED)`);
console.log(`Celková cena: ${rentalAfter.totalPrice} Kč`);
console.assert(rentalAfter.status === 'RETURNED', "CHYBA: Výpůjčka nebyla uzavřena!");
console.assert(rentalAfter.totalPrice !== null, "CHYBA: Cena by měla být vypočtena!");
 
// --- TEST 5b: Vrácení s nahlášenou závadou → vybavení jde do MAINTENANCE ---
console.log("\nTEST 5b: Vrácení výpůjčky se závadou (RENTED → MAINTENANCE)");
const r2Before = getState().rentals.find(r => r.id === 'r2');
console.log(`Stav r2 před: ${r2Before.status} (Očekáváno: ACTIVE)`);
dispatch({ type: 'RETURN_SUCCESS', payload: { rentalId: 'r2', withFault: true } });
const r2After = getState().rentals.find(r => r.id === 'r2');
const eq7After = getState().equipment.find(e => e.id === 'eq7');
console.log(`Stav r2 po: ${r2After.status} (Očekáváno: RETURNED)`);
console.log(`Stav eq7 po: ${eq7After.status} (Očekáváno: MAINTENANCE)`);
console.assert(r2After.status === 'RETURNED', "CHYBA: Výpůjčka nebyla uzavřena!");
console.assert(eq7After.status === 'MAINTENANCE', "CHYBA: Vybavení mělo jít do údržby!");
 
// --- TEST 6: Rezervace – validace termínu ---
console.log("\nTEST 6: Rezervace s neplatným termínem (endDate <= startDate)");
dispatch({ type: 'LOGIN', payload: { username: 'franta', password: 'heslo123' } });
dispatch({
    type: 'RESERVATION_SUCCESS',
    payload: { equipmentId: 'eq4', plannedStartDate: '2026-05-10', plannedReturnDate: '2026-05-05' }
});
console.log(`Chyba: ${getState().error} (Očekáváno: nenulová)`);
console.assert(getState().error !== null, "CHYBA: Měla by být nahlášena chyba termínu!");
 
// --- TEST 7: Rezervace – validní termín ---
console.log("\nTEST 7: Rezervace s platným termínem");
dispatch({
    type: 'RESERVATION_SUCCESS',
    payload: { equipmentId: 'eq4', plannedStartDate: '2026-05-10', plannedReturnDate: '2026-05-15' }
});
const reservations = getState().rentals.filter(r => r.status === 'RESERVATION');
console.log(`Počet rezervací: ${reservations.length} (Očekáváno: >= 1)`);
console.assert(reservations.length >= 1, "CHYBA: Rezervace nebyla vytvořena!");
 
// --- TEST 8: Zrušení rezervace ---
console.log("\nTEST 8: Zrušení rezervace");
const myReservation = getState().rentals.find(r => r.status === 'RESERVATION' && r.customerName === 'Franta Novák');
console.log(`Rezervace k zrušení: ${myReservation ? myReservation.id : 'nenalezena'}`);
if (myReservation) {
    dispatch({ type: 'CANCEL_SUCCESS', payload: { rentalId: myReservation.id } });
    const cancelledRes = getState().rentals.find(r => r.id === myReservation.id);
    console.log(`Stav po zrušení: ${cancelledRes.status} (Očekáváno: CANCELLED)`);
    console.assert(cancelledRes.status === 'CANCELLED', "CHYBA: Rezervace nebyla zrušena!");
}
 
// --- TEST 9: CHECK_DEADLINES – přechod ACTIVE → OVERDUE ---
console.log("\nTEST 9: Systémová kontrola deadlinů (ACTIVE → OVERDUE)");
dispatch({ type: 'LOGIN', payload: { username: 'admin', password: 'admin123' } });
// Přidáme výpůjčku s prošlým termínem přímo přes RENTAL_SUCCESS + manuální úprava přes akci
dispatch({
    type: 'RENTAL_SUCCESS',
    payload: { equipmentId: 'eq5' }
});
// Pozn.: V reálné aplikaci by se datum nastavovalo při vytvoření. Pro test simulujeme
// stav ručně přes CHECK_DEADLINES – výpůjčky r2 (Jana) mají plannedReturnDate v minulosti
const r2beforeCheck = getState().rentals.find(r => r.id === 'r2');
console.log(`r2 před CHECK_DEADLINES: ${r2beforeCheck ? r2beforeCheck.status : 'nenalezena'}`);
dispatch({ type: 'CHECK_DEADLINES' });
const overdueRentals = getState().rentals.filter(r => r.status === 'OVERDUE');
console.log(`Počet OVERDUE výpůjček po kontrole: ${overdueRentals.length}`);
 
// --- TEST 10: Invariant RETIRED – nelze vrátit do oběhu ---
console.log("\nTEST 10: Invariant RETIRED – nelze vrátit z údržby");
dispatch({ type: 'DECOMMISSION', payload: { equipmentId: 'eq6' } });
const eq6retired = getState().equipment.find(e => e.id === 'eq6');
console.log(`Stav eq6 po vyřazení: ${eq6retired.status} (Očekáváno: RETIRED)`);
console.assert(eq6retired.status === 'RETIRED', "CHYBA: Vyřazení selhalo!");
 
dispatch({ type: 'RETURN_FROM_MAINTENANCE', payload: { equipmentId: 'eq6' } });
const eq6afterReturn = getState().equipment.find(e => e.id === 'eq6');
console.log(`Stav eq6 po pokusu o obnovení: ${eq6afterReturn.status} (Očekáváno: RETIRED – invariant!)`);
console.log(`Chyba: ${getState().error}`);
console.assert(eq6afterReturn.status === 'RETIRED', "CHYBA: RETIRED vybavení nemělo být vráceno do oběhu!");
 
// --- TEST 11: Odhlášení ---
console.log("\nTEST 11: Odhlášení");
dispatch({ type: 'LOGOUT' });
console.log(`isLoggedIn: ${getState().isLoggedIn} (Očekáváno: false)`);
console.assert(getState().isLoggedIn === false, "CHYBA: Odhlášení selhalo!");
 
console.log("\n=== TESTY DOKONČENY ===");