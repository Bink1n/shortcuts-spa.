// ── Service Catalog (shared across all dashboards) ─────────
var SVC_KEY = 'spa_services_catalog';
var DEFAULT_SERVICES = [
    { id: 'svc1', category: 'Facial Treatment', emoji: '', name: 'Shortcuts Customize', price: '₱750', duration: '60 min', bookings: 0 },
    { id: 'svc2', category: 'Facial Treatment', emoji: '', name: 'Galvanic Facial', price: '₱550', duration: '45 min', bookings: 0 },
    { id: 'svc3', category: 'Facial Treatment', emoji: '', name: 'Ultrasonic Facial', price: '₱550', duration: '45 min', bookings: 0 },
    { id: 'svc4', category: 'Facial Treatment', emoji: '', name: 'Deep Facial with Diamond Peel', price: '₱550', duration: '60 min', bookings: 0 },
    { id: 'svc5', category: 'Facial Treatment', emoji: '', name: 'Deep Facial with Acne Treatment', price: '₱600', duration: '60 min', bookings: 0 },
    { id: 'svc6', category: 'Facial Treatment', emoji: '', name: 'Deep Facial with Whitening Facial', price: '₱500', duration: '60 min', bookings: 0 },
    { id: 'svc7', category: 'Microneedling Treatment', emoji: '', name: 'Microneedling with Facial', price: '₱2,000', duration: '90 min', bookings: 0 },
    { id: 'svc8', category: 'Microneedling Treatment', emoji: '', name: 'Scar Removal (depends on size)', price: '₱1,500', duration: '60 min', bookings: 0 },
    { id: 'svc9', category: 'Microneedling Treatment', emoji: '', name: 'Undereye Treatment', price: '₱500', duration: '30 min', bookings: 0 },
    { id: 'svc10', category: 'Microneedling Treatment', emoji: '', name: 'Anti-Aging (Fine Lines, Neck or Forehead)', price: '₱500', duration: '30 min', bookings: 0 },
    { id: 'svc11', category: 'Exilift Treatment', emoji: '', name: 'Face Exilift with Facial', price: '₱2,000', duration: '60 min', bookings: 0 },
    { id: 'svc12', category: 'Exilift Treatment', emoji: '', name: 'Face Exilift Only', price: '₱1,500', duration: '45 min', bookings: 0 },
    { id: 'svc13', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Tummy', price: '₱2,500', duration: '45 min', bookings: 0 },
    { id: 'svc14', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Arms', price: '₱1,500', duration: '30 min', bookings: 0 },
    { id: 'svc15', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Legs', price: '₱2,000', duration: '45 min', bookings: 0 },
    { id: 'svc16', category: 'Exilift Treatment', emoji: '', name: 'Face Exilift (Package)', price: '₱6,500', duration: 'Package', bookings: 0 },
    { id: 'svc17', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Tummy (Package)', price: '₱11,000', duration: 'Package', bookings: 0 },
    { id: 'svc18', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Arms (Package)', price: '₱6,500', duration: 'Package', bookings: 0 },
    { id: 'svc19', category: 'Exilift Treatment', emoji: '', name: 'Exilift – Legs (Package)', price: '₱8,000', duration: 'Package', bookings: 0 },
    { id: 'svc20', category: 'Eyelash Treatment', emoji: '', name: 'Eyelash Perming', price: '₱500', duration: '60 min', bookings: 0 },
    { id: 'svc21', category: 'Eyelash Treatment', emoji: '', name: 'Eyelash Extension (Classic) — +₱300 may apply depending on thickness', price: '₱750', duration: '90 min', bookings: 0 },
    { id: 'svc22', category: 'Eyelash Treatment', emoji: '', name: 'Eyelash Extension (Cat Eye) — +₱300 may apply depending on thickness', price: '₱900', duration: '90 min', bookings: 0 },
    { id: 'svc23', category: 'Eyelash Treatment', emoji: '', name: 'Eyelash Extension (Open Eye) — +₱300 may apply depending on thickness', price: '₱900', duration: '90 min', bookings: 0 },
    { id: 'svc24', category: 'Eyelash Treatment', emoji: '', name: 'Eyelash Extension Removal (depends on thickness)', price: '₱300', duration: '20 min', bookings: 0 },
    { id: 'svc25', category: 'Eyebrow Treatment', emoji: '', name: 'Eyebrow Threading', price: '₱150', duration: '15 min', bookings: 0 },
    { id: 'svc26', category: 'Eyebrow Treatment', emoji: '', name: 'Eyebrow Shading (2 Sessions)', price: '₱2,500', duration: '60 min', bookings: 0 },
    { id: 'svc27', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Upperlip', price: '₱200', duration: '15 min', bookings: 0 },
    { id: 'svc28', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Underarms', price: '₱600', duration: '20 min', bookings: 0 },
    { id: 'svc29', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Brazilian', price: '₱700', duration: '30 min', bookings: 0 },
    { id: 'svc30', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Upperlip (10 Sessions + 1 Free)', price: '₱1,800', duration: 'Package', bookings: 0 },
    { id: 'svc31', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Underarms (10 Sessions + 1 Free)', price: '₱5,800', duration: 'Package', bookings: 0 },
    { id: 'svc32', category: 'IPL Hair Removal Treatment', emoji: '', name: 'IPL – Brazilian (10 Sessions + 1 Free)', price: '₱6,800', duration: 'Package', bookings: 0 },
    { id: 'svc33', category: 'Warts Treatment', emoji: '', name: 'Warts Removal (15 pcs)', price: '₱700', duration: '30 min', bookings: 0 },
    { id: 'svc34', category: 'Warts Treatment', emoji: '', name: 'Warts Removal Unlimited (Face or Neck)', price: '₱1,700', duration: '45 min', bookings: 0 },
    { id: 'svc35', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow Gluta Shots', price: '₱800', duration: '15 min', bookings: 0 },
    { id: 'svc36', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Snow White IV Drip', price: '₱1,500', duration: '30 min', bookings: 0 },
    { id: 'svc37', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow and Beyond Celestial IV Drip', price: '₱2,000', duration: '45 min', bookings: 0 },
    { id: 'svc38', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Korean IV Drip', price: '₱2,500', duration: '45 min', bookings: 0 },
    { id: 'svc39', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow Gluta Shots (5 Sessions)', price: '₱4,500', duration: 'Package', bookings: 0 },
    { id: 'svc40', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow Gluta Shots (10 Sessions + Free Booster)', price: '₱8,000', duration: 'Package', bookings: 0 },
    { id: 'svc41', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Snow White IV Drip (5 Sessions)', price: '₱7,000', duration: 'Package', bookings: 0 },
    { id: 'svc42', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Snow White IV Drip (10 Sessions + Free Booster)', price: '₱13,500', duration: 'Package', bookings: 0 },
    { id: 'svc43', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow and Beyond Celestial IV Drip (5 Sessions)', price: '₱9,000', duration: 'Package', bookings: 0 },
    { id: 'svc44', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Glow and Beyond Celestial IV Drip (10 Sessions + Free Booster)', price: '₱1,800', duration: 'Package', bookings: 0 },
    { id: 'svc45', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Korean IV Drip (5 Sessions)', price: '₱12,000', duration: 'Package', bookings: 0 },
    { id: 'svc46', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Korean IV Drip (10 Sessions + Free Booster)', price: '₱2,300', duration: 'Package', bookings: 0 },
    { id: 'svc47', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Vitamin C Add-On', price: '₱150', duration: 'Add-on', bookings: 0 },
    { id: 'svc48', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'L-Carnitine Add-On', price: '₱800', duration: 'Add-on', bookings: 0 },
    { id: 'svc49', category: 'Gluta Shot and Drip Treatment', emoji: '', name: 'Collagen Add-On', price: '₱600', duration: 'Add-on', bookings: 0 },
    { id: 'svc50', category: 'Manicure/Pedicure Treatment', emoji: '', name: 'Manicure', price: '₱130', duration: '30 min', bookings: 0 },
    { id: 'svc51', category: 'Manicure/Pedicure Treatment', emoji: '', name: 'Pedicure', price: '₱150', duration: '45 min', bookings: 0 },
    { id: 'svc52', category: 'Manicure/Pedicure Treatment', emoji: '', name: 'Gel Polish', price: '₱500', duration: '60 min', bookings: 0 },
    { id: 'svc53', category: 'Footcare', emoji: '', name: 'Footspa', price: '₱300', duration: '30 min', bookings: 0 },
    { id: 'svc54', category: 'Footcare', emoji: '', name: 'Footspa with Pedicure', price: '₱420', duration: '60 min', bookings: 0 },
    { id: 'svc55', category: 'Footcare', emoji: '', name: 'Footspa with Manicure and Pedicure', price: '₱520', duration: '75 min', bookings: 0 },
    { id: 'svc56', category: 'Footcare', emoji: '', name: 'Footmassage Only (30 mins)', price: '₱300', duration: '30 min', bookings: 0 },
    { id: 'svc57', category: 'Products', emoji: '', name: 'Facial Scrub', price: '₱150', duration: '—', bookings: 0 },
    { id: 'svc58', category: 'Products', emoji: '', name: 'Facial Foam', price: '₱150', duration: '—', bookings: 0 },
    { id: 'svc59', category: 'Products', emoji: '', name: 'Toner', price: '₱150', duration: '—', bookings: 0 },
    { id: 'svc60', category: 'Products', emoji: '', name: 'Antiperspirant', price: '₱150', duration: '—', bookings: 0 },
    { id: 'svc61', category: 'Products', emoji: '', name: 'Hyrdrocourt', price: '₱250', duration: '—', bookings: 0 },
    { id: 'svc62', category: 'Products', emoji: '', name: 'Soothing Gel', price: '₱250', duration: '—', bookings: 0 },
    { id: 'svc63', category: 'Products', emoji: '', name: 'Sunblock', price: '₱250', duration: '—', bookings: 0 }
];
function getServices() {
    try {
        var r = localStorage.getItem(SVC_KEY);
        if (r) {
            return JSON.parse(r);
        }
    } catch (e) { }
    return DEFAULT_SERVICES.slice();
}
function saveServices(list) {
    localStorage.setItem(SVC_KEY, JSON.stringify(list));
    var db = getDb();
    if (!db) return;
    // Save each service as individual doc — same pattern as appointments/users
    list.forEach(function (svc) {
        db.collection('services').doc(String(svc.id)).set(svc)
            .catch(function (e) { console.warn('Firestore saveServices error:', e); });
    });
}

function deleteServiceFromFirestore(id) {
    var db = getDb();
    if (!db) return;
    db.collection('services').doc(String(id)).delete()
        .catch(function (e) { console.warn('Firestore deleteService error:', e); });
}

function syncServicesFromFirestore(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getServices()); return; }
    db.collection('services').get()
        .then(function (snapshot) {
            if (!snapshot.empty) {
                var list = [];
                snapshot.forEach(function (doc) { list.push(doc.data()); });
                list.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
                localStorage.setItem(SVC_KEY, JSON.stringify(list));
            }
            if (callback) callback(getServices());
        })
        .catch(function (e) {
            console.warn('Firestore syncServices error:', e);
            if (callback) callback(getServices());
        });
}

function listenToServices(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('services').onSnapshot(function (snapshot) {
        if (!snapshot.empty) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            list.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
            localStorage.setItem(SVC_KEY, JSON.stringify(list));
        }
        if (callback) callback(getServices());
    }, function (e) { console.warn('Firestore services listener error:', e); });
}
function getCategories() {
    var cats = [];
    getServices().forEach(function (s) { if (cats.indexOf(s.category) === -1) cats.push(s.category); });
    return cats;
}
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// Chatbot FAQs (Firestore: chatbotFAQs) — single source of truth shared
// by BOTH the Admin "Chatbot Management" CRUD panel (admin-bundle.js) and
// the Client/public chatbot widget (js/chatbot-widget.js). Same
// localStorage-cache + Firestore-mirror pattern as getServices()/
// saveServices() above.
//
// Two read paths, matching firestore.rules:
//   - getFAQs()/listenToFAQs()      -> unfiltered, ADMIN ONLY (sees
//     active + inactive so it can manage everything).
//   - getActiveFAQsCache()/listenToActiveFAQs() -> queries
//     .where('active','==',true), safe for CLIENT/PUBLIC (unauthenticated
//     visitors on index.html can only ever receive active records; see
//     firestore.rules for why the query shape matters for that).
// Only Admin ever writes (saveFAQ/deleteFAQFromFirestore) — the chatbot
// widget is strictly read-only.
// ─────────────────────────────────────────────────────────────────────
var FAQ_KEY = 'spa_chatbot_faqs';
var FAQ_PUBLIC_KEY = 'spa_chatbot_faqs_public';

// Seed records only — clearly regular chatbotFAQs documents that Admin can
// edit/disable/delete like any other FAQ (Part 11). Facts used here (spa
// hours, location) are pulled from what already exists elsewhere in this
// project (TIME_SLOTS below, index.html brand panel) rather than invented.
var DEFAULT_FAQS = [
    {
        id: 'faq1',
        question: 'What services does the spa offer?',
        answer: 'We offer a wide range of beauty and skincare treatments, including Facial, Microneedling, Exilift, Eyelash, Eyebrow, IPL Hair Removal, Warts Removal, Gluta Shot & IV Drip, and Manicure/Pedicure & Footcare services. Check the Services & Pricing catalog for the full list.',
        keywords: ['services', 'service', 'treatment', 'treatments', 'offer', 'offerings', 'catalog', 'facial', 'manicure', 'pedicure', 'menu'],
        active: true, createdAt: null, updatedAt: null
    },
    {
        id: 'faq2',
        question: 'What are your operating hours?',
        answer: 'We are open every day from 10:00 AM to 7:00 PM.',
        keywords: ['hours', 'opening', 'open', 'close', 'closing', 'schedule', 'time'],
        active: true, createdAt: null, updatedAt: null
    },
    {
        id: 'faq3',
        question: 'How do I book an appointment?',
        answer: 'Sign in to your Client account, go to "Book a Service," then choose a service, date, and available time slot to confirm your booking.',
        keywords: ['book', 'booking', 'appointment', 'reserve', 'reservation'],
        active: true, createdAt: null, updatedAt: null
    },
    {
        id: 'faq4',
        question: 'How do I cancel or reschedule my appointment?',
        answer: 'Open "My Appointments" in your Client dashboard, find the appointment, and use the cancel or reschedule option there.',
        keywords: ['cancel', 'cancellation', 'reschedule', 'change', 'move', 'postpone'],
        active: true, createdAt: null, updatedAt: null
    },
    {
        id: 'faq5',
        question: 'Where are you located?',
        answer: "We're located in Sta. Maria, Bulacan.",
        keywords: ['location', 'address', 'where', 'located', 'directions', 'branch'],
        active: true, createdAt: null, updatedAt: null
    }
];

function getFAQs() {
    try {
        var r = localStorage.getItem(FAQ_KEY);
        if (r) return JSON.parse(r);
    } catch (e) { }
    return DEFAULT_FAQS.slice();
}

function getActiveFAQsCache() {
    try {
        var r = localStorage.getItem(FAQ_PUBLIC_KEY);
        if (r) return JSON.parse(r);
    } catch (e) { }
    return DEFAULT_FAQS.filter(function (f) { return f.active !== false; });
}

function saveFAQsLocal(list) {
    localStorage.setItem(FAQ_KEY, JSON.stringify(list));
}

// Upserts ONE FAQ — used by Admin add/edit. Stamps updatedAt every save,
// createdAt only the first time (mirrors serverTimestamp usage in
// createNotification() above).
function saveFAQ(faq) {
    var list = getFAQs();
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(faq.id)) { idx = i; break; } }
    var nowIso = new Date().toISOString();
    var record = {
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords || [],
        active: faq.active !== false,
        createdAt: idx === -1 ? nowIso : (list[idx].createdAt || nowIso),
        updatedAt: nowIso
    };
    if (idx === -1) list.unshift(record); else list[idx] = record;
    saveFAQsLocal(list);

    var db = getDb();
    if (db) {
        db.collection('chatbotFAQs').doc(String(record.id)).set({
            id: record.id, question: record.question, answer: record.answer,
            keywords: record.keywords, active: record.active,
            createdAt: idx === -1 ? firebase.firestore.FieldValue.serverTimestamp() : (list[idx] && list[idx].createdAt) || firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function (e) { console.warn('Firestore saveFAQ error:', e); });
    }
    return record;
}

function deleteFAQFromFirestore(id) {
    var list = getFAQs().filter(function (f) { return String(f.id) !== String(id); });
    saveFAQsLocal(list);
    var db = getDb();
    if (!db) return;
    db.collection('chatbotFAQs').doc(String(id)).delete()
        .catch(function (e) { console.warn('Firestore deleteFAQ error:', e); });
}

// ADMIN ONLY — unfiltered, sees active + inactive records so the FAQ
// management panel can list/search/toggle everything.
function listenToFAQs(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getFAQs()); return null; }
    return db.collection('chatbotFAQs').onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        if (list.length) saveFAQsLocal(list);
        if (callback) callback(getFAQs());
    }, function (e) { console.warn('Firestore FAQ listener error:', e); if (callback) callback(getFAQs()); });
}

// CLIENT/PUBLIC — queries only active FAQs (see firestore.rules note
// above for why the .where() is required here, not just a client-side
// filter). Safe to call from an unauthenticated visitor on index.html.
function listenToActiveFAQs(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getActiveFAQsCache()); return null; }
    return db.collection('chatbotFAQs').where('active', '==', true).onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        localStorage.setItem(FAQ_PUBLIC_KEY, JSON.stringify(list));
        if (callback) callback(list.length ? list : getActiveFAQsCache());
    }, function (e) { console.warn('Firestore active FAQ listener error:', e); if (callback) callback(getActiveFAQsCache()); });
}

// ── FAQ matching (Part 5) ────────────────────────────────────────────
// Deliberately simple/deterministic rather than an AI call — the project
// has no existing AI API integration, and the capstone spec explicitly
// says this doesn't need to be a complex AI chatbot.
function normalizeChatText(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

var CHAT_STOPWORDS = ['the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'i', 'we',
    'what', 'whats', 'how', 'when', 'where', 'can', 'could', 'please', 'of', 'to',
    'for', 'my', 'me', 'on', 'in', 'at', 'it', 'with', 'and', 'or', 'about'];

function chatTokens(str) {
    return normalizeChatText(str).split(' ').filter(function (w) { return w && CHAT_STOPWORDS.indexOf(w) === -1; });
}

// Finds the best-matching ACTIVE FAQ for a user's message. Keyword hits
// score highest (Admin curates keywords specifically for matching),
// question-word overlap and partial/substring hits score lower. Returns
// null when nothing clears the confidence bar, so callers fall back to
// the "I don't have an answer for that yet" response (Part 6) instead of
// guessing.
function matchFAQ(userText, faqList) {
    var tokens = chatTokens(userText);
    if (!tokens.length) return null;
    var active = (faqList || []).filter(function (f) { return f.active !== false; });
    var best = null, bestScore = 0;
    active.forEach(function (faq) {
        var score = 0;
        var qTokens = chatTokens(faq.question);
        var kwTokens = (faq.keywords || []).map(normalizeChatText).filter(Boolean);
        tokens.forEach(function (t) {
            if (kwTokens.indexOf(t) !== -1) score += 3;
            else if (kwTokens.some(function (k) { return k.length > 2 && (k.indexOf(t) !== -1 || t.indexOf(k) !== -1); })) score += 2;
            if (qTokens.indexOf(t) !== -1) score += 1;
        });
        if (score > bestScore) { bestScore = score; best = faq; }
    });
    return (best && bestScore >= 2) ? best : null;
}

var SHARED_APPTS_KEY = 'spa_shared_appointments';
var SHARED_USERS_KEY = 'spa_registered_users';

function getDb() {
    try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            return firebase.firestore();
        }
    } catch (e) { }
    return null;
}

// --- Appointments ---

function getSharedAppts() {
    try {
        var raw = localStorage.getItem(SHARED_APPTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

function saveSharedAppts(list) {
    localStorage.setItem(SHARED_APPTS_KEY, JSON.stringify(list));
}

// ─────────────────────────────────────────────────────────────────────
// notifications/{id} — proper user-facing alerts, separate from
// activity_logs (which stays as the admin audit trail — see note there).
// Created directly inside the data-layer functions below (addSharedAppt,
// updateApptStatus, sendChatMessage, saveFeedback) rather than from UI
// button handlers, so ANY code path that changes an appointment/sends a
// message/leaves feedback reliably produces the right notification.
// ─────────────────────────────────────────────────────────────────────
function createNotification(notif) {
    var db = getDb();
    if (!db) return;
    var payload = {
        recipientUid: notif.recipientUid || null,
        recipientEmail: notif.recipientEmail ? notif.recipientEmail.toLowerCase().trim() : null,
        recipientRole: notif.recipientRole,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        appointmentId: notif.appointmentId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };
    db.collection('notifications').add(payload)
        .catch(function (e) { console.warn('createNotification error:', e.code, e.message); });
}

function resolveStaffEmailByName(staffName) {
    if (!staffName || staffName === 'Any available staff') return null;
    var list = (typeof getStaffList === 'function') ? getStaffList() : [];
    var rec = list.find(function (s) { return s.name === staffName; });
    return rec ? rec.email : null;
}

// Client-facing notifications need the client's Firebase Auth uid as the
// PRIMARY recipient identifier (see createNotification/firestore.rules).
// Appointments created by the client themself carry appt.clientUid already
// (stamped from auth.currentUser.uid at booking time — see confirmBooking()
// in client-bundle.js); appointments created by Admin only know the
// client's email, so fall back to looking it up in the users record.
function resolveClientUidByEmail(email) {
    if (!email) return null;
    var rec = (typeof getUserByEmail === 'function') ? getUserByEmail(email) : null;
    return (rec && rec.uid) ? rec.uid : null;
}

function addSharedAppt(appt) {
    var list = getSharedAppts();
    list.unshift(appt);
    saveSharedAppts(list);

    var db = getDb();
    if (db) {
        db.collection('appointments').doc(String(appt.id)).set(appt)
            .catch(function (e) { console.warn('Firestore addAppt error:', e); });
    }

    // Admin always hears about a new booking.
    createNotification({
        recipientRole: 'admin', type: 'new_appointment', title: 'New Appointment',
        message: (appt.clientName || appt.clientEmail || 'A customer') + ' booked ' + appt.service + ' for ' + appt.date + ' at ' + appt.time + '.',
        appointmentId: String(appt.id)
    });

    // Let the client know their booking went through — worded differently
    // depending on whether it's already confirmed (admin created it) or
    // still pending (client self-booked).
    var apptClientUid = appt.clientUid || resolveClientUidByEmail(appt.clientEmail);
    if (appt.status === 'confirmed') {
        createNotification({
            recipientUid: apptClientUid, recipientEmail: appt.clientEmail, recipientRole: 'client',
            type: 'appointment_confirmed', title: 'Appointment Confirmed',
            message: 'Your appointment for ' + appt.service + ' on ' + appt.date + ' at ' + appt.time + ' has been confirmed.',
            appointmentId: String(appt.id)
        });
    } else {
        createNotification({
            recipientUid: apptClientUid, recipientEmail: appt.clientEmail, recipientRole: 'client',
            type: 'new_appointment', title: 'Booking Received',
            message: 'Your appointment for ' + appt.service + ' on ' + appt.date + ' at ' + appt.time + ' has been received.',
            appointmentId: String(appt.id)
        });
    }

    // Staff assigned to a specific (non-"any available") appointment.
    var staffEmail = resolveStaffEmailByName(appt.staff);
    if (staffEmail) {
        createNotification({
            recipientEmail: staffEmail, recipientRole: 'staff',
            type: 'new_appointment', title: 'New Appointment Assigned',
            message: (appt.clientName || 'A client') + ' booked ' + appt.service + ' with you on ' + appt.date + ' at ' + appt.time + '.',
            appointmentId: String(appt.id)
        });
    }
}

function updateApptStatus(id, status, extraFields, eventType) {
    var now = new Date().toISOString();
    var list = getSharedAppts();
    var rec = null;
    var statusChanged = false;
    list.forEach(function (a) {
        if (String(a.id) === String(id)) {
            rec = Object.assign({}, a); // snapshot before mutation, for the notification text
            statusChanged = a.status !== status;
            a.status = status;
            if (status === 'done') a.completedAt = now;
            if (status === 'confirmed') a.confirmedAt = now;
            if (extraFields) {
                for (var k in extraFields) { a[k] = extraFields[k]; }
            }
        }
    });
    saveSharedAppts(list);

    var db = getDb();
    if (db) {
        var update = { status: status };
        if (status === 'done') update.completedAt = now;
        if (status === 'confirmed') update.confirmedAt = now;
        if (extraFields) { for (var k in extraFields) { update[k] = extraFields[k]; } }
        db.collection('appointments').doc(String(id)).update(update)
            .catch(function (e) { console.warn('Firestore updateAppt error:', e); });
    }

    if (rec) {
        notifyApptStatusChange(rec, status, extraFields, eventType, statusChanged);
    }
}

// Fires admin-facing AND client-facing notifications for a status
// transition or an explicit reschedule. `statusChanged` guards against
// firing a stray notification when a caller just edits an unrelated field
// while leaving status the same.
function notifyApptStatusChange(rec, newStatus, extraFields, eventType, statusChanged) {
    if (eventType !== 'reschedule' && !statusChanged) return;

    var finalDate = (extraFields && extraFields.date) || rec.date;
    var finalTime = (extraFields && extraFields.time) || rec.time;
    var when = finalDate + ' at ' + finalTime;
    var who = rec.clientName || rec.clientEmail || 'A customer';
    var clientUid = rec.clientUid || resolveClientUidByEmail(rec.clientEmail);

    if (eventType === 'reschedule') {
        createNotification({
            recipientRole: 'admin', type: 'appointment_rescheduled', title: 'Appointment Rescheduled',
            message: who + "'s " + rec.service + ' appointment was moved to ' + when + '.',
            appointmentId: String(rec.id)
        });
        createNotification({
            recipientUid: clientUid, recipientEmail: rec.clientEmail, recipientRole: 'client',
            type: 'appointment_rescheduled', title: 'Appointment Rescheduled',
            message: 'Your appointment has been rescheduled to ' + when + '.',
            appointmentId: String(rec.id)
        });
        return;
    }
    if (newStatus === 'cancelled') {
        // Admin needs to know about cancellations regardless of who cancelled
        // it (client, staff, or admin themself).
        createNotification({
            recipientRole: 'admin', type: 'appointment_cancelled', title: 'Appointment Cancelled',
            message: who + "'s " + rec.service + ' appointment on ' + when + ' was cancelled.',
            appointmentId: String(rec.id)
        });
        createNotification({
            recipientUid: clientUid, recipientEmail: rec.clientEmail, recipientRole: 'client',
            type: 'appointment_cancelled', title: 'Appointment Cancelled',
            message: 'Your appointment for ' + rec.service + ' on ' + finalDate + ' has been cancelled.',
            appointmentId: String(rec.id)
        });
        return;
    }
    if (newStatus === 'confirmed') {
        createNotification({
            recipientUid: clientUid, recipientEmail: rec.clientEmail, recipientRole: 'client',
            type: 'appointment_confirmed', title: 'Appointment Confirmed',
            message: 'Your appointment for ' + rec.service + ' on ' + when + ' has been confirmed.',
            appointmentId: String(rec.id)
        });
        return;
    }
    if (newStatus === 'done') {
        createNotification({
            recipientUid: clientUid, recipientEmail: rec.clientEmail, recipientRole: 'client',
            type: 'appointment_completed', title: 'Appointment Completed',
            message: "Your appointment for " + rec.service + " has been completed. Thank you for visiting Shortcut's Spa!",
            appointmentId: String(rec.id)
        });
    }
}

function removeSharedAppt(id) {
    var list = getSharedAppts().filter(function (a) { return String(a.id) !== String(id); });
    saveSharedAppts(list);

    var db = getDb();
    if (db) {
        db.collection('appointments').doc(String(id)).delete()
            .catch(function (e) { console.warn('Firestore deleteAppt error:', e); });
    }
}


function syncApptsFromFirestore(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getSharedAppts()); return; }
    db.collection('appointments').get()
        .then(function (snapshot) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
            if (list.length > 0) saveSharedAppts(list);
            if (callback) callback(getSharedAppts());
        })
        .catch(function (e) {
            console.warn('Firestore syncAppts error:', e);
            if (callback) callback(getSharedAppts());
        });
}

function listenToAppts(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('appointments').onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
        saveSharedAppts(list);
        if (callback) callback(list);
    }, function (e) { console.warn('Firestore appt listener error:', e); });
}

// Client-scoped version of listenToAppts — queries only appointments
// belonging to one client (by email) instead of the entire spa's
// appointments collection. Used by dashboard-client so a client's browser
// never receives other clients' names, phone numbers, or booking details,
// and only downloads/re-renders on changes to their own records.
function listenToMyAppts(clientEmail, callback) {
    var db = getDb();
    if (!db || !clientEmail) return null;
    return db.collection('appointments').where('clientEmail', '==', clientEmail)
        .onSnapshot(function (snapshot) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
            saveMyAppts(clientEmail, list);
            if (callback) callback(list);
        }, function (e) { console.warn('Firestore my-appts listener error:', e); });
}

function saveMyAppts(clientEmail, list) {
    try { localStorage.setItem('myAppts_' + clientEmail, JSON.stringify(list)); } catch (e) { }
}

function getSavedMyAppts(clientEmail) {
    try {
        var raw = localStorage.getItem('myAppts_' + clientEmail);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

// --- Registered Users ---

function getRegisteredUsers() {
    try {
        var raw = localStorage.getItem(SHARED_USERS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

function saveRegisteredUsers(list) {
    localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(list));
}

function addRegisteredUser(userObj) {
    var list = getRegisteredUsers();
    var exists = list.some(function (u) { return u.email === userObj.email; });
    if (!exists) {
        list.push(userObj);
    } else {
        list = list.map(function (u) { return u.email === userObj.email ? userObj : u; });
    }
    saveRegisteredUsers(list);

    var db = getDb();
    if (db) {
        var safeId = userObj.email.replace(/[^a-zA-Z0-9]/g, '_');
        db.collection('users').doc(safeId).set(userObj)
            .catch(function (e) { console.warn('Firestore addUser error:', e); });
        mirrorUserRole(userObj.uid, userObj.role, userObj.email);
    }
}

// Keeps a small, uid-keyed "user_roles" collection in sync with each profile's role.
// This mirror exists purely so Firestore Security Rules can check "what role does the
// currently signed-in uid have?" cheaply (rules can't safely derive our email-based
// `users` doc ID). New accounts can only self-create this doc as role "client" — the
// rules block anyone from self-promoting to staff/admin/super_admin; only an existing
// admin account can update someone else's role doc (see firestore.rules).
function mirrorUserRole(uid, role, email) {
    if (!uid || !role || !email) return;
    var db = getDb();
    if (!db) return;
    db.collection('user_roles').doc(uid).set({ role: role, email: email }, { merge: true })
        .catch(function (e) { console.warn('Firestore mirrorUserRole error (expected for role promotions until rules/admin bootstrap are set up):', e.message); });
}

// Writes one entry to the activity_logs collection. Best-effort — logging should never
// block or break the action it's describing, so failures are swallowed.
function logActivity(action, userName, userEmail, details) {
    var db = getDb();
    if (!db) return;
    try {
        db.collection('activity_logs').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: userEmail || null,
            userName: userName || null,
            action: action,
            details: details || null,
            device: (typeof navigator !== 'undefined' ? navigator.userAgent : null)
        }).catch(function (e) { console.warn('Firestore logActivity error:', e); });
    } catch (e) { }
}

function updateRegisteredUser(email, updates) {
    var list = getRegisteredUsers();
    list.forEach(function (u) { if (u.email === email) { for (var k in updates) u[k] = updates[k]; } });
    saveRegisteredUsers(list);

    var db = getDb();
    if (db) {
        var safeId = email.replace(/[^a-zA-Z0-9]/g, '_');
        db.collection('users').doc(safeId).set(updates, { merge: true })
            .catch(function (e) { console.warn('Firestore updateUser error:', e); });
        if (updates.role) {
            var rec = getUserByEmail(email);
            if (rec && rec.uid) mirrorUserRole(rec.uid, updates.role, email);
        }
    }
}

function removeRegisteredUserByEmail(email) {
    var list = getRegisteredUsers().filter(function (u) { return u.email !== email; });
    saveRegisteredUsers(list);

    var db = getDb();
    if (db) {
        var safeId = email.replace(/[^a-zA-Z0-9]/g, '_');
        db.collection('users').doc(safeId).delete()
            .catch(function (e) { console.warn('Firestore deleteUser error:', e); });
    }
}

function syncUsersFromFirestore(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getRegisteredUsers()); return; }

    // Fall back to localStorage if Firestore takes longer than 6 seconds
    var done = false;
    var timer = setTimeout(function () {
        if (!done) {
            done = true;
            console.warn('Firestore sync timed out, using localStorage.');
            if (callback) callback(getRegisteredUsers());
        }
    }, 6000);

    db.collection('users').get()
        .then(function (snapshot) {
            if (done) return; done = true; clearTimeout(timer);
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            if (list.length > 0) saveRegisteredUsers(list);
            if (callback) callback(getRegisteredUsers());
        })
        .catch(function (e) {
            if (done) return; done = true; clearTimeout(timer);
            console.warn('Firestore syncUsers error:', e);
            if (callback) callback(getRegisteredUsers());
        });
}

function listenToUsers(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('users').onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        saveRegisteredUsers(list);
        if (callback) callback(list);
    }, function (e) { console.warn('Firestore users listener error:', e); });
}

// Staff-only version of listenToUsers — used by dashboard-client, which
// only ever needs the staff roster (for the "preferred staff" booking
// dropdown), never other clients' names/emails/phone numbers. Cached
// separately from the full users cache so it doesn't get overwritten by
// (or accidentally leak into) the admin/staff full-roster views.
function listenToStaffList(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('users').where('role', '==', 'staff')
        .onSnapshot(function (snapshot) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            saveStaffListCache(list);
            if (callback) callback(list);
        }, function (e) { console.warn('Firestore staff-list listener error:', e); });
}

function saveStaffListCache(list) {
    try { localStorage.setItem('staffListCache', JSON.stringify(list)); } catch (e) { }
}

function getCachedStaffList() {
    try {
        var raw = localStorage.getItem('staffListCache');
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

function getUserByEmail(email) {
    return getRegisteredUsers().find(function (u) { return u.email === email; }) || null;
}

// Marks a legacy (pre-Firebase-Auth) account as "grandfathered in" so it isn't
// forced through the new email-verification gate the first time it signs in
// under real Firebase Auth. Real emailVerified still gets set once the user
// actually clicks the verification link we send them in the background.
function markLegacyVerified(email) {
    updateRegisteredUser(email, { legacyVerified: true });
}

function getStaffList() {
    return getRegisteredUsers().filter(function (u) { return u.role === 'staff'; });
}

function getClientList() {
    return getRegisteredUsers().filter(function (u) { return u.role === 'client'; });
}

// --- Staff Helpers ---

function staffAcceptAppt(id, staffName) {
    var now = new Date().toISOString();
    updateApptStatus(id, 'confirmed', {
        staffConfirmed: true,
        staffAcceptedAt: now,
        staffDeclineReason: null
    });
}

function staffDeclineAppt(id, staffName, reason) {
    var now = new Date().toISOString();
    var list = getSharedAppts();
    list.forEach(function (a) {
        if (String(a.id) === String(id)) {
            a.status = 'staff_declined';
            a.staffConfirmed = false;
            a.staffDeclineReason = reason || 'Staff unavailable';
            a.staffDeclinedAt = now;
            a.staffDeclinedBy = staffName;
            a.originalStaff = a.staff;
            a.staff = 'Any available staff';
        }
    });
    saveSharedAppts(list);

    var db = getDb();
    if (db) {
        db.collection('appointments').doc(String(id)).update({
            status: 'staff_declined',
            staffConfirmed: false,
            staffDeclineReason: reason || 'Staff unavailable',
            staffDeclinedAt: now,
            staffDeclinedBy: staffName,
            staff: 'Any available staff'
        }).catch(function (e) { console.warn('Firestore staffDecline error:', e); });
    }
}

function setStaffAvailability(email, availability) {
    updateRegisteredUser(email, { availability: availability });
}

// --- One-time migration from localStorage to Firestore ---

function migrateLocalStorageToFirestore() {
    var db = getDb();
    if (!db) return;

    var users = getRegisteredUsers();
    users.forEach(function (u) {
        var safeId = u.email.replace(/[^a-zA-Z0-9]/g, '_');
        db.collection('users').doc(safeId).set(u, { merge: true })
            .catch(function (e) { console.warn('Migration user error:', e); });
    });

    var appts = getSharedAppts();
    appts.forEach(function (a) {
        db.collection('appointments').doc(String(a.id)).set(a, { merge: true })
            .catch(function (e) { console.warn('Migration appt error:', e); });
    });

    if (users.length > 0 || appts.length > 0) {
        console.log('[Spa] Migrated ' + users.length + ' users and ' + appts.length + ' appointments to Firestore.');
    }
}

// Runs once; uses merge so nothing gets overwritten
(function () {
    if (!localStorage.getItem('spa_firestore_migrated')) {
        setTimeout(function () {
            migrateLocalStorageToFirestore();
            localStorage.setItem('spa_firestore_migrated', '1');
        }, 2000);
    }
})();

// --- Real-time connection badge ---

function initConnectionIndicator() {
    var indicator = document.createElement('div');
    indicator.id = 'rtIndicator';
    indicator.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:500;letter-spacing:.04em;padding:5px 11px;border-radius:100px;border:1.5px solid;transition:all .3s ease;cursor:default;user-select:none;flex-shrink:0';

    var dot = document.createElement('span');
    dot.id = 'rtDot';
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background .3s';

    var label = document.createElement('span');
    label.id = 'rtLabel';

    indicator.appendChild(dot);
    indicator.appendChild(label);

    var topbar = document.querySelector('.topbar');
    if (topbar) {
        var lastDiv = topbar.querySelector('div:last-child');
        if (lastDiv && lastDiv !== topbar.querySelector('.topbar-left')) {
            lastDiv.insertBefore(indicator, lastDiv.firstChild);
        } else {
            topbar.appendChild(indicator);
        }
    }

    setRTStatus('connecting');

    var db = getDb();
    if (db) {
        window._rtListenerFired = false;
        window._rtConnectTimer = setTimeout(function () {
            if (!window._rtListenerFired) setRTStatus('offline');
        }, 8000);
    } else {
        setRTStatus('offline');
    }
}

function setRTStatus(status) {
    var dot = document.getElementById('rtDot');
    var label = document.getElementById('rtLabel');
    var indicator = document.getElementById('rtIndicator');
    if (!dot || !label || !indicator) return;

    if (status === 'live') {
        dot.style.background = '#22c55e';
        dot.style.boxShadow = '0 0 0 3px rgba(34,197,94,.25)';
        dot.style.animation = 'rtPulse 2s ease infinite';
        label.textContent = 'Online';
        indicator.style.background = 'rgba(34,197,94,.08)';
        indicator.style.borderColor = 'rgba(34,197,94,.30)';
        indicator.style.color = '#16a34a';
        window._rtListenerFired = true;
        if (window._rtConnectTimer) clearTimeout(window._rtConnectTimer);
    } else if (status === 'offline') {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = 'none';
        dot.style.animation = 'none';
        label.textContent = 'Offline';
        indicator.style.background = 'rgba(239,68,68,.07)';
        indicator.style.borderColor = 'rgba(239,68,68,.25)';
        indicator.style.color = '#dc2626';
    } else {
        dot.style.background = '#f59e0b';
        dot.style.boxShadow = 'none';
        dot.style.animation = 'none';
        label.textContent = 'Connecting\u2026';
        indicator.style.background = 'rgba(245,158,11,.07)';
        indicator.style.borderColor = 'rgba(245,158,11,.25)';
        indicator.style.color = '#d97706';
    }
}

function flashRTUpdate() {
    var dot = document.getElementById('rtDot');
    if (!dot) return;
    dot.style.transform = 'scale(1.5)';
    setTimeout(function () { dot.style.transform = 'scale(1)'; }, 300);
}

(function () {
    var style = document.createElement('style');
    style.textContent = '@keyframes rtPulse{0%,100%{opacity:1}50%{opacity:.45}}';
    document.head && document.head.appendChild(style);
})();

// --- Messages / Announcements ---

var SHARED_MESSAGES_KEY = 'spa_messages';

function getMessages() {
    try {
        var raw = localStorage.getItem(SHARED_MESSAGES_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

function saveMessages(list) {
    localStorage.setItem(SHARED_MESSAGES_KEY, JSON.stringify(list));
}

function sendMessage(msgObj) {
    // msgObj: { id, subject, body, type (promo|announcement|personal), recipients ('all' | [email,...]), sentAt, sentBy }
    var list = getMessages();
    list.unshift(msgObj);
    saveMessages(list);

    var db = getDb();
    if (db) {
        db.collection('messages').doc(String(msgObj.id)).set(msgObj)
            .catch(function (e) { console.warn('Firestore sendMessage error:', e); });
    }
}

function deleteMessage(id) {
    // Soft delete — flag only, so client/staff views are NOT affected
    var list = getMessages().map(function (m) {
        if (String(m.id) === String(id)) {
            m.deletedByAdmin = true;
        }
        return m;
    });
    saveMessages(list);

    var db = getDb();
    if (db) {
        db.collection('messages').doc(String(id)).update({ deletedByAdmin: true })
            .catch(function (e) { console.warn('Firestore deleteMessage error:', e); });
    }
}

function getMessagesForClient(email) {
    return getMessages().filter(function (m) {
        // deletedByAdmin only hides from admin view — client still sees it
        if (m.recipients === 'all' || m.recipients === 'all_clients') return true;
        if (Array.isArray(m.recipients)) return m.recipients.indexOf(email) !== -1;
        return false;
    });
}

function getMessagesForStaff(email) {
    return getMessages().filter(function (m) {
        // deletedByAdmin only hides from admin view — staff still sees it
        if (m.recipients === 'all_staff') return true;
        if (Array.isArray(m.recipients) && m.audience === 'staff') return m.recipients.indexOf(email) !== -1;
        return false;
    });
}

function syncMessagesFromFirestore(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getMessages()); return; }
    db.collection('messages').get()
        .then(function (snapshot) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
            if (list.length > 0) saveMessages(list);
            if (callback) callback(getMessages());
        })
        .catch(function (e) {
            console.warn('Firestore syncMessages error:', e);
            if (callback) callback(getMessages());
        });
}

function listenToMessages(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('messages').onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
        saveMessages(list);
        if (callback) callback(list);
    }, function (e) { console.warn('Firestore messages listener error:', e); });
}

var _origListenToMessages = listenToMessages;
listenToMessages = function (callback) {
    return _origListenToMessages(function (data) {
        setRTStatus('live');
        if (callback) callback(data);
    });
};

// ─────────────────────────────────────────────────────────────────────
// Two-way Client ↔ Spa chat. Kept as its OWN collection rather than
// overloading `messages` above: that collection is a one-way broadcast
// (recipients: 'all' | [emails]) with no per-conversation structure, and
// its reads aren't scoped to a single client — reusing it for a private
// 1:1 thread would mean either weakening security (any signed-in user
// could read any client's chat) or a much larger rewrite of the existing
// broadcast feature. `conversations/{clientUid}` is keyed by the client's
// real Firebase Auth uid, which is what lets Firestore Rules enforce
// "only this client, or staff/admin" WITHOUT relying on client-side
// filtering (see firestore.rules).
//
// conversations/{clientUid}
//   { clientUid, clientEmail, clientName, lastMessage, lastMessageAt,
//     unreadByClient, unreadByAdmin, updatedAt }
// conversations/{clientUid}/messages/{msgId}
//   { senderRole: 'client'|'admin'|'staff', senderName, senderEmail,
//     text, sentAt, read }
// ─────────────────────────────────────────────────────────────────────

function ensureConversation(uid, clientEmail, clientName) {
    var db = getDb();
    if (!db || !uid) return;
    db.collection('conversations').doc(uid).set({
        clientUid: uid,
        clientEmail: clientEmail,
        clientName: clientName,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function (e) { console.warn('ensureConversation error:', e); });
}

// Validates and sends one chat message, then updates the parent
// conversation doc's preview/unread flags in the same round trip.
function sendChatMessage(uid, senderRole, senderName, senderEmail, text, cb) {
    var db = getDb();
    if (!db || !uid) { if (cb) cb(false, 'Not connected. Please try again.'); return; }

    var clean = String(text == null ? '' : text).trim();
    if (!clean) { if (cb) cb(false, 'Message cannot be empty.'); return; }
    if (clean.length > 1000) { if (cb) cb(false, 'Message is too long (max 1000 characters).'); return; }

    var isClient = senderRole === 'client';
    var msg = {
        senderRole: senderRole,
        senderName: senderName || '',
        senderEmail: senderEmail || '',
        text: clean,
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };
    var convUpdate = {
        lastMessage: clean.substring(0, 120),
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unreadByClient: !isClient,
        unreadByAdmin: isClient,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (isClient) { convUpdate.clientUid = uid; convUpdate.clientEmail = senderEmail; convUpdate.clientName = senderName; }

    db.collection('conversations').doc(uid).collection('messages').add(msg)
        .then(function () { return db.collection('conversations').doc(uid).set(convUpdate, { merge: true }); })
        .then(function () {
            if (isClient) {
                createNotification({
                    recipientRole: 'admin', type: 'new_message', title: 'New Message',
                    message: (senderName || 'A client') + ' sent a message.'
                });
            } else {
                createNotification({
                    recipientUid: uid, recipientRole: 'client', type: 'new_message', title: 'New Message',
                    message: 'You have a new message from the SPA.'
                });
            }
            if (cb) cb(true);
        })
        .catch(function (e) {
            console.warn('sendChatMessage error:', e);
            if (cb) cb(false, 'Message failed to send. Please try again.');
        });
}

// Real-time listener for one client's chat thread. Returns an unsubscribe
// function — callers are responsible for invoking it when the user leaves
// the page or logs out (see js/shared/authGuard.js spaLogout and each
// bundle's beforeunload hook).
function listenToConversation(uid, callback) {
    var db = getDb();
    if (!db || !uid) return null;
    return db.collection('conversations').doc(uid).collection('messages')
        .orderBy('sentAt', 'asc')
        .onSnapshot(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(Object.assign({ _id: doc.id }, doc.data())); });
            if (callback) callback(items);
        }, function (e) { console.warn('listenToConversation error:', e); });
}

// Real-time listener for one client's conversation metadata only (not the
// full message list) — cheap enough to run for the whole session so the
// sidebar unread badge stays live even when the Messages page isn't open.
function listenToConversationMeta(uid, callback) {
    var db = getDb();
    if (!db || !uid) return null;
    return db.collection('conversations').doc(uid)
        .onSnapshot(function (doc) { if (callback) callback(doc.data() || {}); },
            function (e) { console.warn('listenToConversationMeta error:', e); });
}

// Admin/staff inbox: every client conversation, most recently active first.
function listenToAllConversations(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('conversations').orderBy('updatedAt', 'desc')
        .onSnapshot(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(Object.assign({ _id: doc.id }, doc.data())); });
            if (callback) callback(items);
        }, function (e) { console.warn('listenToAllConversations error:', e); });
}

