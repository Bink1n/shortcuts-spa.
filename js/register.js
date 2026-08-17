var selectedAvatar = '';

function makeToggle(btnId, inputId, iconId) {
    document.getElementById(btnId).addEventListener('click', function () {
        var input = document.getElementById(inputId);
        var icon = document.getElementById(iconId);
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.innerHTML = show
            ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
            : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
    });
}
makeToggle('pwToggle1', 'regPassword', 'eyeIcon1');
makeToggle('pwToggle2', 'regConfirm', 'eyeIcon2');

document.getElementById('regPassword').addEventListener('input', function () {
    var val = this.value;
    var score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    var segs = [document.getElementById('seg1'), document.getElementById('seg2'),
        document.getElementById('seg3'), document.getElementById('seg4')];
    var labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    var cls = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong'];

    segs.forEach(function (s, i) {
        s.className = 'strength-seg' + (i < score ? ' ' + cls[score] : '');
    });
    document.getElementById('strengthLabel').textContent = val.length ? labels[score] : '';
    document.getElementById('strengthLabel').style.color =
        score === 1 ? '#ef4444' : score === 2 ? '#f59e0b' : score === 3 ? 'var(--sage)' : score === 4 ? 'var(--fern)' : '';

    if (val.length >= 8) hideHint('hintPass');
});

document.getElementById('phone').addEventListener('input', function () {
    var raw = this.value.replace(/\D/g, '');
    if (raw.length > 11) raw = raw.slice(0, 11);
    this.value = raw;
});

document.getElementById('regEmail').addEventListener('blur', function () {
    if (this.value && !isValidEmail(this.value)) {
        showHint('hintEmail');
        shakeField('regEmail');
    } else if (this.value) {
        hideHint('hintEmail');
    }
});

document.getElementById('regConfirm').addEventListener('blur', function () {
    var pass = document.getElementById('regPassword').value;
    if (this.value && this.value !== pass) {
        showHint('hintConfirm');
        shakeField('regConfirm');
    } else {
        hideHint('hintConfirm');
    }
});

document.getElementById('googleRegBtn').addEventListener('click', function () {
    if (typeof firebaseReady === 'undefined' || !firebaseReady) {
        showToast('Firebase is not configured yet.');
        return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(function (result) {
            var gUser = result.user;
            // Preserve existing role if the user is already registered (e.g. assigned as staff)
            var existingList = JSON.parse(localStorage.getItem('spa_registered_users') || '[]');
            var existingUser = existingList.find(function (u) { return u.email === gUser.email; });
            var roleToUse = (existingUser && existingUser.role) ? existingUser.role : 'client';
            var googleUserObj = {
                name: gUser.displayName,
                email: gUser.email,
                role: roleToUse,
                avatar: gUser.photoURL || '',
                profilePhoto: gUser.photoURL || null,
                password: null
            };
            if (typeof addRegisteredUser === 'function') {
                addRegisteredUser(googleUserObj);
            } else {
                var list = JSON.parse(localStorage.getItem('spa_registered_users') || '[]');
                var exists = list.some(function (u) { return u.email === gUser.email; });
                if (!exists) { list.push(googleUserObj); localStorage.setItem('spa_registered_users', JSON.stringify(list)); }
            }
            localStorage.setItem('spa_user', JSON.stringify({
                name: gUser.displayName,
                email: gUser.email,
                role: roleToUse,
                avatar: gUser.photoURL || '',
                profilePhoto: gUser.photoURL || null
            }));
            showToast('Welcome, ' + gUser.displayName + '! Redirecting...');
            setTimeout(function () { window.location.href = roleToUse === 'staff' ? 'dashboard-staff.html' : 'dashboard-client.html'; }, 1000);
        })
        .catch(function (error) {
            showToast('Google sign-up failed: ' + error.message);
        });
});

document.getElementById('registerBtn').addEventListener('click', registerUser);
document.getElementById('regConfirm').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') registerUser();
});

