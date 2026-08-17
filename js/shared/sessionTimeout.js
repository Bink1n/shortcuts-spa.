// ─────────────────────────────────────────────────────────────────────────
// initSessionTimeout() — logs the user out after 15 minutes of inactivity,
// with a 60-second warning first. Call once per dashboard page (already
// wired into requireRole() in authGuard.js — no need to call it yourself).
// ─────────────────────────────────────────────────────────────────────────

var SPA_IDLE_LIMIT_MS = 15 * 60 * 1000;      // 15 minutes
var SPA_WARNING_LEAD_MS = 60 * 1000;         // show warning 60s before logout

var _spaIdleTimer = null;
var _spaWarningTimer = null;
var _spaCountdownInterval = null;

function initSessionTimeout() {
    if (window._spaSessionTimeoutInit) return; // don't double-init
    window._spaSessionTimeoutInit = true;

    ['mousemove', 'mousedown', 'click', 'touchstart', 'keydown', 'scroll'].forEach(function (evt) {
        document.addEventListener(evt, resetSpaIdleTimer, { passive: true });
    });

    resetSpaIdleTimer();
}

function resetSpaIdleTimer() {
    // If the warning modal is already showing, activity there is handled by
    // its own buttons — ignore generic page activity so the modal doesn't
    // vanish out from under a user who's just reading it.
    if (document.getElementById('sessionWarningOverlay')) return;

    clearTimeout(_spaIdleTimer);
    clearTimeout(_spaWarningTimer);
    _spaIdleTimer = setTimeout(showSessionWarning, SPA_IDLE_LIMIT_MS - SPA_WARNING_LEAD_MS);
}

function showSessionWarning() {
    if (document.getElementById('sessionWarningOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'sessionWarningOverlay';
    overlay.className = 'modal-overlay open';
    overlay.innerHTML =
        '<div class="modal" style="max-width:380px;text-align:center;">' +
        '  <h3 class="modal-title" style="margin-bottom:10px;">Still there?</h3>' +
        '  <p style="font-size:.87rem;color:var(--stone,#888);margin-bottom:6px;">' +
        '    Your session will expire in <strong id="sessionCountdown">60</strong> seconds due to inactivity.' +
        '  </p>' +
        '  <div class="modal-actions" style="margin-top:20px;">' +
        '    <button class="btn-modal-primary" id="staySignedInBtn">Stay Logged In</button>' +
        '    <button class="btn-modal-primary" id="logoutNowBtn" style="background:linear-gradient(135deg,#b04a4a,#7a2e2e);">Logout Now</button>' +
        '  </div>' +
        '</div>';
    document.body.appendChild(overlay);

    var secondsLeft = 60;
    _spaCountdownInterval = setInterval(function () {
        secondsLeft -= 1;
        var el = document.getElementById('sessionCountdown');
        if (el) el.textContent = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(_spaCountdownInterval);
            doSpaSessionExpire();
        }
    }, 1000);

    document.getElementById('staySignedInBtn').addEventListener('click', function () {
        clearInterval(_spaCountdownInterval);
        overlay.remove();
        resetSpaIdleTimer();
    });
    document.getElementById('logoutNowBtn').addEventListener('click', function () {
        clearInterval(_spaCountdownInterval);
        doSpaSessionExpire();
    });

    _spaWarningTimer = setTimeout(doSpaSessionExpire, SPA_WARNING_LEAD_MS);
}

function doSpaSessionExpire() {
    var overlay = document.getElementById('sessionWarningOverlay');
    if (overlay) overlay.remove();
    if (typeof spaLogout === 'function') {
        spaLogout();
    } else {
        localStorage.removeItem('spa_user');
        window.location.href = '../index.html';
    }
}