function markConversationRead(uid, role) {
    var db = getDb();
    if (!db || !uid) return;
    var update = {};
    update[role === 'client' ? 'unreadByClient' : 'unreadByAdmin'] = false;
    db.collection('conversations').doc(uid).set(update, { merge: true })
        .catch(function (e) { console.warn('markConversationRead error:', e); });
}

// Marks every message NOT sent by `viewerRole` as read, i.e. when the
// client opens the thread, the admin/staff messages in it get marked read.
function markConversationMessagesRead(uid, viewerRole) {
    var db = getDb();
    if (!db || !uid) return;
    db.collection('conversations').doc(uid).collection('messages')
        .where('read', '==', false)
        .get()
        .then(function (snap) {
            var batch = db.batch();
            var any = false;
            snap.forEach(function (doc) {
                if (doc.data().senderRole !== viewerRole) { batch.update(doc.ref, { read: true }); any = true; }
            });
            return any ? batch.commit() : null;
        })
        .catch(function (e) { console.warn('markConversationMessagesRead error:', e); });
}

// Wrap the listeners so the badge updates automatically
var _origListenToAppts = listenToAppts;
listenToAppts = function (callback) {
    return _origListenToAppts(function (data) {
        setRTStatus('live');
        flashRTUpdate();
        if (callback) callback(data);
    });
};

