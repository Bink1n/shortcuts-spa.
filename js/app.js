// Hardcoded privileged accounts (admin / staff).
// Clients register normally — their role is stored in their account.
var USERS = [
    { email: "admin@gmail.com", password: "Admin123", role: "admin", name: "Admin" }
];

var DASHBOARDS = {
    admin: "pages/dashboard-admin.html",
    staff: "pages/dashboard-staff.html",
    client: "pages/dashboard-client.html"
};

window.addEventListener("DOMContentLoaded", function () {

    // Clear session when landing on login page
    if (window.location.pathname.indexOf('register') === -1) {
        localStorage.removeItem("spa_user");
    }

    // ── Handle email verification link (passwordless sign-in) ────────────────
    // When admin sends a sign-in link, user clicks it and lands here with the link.
    // Firebase completes the sign-in; we look up their pending registration and activate it.
    if (firebaseReady && auth && typeof firebase !== 'undefined') {
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            var params = new URLSearchParams(window.location.search);
            var emailHint = params.get('email') || localStorage.getItem('spa_emailForSignIn') || '';
            var emailToUse = emailHint || window.prompt('Please enter your email address to confirm:');

            if (emailToUse) {
                showToast('Verifying your email…');
                firebase.auth().signInWithEmailLink(emailToUse, window.location.href)
                    .then(function (result) {
                        var gUser = result.user;
                        // Look up pending registration created by admin
                        var pendingKey = 'spa_pending_verify_' + emailToUse.replace(/[^a-z0-9]/g, '_');
                        var pendingRaw = localStorage.getItem(pendingKey);
                        var pending = pendingRaw ? JSON.parse(pendingRaw) : null;

                        var role = 'client';
                        var name = gUser.displayName || emailToUse.split('@')[0];
                        if (pending) {
                            role = pending.role || 'client';
                            name = pending.name || name;
                            localStorage.removeItem(pendingKey);
                        }

                        // Activate their account — remove pending flag
                        try {
                            var reg = JSON.parse(localStorage.getItem('spa_registered_users') || '[]');
                            var idx = reg.findIndex(function(u){ return u.email === emailToUse; });
                            if (idx !== -1) {
                                reg[idx].pending = false;
                                reg[idx].name = name;
                                reg[idx].role = role;
                                localStorage.setItem('spa_registered_users', JSON.stringify(reg));
                            } else {
                                reg.push({ name: name, email: emailToUse, role: role, password: null, avatar: null, profilePhoto: null, pending: false });
                                localStorage.setItem('spa_registered_users', JSON.stringify(reg));
                            }
                        } catch(e) {}

                        localStorage.setItem('spa_user', JSON.stringify({ name: name, email: emailToUse, role: role, avatar: null, profilePhoto: null }));
                        localStorage.removeItem('spa_emailForSignIn');

                        // Clean URL then redirect
                        history.replaceState(null, '', window.location.pathname);
                        showToast('✅ Email verified! Welcome, ' + name + '!');
                        setTimeout(function(){ redirect(role); }, 1200);
                    })
                    .catch(function(err) {
                        showToast('Verification failed: ' + err.message);
                        console.warn('[EmailLink]', err.code, err.message);
                    });
            }
            return; // Stop rest of login page init while verifying
        }
    }
    // ── End email link handler ────────────────────────────────────────────────

    // Google sign-in
    var googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.addEventListener("click", function () {
            if (!firebaseReady) {
                showToast("Firebase not set up yet. Please check your config.");
                return;
            }
            var provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(function (result) {
                    var gUser = result.user;

                    // ── FIX: Sync from Firestore first so the latest role is used ──
                    // This ensures staff/admin roles assigned by the admin are picked up
                    // even if this is a different device or browser.
                    function continueGoogleLogin() {
                        var existingRole = "client";
                        try {
                            var reg = JSON.parse(localStorage.getItem("spa_registered_users") || "[]");
                            var found = reg.find(function (u) { return u.email === gUser.email; });
                            if (found && found.role) existingRole = found.role;
                        } catch (e) { }

                        var userData = {
                            name: gUser.displayName,
                            email: gUser.email,
                            role: existingRole,
                            avatar: gUser.photoURL,
                            profilePhoto: gUser.photoURL
                        };

                        // Save/update user in registered users list (preserves role if already set)
                        saveGoogleUserToLocal(userData);
                        localStorage.setItem("spa_user", JSON.stringify(userData));
                        showToast("Welcome, " + gUser.displayName + "! Redirecting...");
                        setTimeout(function () { redirect(existingRole); }, 900);
                    }

                    if (typeof syncUsersFromFirestore === 'function') {
                        showToast("Signing in...");
                        syncUsersFromFirestore(function () { continueGoogleLogin(); });
                    } else {
                        continueGoogleLogin();
                    }
                })
                .catch(function (error) {
                    showToast("Google sign-in failed: " + error.message);
                });
        });
    }

    var signInBtn = document.getElementById("signInBtn");
    if (signInBtn) signInBtn.addEventListener("click", signInEmail);

    var pwField = document.getElementById("password");
    if (pwField) pwField.addEventListener("keydown", function (e) {
        if (e.key === "Enter") signInEmail();
    });

    function signInEmail() {
        var email = document.getElementById("email").value.trim().toLowerCase();
        var password = document.getElementById("password").value;

        if (!email) { shakeField("email"); showToast("Please enter your email."); return; }
        if (!password) { shakeField("password"); showToast("Please enter your password."); return; }

        if (!firebaseReady || !auth) {
            showToast("Firebase not set up yet. Please check your config.");
            return;
        }

        setBusy(true);
        doFirebaseLogin(email, password);
    }

    // ── Real Firebase Auth sign-in, with one-time lazy migration for accounts
    //    that were created before this upgrade (still living in localStorage /
    //    the hardcoded USERS list with a plaintext password). ──────────────
    function doFirebaseLogin(email, password) {
        var lock = getLoginLock(email);
        if (lock && lock.until > Date.now()) {
            setBusy(false);
            showLockoutCountdown(email, lock.until);
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(function (cred) {
                clearLoginAttempts(email);
                // The Firestore Security Rules only allow reading the `users`
                // collection once signed in, so we sync AFTER auth succeeds
                // (not before — doing it before would silently fail now).
                if (typeof syncUsersFromFirestore === 'function') {
                    syncUsersFromFirestore(function () { onFirebaseLoginSuccess(cred.user); });
                } else {
                    onFirebaseLoginSuccess(cred.user);
                }
            })
            .catch(function (err) {
                // Modern Firebase projects often have email-enumeration protection on,
                // which returns a generic 'invalid-credential' for BOTH "no such account"
                // and "wrong password" — so we can't rely on 'user-not-found' alone to
                // know this is a pre-migration legacy account. Try a legacy match on any
                // of these codes; it only succeeds if the password actually matches the
                // stored legacy record, so it's safe to attempt.
                var maybeLegacy = (err.code === 'auth/user-not-found' ||
                    err.code === 'auth/invalid-credential' ||
                    err.code === 'auth/wrong-password');
                if (maybeLegacy) {
                    var legacy = findLegacyAccount(email, password);
                    if (legacy) {
                        migrateLegacyAccountToFirebaseAuth(legacy, password);
                        return;
                    }
                }
                setBusy(false);
                if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
                    var attempts = recordFailedAttempt(email);
                    if (attempts >= 5) {
                        var until = Date.now() + 5 * 60 * 1000;
                        setLoginLock(email, until);
                        showLockoutCountdown(email, until);
                    } else {
                        showToast("Incorrect email or password. (" + (5 - attempts) + " attempt(s) left before a temporary lock.)");
                    }
                } else if (err.code === 'auth/too-many-requests') {
                    showToast("Too many attempts. Please wait a moment and try again.");
                } else {
                    showToast("Sign-in failed: " + (err.message || "please try again."));
                }
                shakeField("password");
            });
    }

    // ── Login attempt lockout (5 fails -> 5 minute lock) ───────────────────
    var LOGIN_ATTEMPTS_KEY = 'spa_loginAttempts';

    function getLoginAttemptsStore() {
        try { return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveLoginAttemptsStore(store) {
        localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(store));
    }
    function recordFailedAttempt(email) {
        var store = getLoginAttemptsStore();
        var rec = store[email] || { count: 0 };
        rec.count += 1;
        store[email] = rec;
        saveLoginAttemptsStore(store);
        return rec.count;
    }
    function clearLoginAttempts(email) {
        var store = getLoginAttemptsStore();
        delete store[email];
        saveLoginAttemptsStore(store);
    }
    function setLoginLock(email, until) {
        var store = getLoginAttemptsStore();
        store[email] = { count: 0, until: until };
        saveLoginAttemptsStore(store);
    }
    function getLoginLock(email) {
        var store = getLoginAttemptsStore();
        return store[email] || null;
    }
    function showLockoutCountdown(email, until) {
        var btn = document.getElementById("signInBtn");
        var label = document.getElementById("btnLabel");
        btn.disabled = true;
        function tick() {
            var msLeft = until - Date.now();
            if (msLeft <= 0) {
                btn.disabled = false;
                label.textContent = "Sign In";
                showToast("You can try signing in again now.");
                return;
            }
            var mins = Math.floor(msLeft / 60000);
            var secs = Math.floor((msLeft % 60000) / 1000);
            label.textContent = "Locked — " + mins + ":" + (secs < 10 ? '0' : '') + secs;
            setTimeout(tick, 1000);
        }
        showToast("Too many failed attempts. Account temporarily locked for 5 minutes.");
        tick();
    }

    // Looks for a match in the hardcoded USERS list or the localStorage registered-users
    // cache — this is the pre-upgrade "database" for email/password accounts.
    function findLegacyAccount(email, password) {
        for (var i = 0; i < USERS.length; i++) {
            if (USERS[i].email === email && USERS[i].password === password) return USERS[i];
        }
        try {
            var reg = JSON.parse(localStorage.getItem("spa_registered_users") || "[]");
            for (var j = 0; j < reg.length; j++) {
                if (reg[j].email === email && reg[j].password === password) return reg[j];
            }
        } catch (e) { }
        return null;
    }

    // Creates a real Firebase Auth account for a legacy user (using the password they
    // just typed correctly), carries their existing role/profile over, and marks them
    // "legacyVerified" so they aren't locked out waiting on a verification email they
    // never had to deal with before. A verification email is still sent in the background.
    function migrateLegacyAccountToFirebaseAuth(legacy, password) {
        auth.createUserWithEmailAndPassword(legacy.email, password)
            .then(function (cred) {
                cred.user.sendEmailVerification().catch(function () { });
                var profile = {
                    name: legacy.name,
                    email: legacy.email,
                    role: legacy.role || 'client',
                    avatar: legacy.avatar || null,
                    profilePhoto: legacy.profilePhoto || null,
                    phone: legacy.phone || null,
                    gender: legacy.gender || null,
                    password: null,           // never store plaintext passwords anymore
                    legacyVerified: true,
                    uid: cred.user.uid
                };
                if (typeof addRegisteredUser === 'function') addRegisteredUser(profile);
                clearLoginAttempts(legacy.email);
                onFirebaseLoginSuccess(cred.user, profile);
            })
            .catch(function (err) {
                setBusy(false);
                if (err.code === 'auth/email-already-in-use') {
                    showToast("This account already has a newer password set. Try that, or use Forgot Password.");
                } else {
                    showToast("Sign-in failed: " + (err.message || "please try again."));
                }
            });
    }

    function onFirebaseLoginSuccess(fbUser, knownProfile) {
        var profile = knownProfile || getUserByEmail(fbUser.email) || {};
        var isLegacyVerified = !!profile.legacyVerified;

        if (!fbUser.emailVerified && !isLegacyVerified) {
            auth.signOut();
            setBusy(false);
            showToast("Please verify your email first. Check your inbox for the verification link.");
            showResendVerification(fbUser.email);
            return;
        }

        var role = profile.role || 'client';
        var name = profile.name || fbUser.displayName || fbUser.email.split('@')[0];
        showToast("Welcome, " + name + "! Redirecting...");
        localStorage.setItem("spa_user", JSON.stringify({
            name: name,
            role: role,
            email: fbUser.email,
            avatar: profile.avatar || null,
            profilePhoto: profile.profilePhoto || null,
            phone: profile.phone || null,
            gender: profile.gender || null
        }));
        setTimeout(function () { redirect(role); }, 900);
    }

    // Shows a small "resend verification email" affordance under the password field
    // when login is blocked because the account isn't verified yet.
    function showResendVerification(email) {
        var existing = document.getElementById('resendVerifyRow');
        if (existing) existing.remove();
        var row = document.createElement('div');
        row.id = 'resendVerifyRow';
        row.style.cssText = 'text-align:center;font-size:.8rem;margin-top:10px;';
        row.innerHTML = '<a href="#" id="resendVerifyLink" style="color:var(--fern,#4a7c59);font-weight:500;text-decoration:none;">Resend verification email</a>';
        document.getElementById('signInBtn').insertAdjacentElement('afterend', row);
        document.getElementById('resendVerifyLink').addEventListener('click', function (e) {
            e.preventDefault();
            var password = document.getElementById('password').value;
            if (!password) { showToast('Enter your password again to resend the link.'); return; }
            auth.signInWithEmailAndPassword(email, password).then(function (cred) {
                cred.user.sendEmailVerification()
                    .then(function () { showToast('Verification email resent. Check your inbox.'); auth.signOut(); })
                    .catch(function (err) { showToast('Could not resend: ' + err.message); auth.signOut(); });
            }).catch(function () {
                showToast('Enter your correct password above, then tap resend.');
            });
        });
    }

    // ── Forgot Password ─────────────────────────────────────────────────────
    var forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', function (e) {
            e.preventDefault();
            openForgotModal();
        });
    }

    function openForgotModal() {
        var overlay = document.getElementById('forgotModalOverlay');
        if (!overlay) return;
        var emailField = document.getElementById('forgotEmail');
        var loginEmail = document.getElementById('email');
        if (emailField && loginEmail && loginEmail.value) emailField.value = loginEmail.value.trim();
        overlay.classList.add('open');
        if (emailField) {
            emailField.focus();
            emailField.onkeydown = function (e) { if (e.key === 'Enter') window.sendForgotPasswordEmail(); };
        }
    }

    window.closeForgotModal = function () {
        var overlay = document.getElementById('forgotModalOverlay');
        if (overlay) overlay.classList.remove('open');
    };

    window.sendForgotPasswordEmail = function () {
        var emailField = document.getElementById('forgotEmail');
        var email = emailField ? emailField.value.trim().toLowerCase() : '';
        if (!email || !isValidEmailLocal(email)) {
            showToast('Please enter a valid email address.');
            return;
        }
        if (!firebaseReady || !auth) {
            showToast('Firebase not set up yet.');
            return;
        }
        setForgotBusy(true);
        auth.sendPasswordResetEmail(email)
            .then(function () { finishForgotPassword(); })
            .catch(function (err) {
                if (err.code === 'auth/user-not-found') {
                    // Maybe a legacy (pre-migration) account — migrate it using its
                    // own stored password, then send the reset link right away.
                    var legacy = getUserByEmail ? getUserByEmail(email) : null;
                    var legacyPw = legacy && legacy.password ? legacy.password : null;
                    if (!legacyPw) {
                        for (var i = 0; i < USERS.length; i++) {
                            if (USERS[i].email === email) { legacyPw = USERS[i].password; legacy = USERS[i]; break; }
                        }
                    }
                    if (legacy && legacyPw) {
                        auth.createUserWithEmailAndPassword(email, legacyPw)
                            .then(function (cred) {
                                var profile = {
                                    name: legacy.name, email: legacy.email, role: legacy.role || 'client',
                                    avatar: legacy.avatar || null, profilePhoto: legacy.profilePhoto || null,
                                    phone: legacy.phone || null, password: null, legacyVerified: true, uid: cred.user.uid
                                };
                                if (typeof addRegisteredUser === 'function') addRegisteredUser(profile);
                                return auth.sendPasswordResetEmail(email).finally(function () { auth.signOut(); });
                            })
                            .then(function () { finishForgotPassword(); })
                            .catch(function () { finishForgotPassword(); }); // stay enumeration-safe either way
                        return;
                    }
                }
                // Enumeration-safe: show the same success message regardless.
                finishForgotPassword();
            });
    };

    function finishForgotPassword() {
        setForgotBusy(false);
        showToast('If that email is registered, a reset link has been sent.');
        window.closeForgotModal();
    }

    function setForgotBusy(on) {
        var btn = document.getElementById('forgotSendBtn');
        if (btn) btn.disabled = on;
        var label = document.getElementById('forgotSendLabel');
        if (label) label.textContent = on ? 'Sending…' : 'Send Reset Link';
    }

    function isValidEmailLocal(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    // Password toggle
    var pwToggle = document.getElementById("pwToggle");
    if (pwToggle) {
        pwToggle.addEventListener("click", function () {
            var input = document.getElementById("password");
            var icon = document.getElementById("eyeIcon");
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            icon.innerHTML = show
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
        });
    }

});

