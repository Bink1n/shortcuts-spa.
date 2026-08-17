// ─────────────────────────────────────────────────────────────────────────
// requireRole(role, onReady) — real route protection for dashboard pages.
//
// Replaces the old pattern of just checking localStorage.spa_user (which
// anyone could fake from DevTools). Now we wait for Firebase Auth's real
// signed-in state, confirm the account is verified, and read its role from
// the synced Firestore profile before letting the page render anything.
//
// Usage (inside pages/js/<role>/session/initUser.js):
//   requireRole('client', function (user) {
//       // `user` = { name, role, email, avatar, profilePhoto, phone, gender }
//       // ...existing DOM population code goes in here...
//   });
// ─────────────────────────────────────────────────────────────────────────

function requireRole(requiredRole, onReady) {
    // If the browser restores this page from its back/forward cache (e.g. the
    // user hits Back right after logging out), the page can briefly show its
    // last rendered state without re-running our checks. Force a real reload
    // so requireRole() runs fresh and kicks out anyone no longer signed in.
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    if (typeof firebaseReady === 'undefined' || !firebaseReady || !auth) {
        window.location.href = '../index.html';
        return;
    }

    auth.onAuthStateChanged(function (fbUser) {
        if (!fbUser) {
            window.location.href = '../index.html';
            return;
        }

        function proceed() {
            var profile = (typeof getUserByEmail === 'function') ? getUserByEmail(fbUser.email) : null;
            var role = profile ? profile.role : null;
            var verified = fbUser.emailVerified || (profile && profile.legacyVerified);

            if (!profile || role !== requiredRole || !verified) {
                // Wrong role, unknown account, or not verified yet — kick back to login
                // rather than silently rendering a page they shouldn't see.
                auth.signOut();
                window.location.href = '../index.html';
                return;
            }

            var user = {
                name: profile.name,
                role: role,
                email: fbUser.email,
                avatar: profile.avatar || null,
                profilePhoto: profile.profilePhoto || null,
                phone: profile.phone || null,
                gender: profile.gender || null
            };
            localStorage.setItem('spa_user', JSON.stringify(user));

            if (typeof logActivity === 'function' && !sessionStorage.getItem('spa_loginLogged_' + fbUser.uid)) {
                logActivity(role === 'admin' ? 'Admin Login' : 'Login', user.name, user.email);
                sessionStorage.setItem('spa_loginLogged_' + fbUser.uid, '1');
            }

            if (typeof initSessionTimeout === 'function') initSessionTimeout();

            if (onReady) onReady(user);
        }

        if (typeof syncUsersFromFirestore === 'function') {
            syncUsersFromFirestore(function () { proceed(); });
        } else {
            proceed();
        }
    });
}

// Shared logout: signs out of Firebase Auth (not just clearing localStorage),
// logs the action, and redirects to the login page.
function spaLogout() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('spa_user')); } catch (e) { }
    if (typeof logActivity === 'function' && user) {
        logActivity('Logout', user.name, user.email);
    }
    // Bundles that hold live Firestore listeners (e.g. the client chat
    // thread) expose a cleanup hook here so we don't leak a listener that
    // outlives the signed-out session.
    if (typeof stopClientChat === 'function') stopClientChat();
    if (typeof _chatMetaUnsub === 'function') _chatMetaUnsub();
    if (typeof stopAdminConvInbox === 'function') stopAdminConvInbox();
    if (typeof stopAdminNotifBell === 'function') stopAdminNotifBell();
    if (typeof stopStaffNotifBell === 'function') stopStaffNotifBell();
    localStorage.removeItem('spa_user');
    if (typeof auth !== 'undefined' && auth) {
        auth.signOut().finally(function () { window.location.href = '../index.html'; });
    } else {
        window.location.href = '../index.html';
    }
}