function registerUser() {
    var firstName = document.getElementById('firstName').value.trim();
    var lastName = document.getElementById('lastName').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var email = document.getElementById('regEmail').value.trim().toLowerCase();
    var password = document.getElementById('regPassword').value;
    var confirm = document.getElementById('regConfirm').value;
    var terms = document.getElementById('terms').checked;
    var isValid = true;

    ['hintFirst', 'hintLast', 'hintPhone', 'hintEmail', 'hintPass', 'hintConfirm', 'hintTerms']
        .forEach(function (id) { hideHint(id); });

    if (!firstName) { showHint('hintFirst'); shakeField('firstName'); isValid = false; }
    if (!lastName) { showHint('hintLast'); shakeField('lastName'); isValid = false; }

    if (phone && !/^09\d{9}$/.test(phone)) {
        showHint('hintPhone'); shakeField('phone'); isValid = false;
    }

    if (!email || !isValidEmail(email)) {
        showHint('hintEmail'); shakeField('regEmail'); isValid = false;
    } else {
        var takenEmails = ['admin@gmail.com'];
        try {
            var regList = JSON.parse(localStorage.getItem('spa_registered_users') || '[]');
            regList.forEach(function (u) { takenEmails.push(u.email); });
        } catch (e) { }
        if (takenEmails.indexOf(email) !== -1) {
            document.getElementById('hintEmail').textContent = 'This email is already registered.';
            showHint('hintEmail'); shakeField('regEmail'); isValid = false;
        } else {
            document.getElementById('hintEmail').textContent = 'Please enter a valid email address.';
        }
    }

    if (!password || password.length < 8) {
        showHint('hintPass'); shakeField('regPassword'); isValid = false;
    }

    if (!confirm || confirm !== password) {
        showHint('hintConfirm'); shakeField('regConfirm'); isValid = false;
    }

    if (!terms) {
        showHint('hintTerms'); isValid = false;
    }

    if (!isValid) {
        showToast('Please fix the errors above.');
        return;
    }

    setBusyReg(true);

    if (typeof firebaseReady === 'undefined' || !firebaseReady || !auth) {
        setBusyReg(false);
        showToast('Firebase is not configured yet.');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
            var profile = {
                email: email,
                role: 'client',
                name: firstName + ' ' + lastName,
                phone: phone,
                avatar: selectedAvatar,
                profilePhoto: null,
                password: null,          // never store plaintext passwords
                legacyVerified: false,
                uid: cred.user.uid
            };
            if (typeof addRegisteredUser === 'function') {
                addRegisteredUser(profile);
            } else {
                var allUsers = JSON.parse(localStorage.getItem('spa_registered_users') || '[]');
                allUsers.push(profile);
                localStorage.setItem('spa_registered_users', JSON.stringify(allUsers));
            }
            return cred.user.sendEmailVerification().then(function () { return profile; });
        })
        .then(function (profile) {
            setBusyReg(false);
            if (typeof logActivity === 'function') logActivity('Registration', profile.name, profile.email);
            if (typeof createNotification === 'function') {
                createNotification({
                    recipientRole: 'admin', type: 'new_registration', title: 'New Customer Registration',
                    message: profile.name + ' (' + profile.email + ') created a new account.'
                });
            }
            showVerificationScreen(profile.email, profile.name, profile.role);
        })
        .catch(function (err) {
            setBusyReg(false);
            if (err.code === 'auth/email-already-in-use') {
                document.getElementById('hintEmail').textContent = 'This email is already registered.';
                showHint('hintEmail'); shakeField('regEmail');
            } else if (err.code === 'auth/weak-password') {
                document.getElementById('hintPass').textContent = 'Please choose a stronger password.';
                showHint('hintPass'); shakeField('regPassword');
            } else if (err.code === 'auth/invalid-email') {
                showHint('hintEmail'); shakeField('regEmail');
            } else {
                showToast('Could not create account: ' + (err.message || 'please try again.'));
            }
        });
}

// ── Verification screen: swaps the registration form for a "check your email"
//    panel, and lets the user confirm once they've clicked the link (without
//    forcing them to recreate the account) or resend it. ────────────────────
function showVerificationScreen(email, name, role) {
    document.getElementById('registerFormWrap').style.display = 'none';
    document.getElementById('verifyPanel').style.display = 'block';
    document.getElementById('verifyEmailLabel').textContent = email;

    document.getElementById('verifyCheckBtn').addEventListener('click', function () {
        setVerifyBusy(true);
        var user = auth.currentUser;
        if (!user) { setVerifyBusy(false); showToast('Session expired — please sign in to continue.'); return; }
        user.reload().then(function () {
            if (user.emailVerified) {
                localStorage.setItem('spa_user', JSON.stringify({
                    name: name, role: role, email: email, avatar: selectedAvatar, profilePhoto: null
                }));
                showToast('Email verified! Welcome, ' + name + '!');
                setTimeout(function () { window.location.href = 'dashboard-client.html'; }, 900);
            } else {
                setVerifyBusy(false);
                showToast('Not verified yet — please click the link in your email first.');
            }
        }).catch(function (err) {
            setVerifyBusy(false);
            showToast('Could not check status: ' + err.message);
        });
    });

    document.getElementById('resendVerifyRegLink').addEventListener('click', function (e) {
        e.preventDefault();
        var user = auth.currentUser;
        if (!user) { showToast('Session expired — please register again.'); return; }
        user.sendEmailVerification()
            .then(function () { showToast('Verification email resent.'); })
            .catch(function (err) { showToast('Could not resend: ' + err.message); });
    });
}

function setVerifyBusy(on) {
    document.getElementById('verifyCheckLabel').style.display = on ? 'none' : 'block';
    document.getElementById('verifyCheckSpin').style.display = on ? 'block' : 'none';
    document.getElementById('verifyCheckBtn').disabled = on;
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function showHint(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('show');
}

function hideHint(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

function setBusyReg(on) {
    document.getElementById('regBtnLabel').style.display = on ? 'none' : 'block';
    document.getElementById('regSpin').style.display = on ? 'block' : 'none';
    document.getElementById('registerBtn').disabled = on;
}

function shakeField(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    el.addEventListener('animationend', function () { el.classList.remove('shake'); }, { once: true });
}

function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 3500);
}