function redirect(role) { window.location.href = DASHBOARDS[role] || DASHBOARDS.client; }

function setBusy(on) {
    document.getElementById("btnLabel").style.display = on ? "none" : "block";
    document.getElementById("spin").style.display = on ? "block" : "none";
    document.getElementById("signInBtn").disabled = on;
}

function shakeField(id) {
    var el = document.getElementById(id);
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    el.addEventListener("animationend", function () { el.classList.remove("shake"); }, { once: true });
}

function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove("show"); }, 3500);
}

function saveGoogleUserToLocal(userData) {
    try {
        if (typeof addRegisteredUser === 'function') {
            // ── FIX: Only update name/avatar — never overwrite an existing role ──
            var existingList = JSON.parse(localStorage.getItem("spa_registered_users") || "[]");
            var existing = existingList.find(function (u) { return u.email === userData.email; });
            var roleToSave = (existing && existing.role) ? existing.role : userData.role;

            addRegisteredUser({
                name: userData.name,
                email: userData.email,
                role: roleToSave,
                avatar: userData.avatar || null,
                profilePhoto: userData.profilePhoto || null,
                password: null
            });
        } else {
            var list = JSON.parse(localStorage.getItem("spa_registered_users") || "[]");
            var exists = list.some(function (u) { return u.email === userData.email; });
            if (!exists) {
                list.push({
                    name: userData.name, email: userData.email, role: userData.role,
                    avatar: userData.avatar || null, profilePhoto: userData.profilePhoto || null, password: null
                });
                localStorage.setItem("spa_registered_users", JSON.stringify(list));
            }
            // If already exists, don't overwrite — role stays as-is
        }
    } catch (e) { }
}