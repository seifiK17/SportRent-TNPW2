// store.js

// IR08 – Hardcoded uživatelé (simulovaná autentizace)
const USERS = [
    { username: 'franta', password: 'heslo123', role: 'ZAKAZNIK', name: 'Franta Novák' },
    { username: 'jana', password: 'heslo123', role: 'ZAKAZNIK', name: 'Jana Dvořáková' },
    { username: 'admin', password: 'admin123', role: 'SPRAVCE', name: 'Admin Správce' },
];

// Penále za den po splatnosti (Kč)
export const OVERDUE_FEE_PER_DAY = 150;

// IR01 – Centrální stav aplikace
let state = {
    currentUser: null,      // null = nepřihlášen
    isLoggedIn: false,
    authError: null,

    equipment: [
        { id: 'eq1', name: 'Horská elektrokola', status: 'AVAILABLE', price: 650, category: 'Kola', description: 'Moderní elektrokolo s dojezdem až 80 km. Vhodné pro náročné terény a dlouhé výlety.' },
        { id: 'eq2', name: 'Sjezdové lyže', status: 'RENTED', price: 450, category: 'Lyže', description: 'Profesionální sjezdové lyže délky 170 cm. Zahrnuje vázání a seřízení.' },
        { id: 'eq3', name: 'Snowboard', status: 'MAINTENANCE', price: 400, category: 'Snowboard', description: 'All-mountain snowboard pro začátečníky i pokročilé. Délka 155 cm.' },
        { id: 'eq4', name: 'Trekingová kola', status: 'AVAILABLE', price: 350, category: 'Kola', description: 'Odolná kola pro dlouhé túry po stezkách a cestách. 21 rychlostí.' },
        { id: 'eq5', name: 'Běžecké lyže', status: 'AVAILABLE', price: 300, category: 'Lyže', description: 'Klasické běžecké lyže s holemi a botami. Sada pro dospělé.' },
        { id: 'eq6', name: 'Kajak', status: 'AVAILABLE', price: 500, category: 'Voda', description: 'Jednomístný kajak pro klidné vody i mírné peřeje. Včetně pádla a vesty.' },
        { id: 'eq7', name: 'Stand-up paddleboard', status: 'RENTED', price: 380, category: 'Voda', description: 'Nafukovací SUP prkno s pádlem a pumpou. Nosnost 120 kg.' },
        { id: 'eq8', name: 'Horské kolo MTB', status: 'AVAILABLE', price: 420, category: 'Kola', description: 'Hardtail MTB s odpruženou vidlicí. Vhodné pro cross-country i trail.' },
    ],

    // Stavy výpůjčky: RESERVATION | ACTIVE | RETURNED | OVERDUE | CANCELLED
    rentals: [
        { id: 'r1', equipmentId: 'eq2', customerName: 'Karel', status: 'ACTIVE', startDate: '2026-04-20', endDate: null, plannedReturnDate: '2026-04-27', totalPrice: null, penaltyFee: null },
        { id: 'r2', equipmentId: 'eq7', customerName: 'Jana Dvořáková', status: 'ACTIVE', startDate: '2026-04-10', endDate: null, plannedReturnDate: '2026-04-17', totalPrice: null, penaltyFee: null },
        { id: 'r3', equipmentId: 'eq4', customerName: 'Franta Novák', status: 'RETURNED', startDate: '2026-04-10', endDate: '2026-04-12', plannedReturnDate: '2026-04-12', totalPrice: 700, penaltyFee: 0 },
        { id: 'r4', equipmentId: 'eq1', customerName: 'Franta Novák', status: 'RETURNED', startDate: '2026-04-01', endDate: '2026-04-03', plannedReturnDate: '2026-04-03', totalPrice: 1300, penaltyFee: 0 },
    ],

    selectedEquipmentId: null,  // pro detail vybavení
    error: null,
    processingIds: []
};

export const getState = () => state;

const listeners = [];
export const subscribe = (listener) => listeners.push(listener);
const notifyListeners = () => listeners.forEach(listener => listener());