var _origListenToUsers = listenToUsers;
listenToUsers = function (callback) {
    return _origListenToUsers(function (data) {
        setRTStatus('live');
        if (callback) callback(data);
    });
};

// ── Feedback ─────────────────────────────────────────────────────────────────

var FEEDBACK_KEY = 'spa_feedback';

function getFeedback() {
    try {
        var raw = localStorage.getItem(FEEDBACK_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return [];
}

function saveFeedbackLocal(list) {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
}

function saveFeedback(fbObj) {
    var list = getFeedback();
    list.unshift(fbObj);
    saveFeedbackLocal(list);

    var db = getDb();
    if (db) {
        db.collection('feedback').doc(String(fbObj.id)).set(fbObj)
            .catch(function (e) { console.warn('Firestore saveFeedback error:', e); });
    }
    if (typeof logActivity === 'function') {
        logActivity('New Customer Feedback', fbObj.name, fbObj.email, fbObj.comment);
    }
    createNotification({
        recipientRole: 'admin', type: 'new_feedback', title: 'New Feedback',
        message: (fbObj.name || 'A customer') + ' left a ' + (fbObj.rating || 5) + '-star review.'
    });
}

function deleteFeedback(id) {
    var list = getFeedback().filter(function (f) { return String(f.id) !== String(id); });
    saveFeedbackLocal(list);

    var db = getDb();
    if (db) {
        db.collection('feedback').doc(String(id)).delete()
            .catch(function (e) { console.warn('Firestore deleteFeedback error:', e); });
    }
}

function syncFeedbackFromFirestore(callback) {
    var db = getDb();
    if (!db) { if (callback) callback(getFeedback()); return; }
    db.collection('feedback').get()
        .then(function (snapshot) {
            var list = [];
            snapshot.forEach(function (doc) { list.push(doc.data()); });
            list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
            if (list.length > 0) saveFeedbackLocal(list);
            if (callback) callback(getFeedback());
        })
        .catch(function (e) {
            console.warn('Firestore syncFeedback error:', e);
            if (callback) callback(getFeedback());
        });
}

function listenToFeedback(callback) {
    var db = getDb();
    if (!db) return null;
    return db.collection('feedback').onSnapshot(function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) { list.push(doc.data()); });
        list.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
        saveFeedbackLocal(list);
        if (callback) callback(list);
    }, function (e) { console.warn('Firestore feedback listener error:', e); });
}

// ── Booking Availability ─────────────────────────────────────────────────
// Spa hours: 10:00 AM – 7:00 PM, every day. Slots are hourly start times,
// spaced so the last slot still leaves room before closing.
var TIME_SLOTS = [
    '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
];

function getAllTimeSlots() { return TIME_SLOTS.slice(); }

// Statuses that actually occupy a time slot.
// 'cancelled' and 'staff_declined' free the slot back up.
var OCCUPYING_STATUSES = ['pending', 'confirmed', 'done'];

// The spa only takes one appointment per time slot, period — regardless of
// how many staff are on shift. A slot is "full" once any client has booked it.
function getSlotStatus(dateStr, timeStr) {
    var appts = getSharedAppts();
    var taken = appts.some(function (a) {
        return a.date === dateStr && a.time === timeStr &&
            OCCUPYING_STATUSES.indexOf(a.status) !== -1;
    });
    return taken ? 'full' : 'available';
}

function getDayAvailabilitySummary(dateStr) {
    var slots = getAllTimeSlots();
    var openCount = 0;
    slots.forEach(function (t) {
        if (getSlotStatus(dateStr, t) === 'available') openCount++;
    });
    return { openCount: openCount, totalCount: slots.length, isFull: openCount === 0 };
}