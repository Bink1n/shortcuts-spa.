var firebaseConfig = {
    apiKey: "AIzaSyCO-XKuPg0icOBMOYguqnZQC8IcV9yeXQ0",
    authDomain: "shortcuts-spa-2b068.firebaseapp.com",
    projectId: "shortcuts-spa-2b068",
    storageBucket: "shortcuts-spa-2b068.firebasestorage.app",
    messagingSenderId: "340036696633",
    appId: "1:340036696633:web:b5d0a425993b5f584cabe8"
};

var firebaseReady = false;
var auth = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        // Firestore is accessed on-demand via getDb() in shared-data.js
        firebaseReady = true;
        console.log('[Spa] Firebase initialized OK');
    }
} catch (e) {
    console.warn('[Spa] Firebase init failed:', e.message);
}