// Pomocná funkce: výpočet počtu dní mezi dvěma daty
const daysBetween = (dateStrA, dateStrB) => {
    const a = new Date(dateStrA);
    const b = new Date(dateStrB);
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
};

// Pomocná funkce: výpočet celkové ceny výpůjčky (bez penále)
const calcTotalPrice = (rental, equipmentList) => {
    const eq = equipmentList.find(e => e.id === rental.equipmentId);
    if (!eq) return 0;
    const returnDate = rental.endDate || new Date().toISOString().split('T')[0];
    const days = Math.max(1, daysBetween(rental.startDate, returnDate));
    return eq.price * days;
};

// Pomocná funkce: výpočet penále za zpoždění
const calcPenalty = (rental) => {
    if (!rental.plannedReturnDate) return 0;
    const returnDate = rental.endDate || new Date().toISOString().split('T')[0];
    const overdueDays = Math.max(0, daysBetween(rental.plannedReturnDate, returnDate));
    return overdueDays * OVERDUE_FEE_PER_DAY;
};

// IR02 – Dispatcher / Interpretace akcí
export const dispatch = (action) => {
    console.log("Přijata akce:", action.type);

    let newState = { ...state, error: null };

    switch (action.type) {

        // --- IR08: PŘIHLÁŠENÍ ---
        case 'LOGIN': {
            const { username, password } = action.payload;
            const user = USERS.find(u => u.username === username && u.password === password);
            if (!user) {
                newState.authError = 'Špatné jméno nebo heslo.';
                break;
            }
            newState.currentUser = { role: user.role, name: user.name, username: user.username };
            newState.isLoggedIn = true;
            newState.authError = null;
            break;
        }

        // --- IR08: ODHLÁŠENÍ ---
        case 'LOGOUT': {
            newState.currentUser = null;
            newState.isLoggedIn = false;
            newState.selectedEquipmentId = null;
            break;
        }

        // --- NAVIGACE NA DETAIL ---
        case 'SELECT_EQUIPMENT': {
            newState.selectedEquipmentId = action.payload.equipmentId;
            break;
        }

        case 'DESELECT_EQUIPMENT': {
            newState.selectedEquipmentId = null;
            break;
        }

        // --- ASYNCHRONNÍ FÁZE 1: ČEKÁNÍ ---
        case 'RENTAL_PENDING':
        case 'RETURN_PENDING':
        case 'RESERVATION_PENDING':
        case 'CANCEL_PENDING':
            newState.processingIds = [...newState.processingIds, action.payload.id];
            break;

        // --- REZERVACE: Vytvoření rezervace (RESERVATION stav) ---
        // RentalContract: RESERVATION je počáteční stav před aktivní výpůjčkou
        case 'RESERVATION_SUCCESS': {
            const { equipmentId, plannedStartDate, plannedReturnDate } = action.payload;
            newState.processingIds = newState.processingIds.filter(id => id !== equipmentId);

            const item = newState.equipment.find(e => e.id === equipmentId);
            if (!item || item.status !== 'AVAILABLE') {
                newState.error = 'Vybavení není dostupné pro rezervaci.';
                break;
            }

            // Validace časového konfliktu: plannedReturnDate musí být po plannedStartDate
            if (plannedStartDate >= plannedReturnDate) {
                newState.error = 'Datum vrácení musí být po datu zahájení.';
                break;
            }

            // Validace konfliktu s existujícími rezervacemi pro stejné vybavení
            const hasConflict = newState.rentals.some(r =>
                r.equipmentId === equipmentId &&
                (r.status === 'RESERVATION' || r.status === 'ACTIVE') &&
                r.plannedReturnDate > plannedStartDate &&
                r.startDate < plannedReturnDate
            );
            if (hasConflict) {
                newState.error = 'Vybavení je v tomto termínu již rezervováno.';
                break;
            }

            const newReservation = {
                id: 'r_' + Date.now(),
                equipmentId,
                customerName: newState.currentUser.name,
                status: 'RESERVATION',
                startDate: plannedStartDate,
                endDate: null,
                plannedReturnDate,
                totalPrice: null,
                penaltyFee: null,
            };
            newState.rentals = [...newState.rentals, newReservation];
            newState.selectedEquipmentId = null;
            break;
        }

        // --- REZERVACE → ACTIVE: Převzetí vybavení zákazníkem (handover) ---
        // RentalContract: RESERVATION → ACTIVE (podmínka: start termínu)
        case 'HANDOVER': {
            const { rentalId } = action.payload;
            if (newState.currentUser.role !== 'SPRAVCE') {
                newState.error = 'Pouze správce může potvrdit předání vybavení.';
                break;
            }
            const rental = newState.rentals.find(r => r.id === rentalId);
            if (!rental || rental.status !== 'RESERVATION') {
                newState.error = 'Rezervace nenalezena nebo není ve stavu RESERVATION.';
                break;
            }
            newState.rentals = newState.rentals.map(r =>
                r.id === rentalId ? { ...r, status: 'ACTIVE', startDate: new Date().toISOString().split('T')[0] } : r
            );
            newState.equipment = newState.equipment.map(e =>
                e.id === rental.equipmentId ? { ...e, status: 'RENTED' } : e
            );
            break;
        }

        // --- REZERVACE → CANCELLED: Zrušení rezervace ---
        // RentalContract: RESERVATION → CANCELLED (podmínka: před začátkem termínu)
        case 'CANCEL_SUCCESS': {
            const { rentalId } = action.payload;
            newState.processingIds = newState.processingIds.filter(id => id !== rentalId);
            const rental = newState.rentals.find(r => r.id === rentalId);
            if (!rental || rental.status !== 'RESERVATION') {
                newState.error = 'Lze zrušit pouze rezervace ve stavu RESERVATION.';
                break;
            }
            newState.rentals = newState.rentals.map(r =>
                r.id === rentalId ? { ...r, status: 'CANCELLED' } : r
            );
            break;
        }

        // --- ASYNCHRONNÍ FÁZE 2: ÚSPĚCH PŮJČENÍ (přímé půjčení bez rezervace) ---
        case 'RENTAL_SUCCESS': {
            const { equipmentId } = action.payload;
            newState.processingIds = newState.processingIds.filter(id => id !== equipmentId);
            const item = newState.equipment.find(e => e.id === equipmentId);

            if (!item || item.status !== 'AVAILABLE') {
                newState.error = 'Vybavení není dostupné.';
                break;
            }

            newState.equipment = newState.equipment.map(e =>
                e.id === equipmentId ? { ...e, status: 'RENTED' } : e
            );

            const today = new Date().toISOString().split('T')[0];
            // Výchozí plannedReturnDate: 7 dní od dnes
            const defaultReturn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const newRental = {
                id: 'r_' + Date.now(),
                equipmentId,
                customerName: newState.currentUser.name,
                status: 'ACTIVE',
                startDate: today,
                endDate: null,
                plannedReturnDate: defaultReturn,
                totalPrice: null,
                penaltyFee: null,
            };
            newState.rentals = [...newState.rentals, newRental];
            newState.selectedEquipmentId = null;
            break;
        }

        // --- ASYNCHRONNÍ FÁZE 2: ÚSPĚCH VRÁCENÍ ---
        // RentalContract: ACTIVE → RETURNED nebo OVERDUE → RETURNED
        case 'RETURN_SUCCESS': {
            const { rentalId, withFault } = action.payload;
            newState.processingIds = newState.processingIds.filter(id => id !== rentalId);
            const rental = newState.rentals.find(r => r.id === rentalId);

            if (!rental || (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE')) {
                newState.error = 'Výpůjčka nenalezena nebo ji nelze vrátit.';
                break;
            }

            const today = new Date().toISOString().split('T')[0];
            const totalPrice = calcTotalPrice(
                { ...rental, endDate: today },
                newState.equipment
            );
            const penaltyFee = calcPenalty({ ...rental, endDate: today });

            newState.rentals = newState.rentals.map(r =>
                r.id === rentalId
                    ? { ...r, status: 'RETURNED', endDate: today, totalPrice, penaltyFee }
                    : r
            );

            // EquipmentItem: RENTED → AVAILABLE nebo RENTED → MAINTENANCE (pokud je hlášena závada)
            const newEquipmentStatus = withFault ? 'MAINTENANCE' : 'AVAILABLE';
            newState.equipment = newState.equipment.map(e =>
                e.id === rental.equipmentId ? { ...e, status: newEquipmentStatus } : e
            );
            break;
        }

        // --- SYSTÉMOVÁ AKCE: Označení výpůjček jako OVERDUE ---
        // RentalContract: ACTIVE → OVERDUE (systém: check_deadline)
        case 'CHECK_DEADLINES': {
            const today = new Date().toISOString().split('T')[0];
            newState.rentals = newState.rentals.map(r => {
                if (r.status === 'ACTIVE' && r.plannedReturnDate && r.plannedReturnDate < today) {
                    return { ...r, status: 'OVERDUE' };
                }
                return r;
            });
            break;
        }

        // --- SPRÁVCE: VYŘAZENÍ VYBAVENÍ ---
        // EquipmentItem: AVAILABLE → RETIRED (invariant: RETIRED nelze nikdy vrátit do oběhu)
        case 'DECOMMISSION': {
            const { equipmentId } = action.payload;
            if (newState.currentUser.role !== 'SPRAVCE') {
                newState.error = 'Nedostatečná oprávnění!';
                break;
            }
            const item = newState.equipment.find(e => e.id === equipmentId);
            if (!item || item.status === 'RETIRED') {
                newState.error = 'Vybavení nelze vyřadit (již vyřazeno nebo neexistuje).';
                break;
            }
            if (item.status === 'RENTED') {
                newState.error = 'Nelze vyřadit vybavení, které je aktuálně půjčeno.';
                break;
            }
            newState.equipment = newState.equipment.map(e =>
                e.id === equipmentId ? { ...e, status: 'RETIRED' } : e
            );
            break;
        }

        // --- BUSINESS LOGIKA: SPRÁVCE DÁVÁ VYBAVENÍ DO ÚDRŽBY ---
        // EquipmentItem: AVAILABLE → MAINTENANCE nebo RENTED → MAINTENANCE (při nahlášení závady při checkin)
        case 'SEND_TO_MAINTENANCE': {
            const { equipmentId } = action.payload;
            if (newState.currentUser.role !== 'SPRAVCE') {
                newState.error = 'Nedostatečná oprávnění! Pouze správce může upravovat stav vybavení.';
                break;
            }
            const item = newState.equipment.find(e => e.id === equipmentId);
            // Invariant: RETIRED nelze dát do údržby
            if (!item || item.status === 'RETIRED') {
                newState.error = 'Vyřazené vybavení nelze poslat do údržby.';
                break;
            }
            if (item.status !== 'AVAILABLE' && item.status !== 'RENTED') {
                newState.error = 'Vybavení nelze přesunout do údržby z aktuálního stavu.';
                break;
            }
            newState.equipment = newState.equipment.map(e =>
                e.id === equipmentId ? { ...e, status: 'MAINTENANCE' } : e
            );
            break;
        }

        // --- BUSINESS LOGIKA: SPRÁVCE VRACÍ VYBAVENÍ Z ÚDRŽBY ---
        // EquipmentItem: MAINTENANCE → AVAILABLE
        case 'RETURN_FROM_MAINTENANCE': {
            const { equipmentId } = action.payload;
            if (newState.currentUser.role !== 'SPRAVCE') {
                newState.error = 'Nedostatečná oprávnění!';
                break;
            }
            const item = newState.equipment.find(e => e.id === equipmentId);
            // Invariant: RETIRED nelze vrátit do oběhu
            if (!item || item.status === 'RETIRED') {
                newState.error = 'Vyřazené vybavení nelze vrátit do provozu.';
                break;
            }
            if (item.status !== 'MAINTENANCE') {
                newState.error = 'Vybavení není v údržbě.';
                break;
            }
            newState.equipment = newState.equipment.map(e =>
                e.id === equipmentId ? { ...e, status: 'AVAILABLE' } : e
            );
            break;
        }

        default:
            return;
    }

    state = newState;
    notifyListeners();
};