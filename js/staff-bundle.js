// ── js/staff/session/initUser.js ────────────────────────────────
var user = null;
try { user = JSON.parse(localStorage.getItem('spa_user')); } catch (e) { }
if (!user || user.role !== 'staff') { window.location.href = '../index.html'; }

function paintStaffUser(u) {
    var ini = u.name.charAt(0).toUpperCase();
    document.getElementById('sidebarAvatar').textContent = ini;
    document.getElementById('sidebarName').textContent = u.name;
    document.getElementById('profileAvatar').textContent = ini;
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileEmail').textContent = u.email;
    document.getElementById('nameInput').value = u.name;
    if (u.specialization && document.getElementById('specInput')) {
        document.getElementById('specInput').value = u.specialization;
    }
}
if (user) paintStaffUser(user);
document.getElementById('statCatalog').textContent = getServices().length;
document.getElementById('pageSubtitle').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

requireRole('staff', function (verifiedUser) {
    user = verifiedUser;
    paintStaffUser(user);
    if (typeof initStaffNotifBell === 'function') initStaffNotifBell();
});

// ── js/staff/shared/escHtml.js ────────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── js/staff/notifications/bell.js ─────────────────────────────────
// Reads notifications/{id} where recipientEmail == this staff member's own
// email — a single equality filter, matching the Firestore Rule that scopes
// staff notifications by email (appointments only store a staff NAME, so
// email is what the notification-creation step in shared-data.js resolves
// it to).
var STAFF_NOTIF_META = {
    new_appointment: '📅', appointment_confirmed: '✅', appointment_rescheduled: '🔁',
    appointment_cancelled: '🚫', new_message: '💬'
};
var _staffNotifUnsub = null;
var _staffNotifCache = [];

function initStaffNotifBell() {
    if (!user || _staffNotifUnsub) return;
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) { showStaffNotifError(); return; }
    _staffNotifUnsub = db.collection('notifications')
        .where('recipientEmail', '==', user.email.toLowerCase().trim())
        .limit(30)
        .onSnapshot(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(Object.assign({ _id: doc.id }, doc.data())); });
            items.sort(function (a, b) {
                var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
                var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });
            _staffNotifCache = items;
            renderStaffNotifDropdown(items);
        }, function (e) { console.warn('staff notif listener error:', e); showStaffNotifError(); });
}
function stopStaffNotifBell() {
    if (_staffNotifUnsub) { _staffNotifUnsub(); _staffNotifUnsub = null; }
}
window.addEventListener('beforeunload', stopStaffNotifBell);

function showStaffNotifError() {
    var list = document.getElementById('notifList');
    if (list) list.innerHTML = '<div class="notif-empty">Unable to load notifications.</div>';
}

function toggleStaffNotifDropdown(e) {
    if (e) e.stopPropagation();
    var dd = document.getElementById('notifDropdown');
    if (!dd) return;
    var willOpen = !dd.classList.contains('open');
    dd.classList.toggle('open', willOpen);
    if (willOpen) markStaffNotifsRead(_staffNotifCache);
}
document.addEventListener('click', function (e) {
    var dd = document.getElementById('notifDropdown');
    var wrap = document.getElementById('notifBellBtn');
    if (dd && dd.classList.contains('open') && wrap && !dd.contains(e.target) && e.target !== wrap && !wrap.contains(e.target)) {
        dd.classList.remove('open');
    }
});

function markStaffNotifsRead(items) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) return;
    var unread = items.filter(function (n) { return !n.read; }).slice(0, 20);
    if (!unread.length) return;
    var batch = db.batch();
    unread.forEach(function (n) { batch.update(db.collection('notifications').doc(n._id), { read: true }); });
    batch.commit().catch(function (e) { console.warn('markStaffNotifsRead error:', e); });
}

function staffNotifItemClick(id) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (db && id) db.collection('notifications').doc(id).update({ read: true }).catch(function () { });
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.remove('open');
    if (typeof showSection === 'function') showSection('today');
}

function staffRelativeTime(ts) {
    if (!ts) return '';
    var date = (ts && typeof ts.toDate === 'function') ? ts.toDate() : new Date(ts);
    var secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return secs + 's ago';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + ' minute' + (mins !== 1 ? 's' : '') + ' ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hour' + (hrs !== 1 ? 's' : '') + ' ago';
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + ' day' + (days !== 1 ? 's' : '') + ' ago';
    return date.toLocaleDateString();
}

function renderStaffNotifDropdown(items) {
    var list = document.getElementById('notifList');
    var badge = document.getElementById('notifBadge');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    list.innerHTML = items.slice(0, 15).map(function (n) {
        var icon = STAFF_NOTIF_META[n.type] || '🔔';
        return '<div class="notif-item' + (!n.read ? ' unread' : '') + '" onclick="staffNotifItemClick(\'' + n._id + '\')" role="button" tabindex="0">'
            + '<span class="notif-item-icon">' + icon + '</span>'
            + '<div class="notif-item-body">'
            + '<div class="notif-item-text"><strong>' + escHtml(n.title || '') + '</strong><br>' + escHtml(n.message || '') + '</div>'
            + '<div class="notif-item-time">' + staffRelativeTime(n.createdAt) + '</div>'
            + '</div>'
            + (!n.read ? '<span class="notif-unread-dot"></span>' : '')
            + '</div>';
    }).join('');

    var unreadCount = items.filter(function (n) { return !n.read; }).length;
    if (badge) {
        if (unreadCount > 0) { badge.textContent = unreadCount > 9 ? '9+' : unreadCount; badge.style.display = 'flex'; }
        else { badge.style.display = 'none'; }
    }
}

// ── js/staff/schedule/state.js ──────────────────────────────────
var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── js/staff/schedule/getTodayStr.js ────────────────────────────
function getTodayStr() { return new Date().toISOString().split('T')[0]; }

// ── js/staff/schedule/getMyAppts.js ─────────────────────────────
function getMyAppts() {
    var all = getSharedAppts();
    if (!user) return all;
    return all.filter(function (a) {
        return a.staff === user.name || a.staff === 'Any available staff';
    });
}

// ── js/staff/schedule/buildTodayData.js ─────────────────────────
function buildTodayData() {
    var today = getTodayStr();
    return getMyAppts().filter(function (a) { return a.date === today && a.status !== 'cancelled'; })
        .map(function (a) {
            return {
                id: a.id, time: a.time, client: a.clientName || a.clientEmail,
                service: a.service, duration: 'varies', status: a.status === 'confirmed' ? 'confirmed' : a.status
            };
        });
}

// ── js/staff/schedule/buildWeekData.js ──────────────────────────
function buildWeekData() {
    var now = new Date();
    var startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    var endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
    var start = startOfWeek.toISOString().split('T')[0];
    var end = endOfWeek.toISOString().split('T')[0];
    return getMyAppts().filter(function (a) { return a.date >= start && a.date <= end && a.status !== 'cancelled'; })
        .map(function (a) {
            var d = new Date(a.date + 'T00:00:00');
            return {
                day: DAYS[d.getDay()], time: a.time, client: a.clientName || a.clientEmail,
                service: a.service, status: a.status
            };
        });
}

// ── js/staff/clients/buildMyClients.js ──────────────────────────
function buildMyClients() {
    var seen = {}; var result = [];
    getMyAppts().forEach(function (a) {
        var name = a.clientName || a.clientEmail;
        if (!seen[name]) {
            seen[name] = { name: name, visits: 1, last: a.date, fav: a.service };
            result.push(seen[name]);
        } else {
            seen[name].visits++;
            if (a.date > seen[name].last) seen[name].last = a.date;
        }
    });
    return result;
}

// ── js/staff/schedule/todayDataInit.js ──────────────────────────
var todayData = buildTodayData();

// ── js/staff/schedule/sb.js ─────────────────────────────────────
function sb(s) { var c = { confirmed: 'b-confirmed', pending: 'b-pending', done: 'b-done' }[s] || ''; return '<span class="badge ' + c + '">' + s + '</span>'; }

// ── js/staff/schedule/renderToday.js ────────────────────────────
function renderToday() {
    todayData = buildTodayData();
    var done = todayData.filter(function (r) { return r.status === 'done'; }).length;
    var pend = todayData.filter(function (r) { return r.status !== 'done' && r.status !== 'cancelled'; }).length;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statPending').textContent = pend;
    if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = todayData.length;
    if (document.getElementById('statRemaining')) document.getElementById('statRemaining').textContent = pend + ' remaining';
    if (document.getElementById('statCatalog')) document.getElementById('statCatalog').textContent = getServices().length;

    // Update "Next: X:XX PM" dynamically
    var nextEl = document.getElementById('statNext');
    if (nextEl) {
        var upcoming = todayData.filter(function (r) { return r.status !== 'done' && r.status !== 'cancelled'; });
        nextEl.textContent = upcoming.length > 0 ? 'Next: ' + upcoming[0].time : '\u00a0';
    }
    document.getElementById('todayTable').innerHTML = todayData.length
        ? todayData.map(function (r) {
            return '<tr><td data-label="Time"><strong>' + r.time + '</strong></td><td data-label="Client">' + r.client + '</td><td data-label="Service">' + r.service + '</td><td data-label="Duration">' + r.duration + '</td><td data-label="Status">' + sb(r.status) + '</td>'
                + '<td>' + (r.status !== 'done' && r.status !== 'cancelled'
                    ? '<button class="action-btn done" onclick="markDoneById(' + r.id + ')">Mark Done</button>'
                    : '<span style="color:var(--stone);font-size:.78rem;">' + (r.status === 'done' ? '&#10003; Done' : r.status) + '</span>') + '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;color:var(--stone);padding:20px;">No appointments today.</td></tr>';
}

// ── js/staff/schedule/markDoneById.js ───────────────────────────
function markDoneById(id) {
    var appts = getSharedAppts();
    var appt = null;
    for (var i = 0; i < appts.length; i++) { if (String(appts[i].id) === String(id)) { appt = appts[i]; break; } }
    var priceNum = 0;
    var categoryName = 'Other';
    if (appt) {
        var svcs = getServices();
        for (var j = 0; j < svcs.length; j++) {
            if (svcs[j].name === appt.service) {
                priceNum = parseInt((svcs[j].price || '0').replace(/[^\d]/g, ''), 10) || 0;
                categoryName = svcs[j].category || 'Other';
                break;
            }
        }
    }
    updateApptStatus(id, 'done', {
        completedBy: user ? user.name : 'Staff',
        completedByEmail: user ? user.email : '',
        price: priceNum,
        category: categoryName
    });
    renderToday();
    showToast('Session marked done! ');
}

// ── js/staff/schedule/renderWeek.js ─────────────────────────────
function renderWeek(filter) {
    var weekData = buildWeekData();
    var rows = filter === 'all' ? weekData : weekData.filter(function (r) { return r.day === filter; });
    document.getElementById('weekTable').innerHTML = rows.length
        ? rows.map(function (r) {
            return '<tr><td data-label="Day"><strong>' + r.day + '</strong></td><td data-label="Time">' + r.time + '</td><td data-label="Client">' + r.client + '</td><td data-label="Service">' + r.service + '</td><td data-label="Status">' + sb(r.status) + '</td></tr>';
        }).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--stone);padding:20px;">No appointments this week.</td></tr>';
}

// ── js/staff/schedule/filterDay.js ──────────────────────────────
function filterDay(btn, day) { document.querySelectorAll('.day-btn').forEach(function (b) { b.classList.remove('active'); }); btn.classList.add('active'); renderWeek(day); }

// ── js/staff/clients/renderClients.js ───────────────────────────
function renderClients() {
    var myClients = buildMyClients();
    document.getElementById('clientCards').innerHTML = myClients.length
        ? myClients.map(function (c) {
            return '<div class="client-card">'
                + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">'
                + '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#42a5f5,#90caf9);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:14px;flex-shrink:0;">' + c.name.charAt(0) + '</div>'
                + '<div><div style="font-size:.87rem;font-weight:500;">' + c.name + '</div><div style="font-size:.72rem;color:var(--stone);">Last: ' + c.last + '</div></div></div>'
                + '<div style="font-size:.76rem;color:var(--stone);">Favorite: <strong style="color:var(--ink);">' + c.fav + '</strong></div>'
                + '<div style="font-size:.76rem;color:var(--stone);margin-top:3px;">Visits with you: <strong style="color:var(--ink);">' + c.visits + '</strong></div>'
                + '</div>';
        }).join('')
        : '<p style="color:var(--stone);padding:20px;">No clients yet for your appointments.</p>';
}

// ── js/staff/services/state.js ──────────────────────────────────
var staffActiveCat = 'All';

// ── js/staff/services/renderStaffCatTabs.js ─────────────────────
function renderStaffCatTabs() {
    var cats = ['All'].concat(getCategories());
    document.getElementById('staffCatTabs').innerHTML = cats.map(function (c) {
        return '<button class="cat-tab' + (c === staffActiveCat ? ' active' : '') + '" onclick="setStaffCat(\'' + c.replace(/'/g, "\\'") + '\')">' + (c === 'All' ? ' All' : c) + '</button>';
    }).join('');
}

// ── js/staff/services/setStaffCat.js ────────────────────────────
function setStaffCat(cat) { staffActiveCat = cat; renderStaffCatTabs(); renderStaffSvcs(); }

// ── js/staff/services/renderStaffSvcs.js ────────────────────────
function renderStaffSvcs() {
    var svcs = getServices();
    var q = (document.getElementById('staffSvcSearch') || { value: '' }).value.toLowerCase();
    if (staffActiveCat !== 'All') svcs = svcs.filter(function (s) { return s.category === staffActiveCat; });
    if (q) svcs = svcs.filter(function (s) { return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q); });
    document.getElementById('staffSvcCount').textContent = svcs.length + ' services';
    document.getElementById('staffSvcList').innerHTML = svcs.map(function (s) {
        return '<div class="svc-row">'
            + '<span class="svc-emoji">' + s.emoji + '</span>'
            + '<div class="svc-info"><div class="svc-name">' + s.name + '</div><div class="svc-cat">' + s.category + '</div></div>'
            + '<span class="svc-dur">' + s.duration + '</span>'
            + '<span class="svc-price">' + s.price + '</span>'
            + '</div>';
    }).join('');
}

// ── js/staff/navigation/showSection.js ──────────────────────────
function showSection(name) {
    ['today', 'week', 'clients', 'services', 'profile', 'confirmations'].forEach(function (s) { document.getElementById('section-' + s).style.display = s === name ? '' : 'none'; });
    document.querySelectorAll('.nav-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    document.querySelectorAll('.bn-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    var titles = { today: "Today's Schedule", week: "This Week", clients: "My Clients", services: "Service Menu", profile: "My Profile", confirmations: "Appointment Confirmations" };
    document.getElementById('pageTitle').textContent = titles[name] || '';
    document.getElementById('pageSubtitle').textContent = name === 'today' ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    if (name === 'today') renderToday();
    if (name === 'week') renderWeek('all');
    if (name === 'clients') renderClients();
    if (name === 'services') { renderStaffCatTabs(); renderStaffSvcs(); }
    if (name === 'confirmations') renderConfirmations();
    closeSidebar(); return false;
}

// ── js/staff/confirmations/getPendingConfirmations.js ───────────
function getPendingConfirmations() {
    return getMyAppts().filter(function (a) {
        return (a.status === 'confirmed' && a.staffConfirmed !== true) ||
               (a.status === 'pending');
    });
}

// ── js/staff/confirmations/renderConfirmations.js ───────────────
function renderConfirmations() {
    var pending = getPendingConfirmations();
    var declined = getMyAppts().filter(function (a) { return a.status === 'staff_declined' && a.staffDeclinedBy === (user ? user.name : ''); });
    var badge = document.getElementById('confirmBadge');
    if (badge) badge.textContent = pending.length > 0 ? pending.length : '';

    var container = document.getElementById('confirmList');
    if (!container) return;

    var html = '';

    if (pending.length === 0 && declined.length === 0) {
        html = '<div style="text-align:center;padding:48px 20px;color:var(--stone);">'
            + '<div style="font-size:2.5rem;margin-bottom:12px;"></div>'
            + '<div style="font-size:.95rem;font-weight:500;">All caught up!</div>'
            + '<div style="font-size:.8rem;margin-top:6px;">No appointments waiting for your confirmation.</div>'
            + '</div>';
    } else {
        if (pending.length > 0) {
            html += '<div style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--stone);margin-bottom:10px;">Awaiting Your Response (' + pending.length + ')</div>';
            html += pending.map(function (a) {
                var d = new Date(a.date + 'T00:00:00');
                var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return '<div class="confirm-card">'
                    + '<div class="confirm-card-left">'
                    + '<div class="confirm-date-block"><span class="cdate-day">' + d.getDate() + '</span><span class="cdate-mo">' + mo[d.getMonth()] + '</span></div>'
                    + '<div class="confirm-info">'
                    + '<div class="confirm-svc">' + a.service + '</div>'
                    + '<div class="confirm-meta">' + a.time + ' &middot; ' + (a.clientName || a.clientEmail) + '</div>'
                    + (a.notes ? '<div class="confirm-notes">"' + a.notes + '"</div>' : '')
                    + '</div>'
                    + '</div>'
                    + '<div class="confirm-actions">'
                    + '<button class="cbtn cbtn-accept" onclick="acceptAppt(' + a.id + ')"> Accept</button>'
                    + '<button class="cbtn cbtn-decline" onclick="openDeclineModal(' + a.id + ')"> Decline</button>'
                    + '</div>'
                    + '</div>';
            }).join('');
        }

        if (declined.length > 0) {
            html += '<div style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--stone);margin:20px 0 10px;">Previously Declined (' + declined.length + ')</div>';
            html += declined.map(function (a) {
                var d = new Date(a.date + 'T00:00:00');
                var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return '<div class="confirm-card confirm-card--declined">'
                    + '<div class="confirm-card-left">'
                    + '<div class="confirm-date-block" style="opacity:.5"><span class="cdate-day">' + d.getDate() + '</span><span class="cdate-mo">' + mo[d.getMonth()] + '</span></div>'
                    + '<div class="confirm-info">'
                    + '<div class="confirm-svc" style="opacity:.7;">' + a.service + '</div>'
                    + '<div class="confirm-meta">' + a.time + ' &middot; ' + (a.clientName || a.clientEmail) + '</div>'
                    + '<div class="confirm-decline-reason">Reason: ' + (a.staffDeclineReason || 'No reason given') + '</div>'
                    + '</div>'
                    + '</div>'
                    + '<span class="badge b-cancelled" style="align-self:center;">Declined</span>'
                    + '</div>';
            }).join('');
        }
    }

    container.innerHTML = html;
    updateConfirmBadge();
}

// ── js/staff/confirmations/updateConfirmBadge.js ────────────────
function updateConfirmBadge() {
    var pending = getPendingConfirmations();
    var badge = document.getElementById('confirmBadge');
    if (badge) {
        badge.textContent = pending.length > 0 ? pending.length : '';
        badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
    }
}

// ── js/staff/confirmations/acceptAppt.js ────────────────────────
function acceptAppt(id) {
    staffAcceptAppt(id, user ? user.name : 'Staff');
    renderConfirmations();
    renderToday();
    showToast('Appointment accepted! ');
}

// ── js/staff/confirmations/state.js ─────────────────────────────
var _declineTargetId = null;

// ── js/staff/confirmations/openDeclineModal.js ──────────────────
function openDeclineModal(id) {
    _declineTargetId = id;
    document.getElementById('declineReason').value = '';
    document.getElementById('declineModal').classList.add('open');
}

// ── js/staff/confirmations/closeDeclineModal.js ─────────────────
function closeDeclineModal() { document.getElementById('declineModal').classList.remove('open'); _declineTargetId = null; }

// ── js/staff/confirmations/submitDecline.js ─────────────────────
function submitDecline() {
    var reasonSel = document.getElementById('declineReason').value;
    var reasonOther = document.getElementById('declineReasonOther').value.trim();
    var reason = reasonSel === 'Other' ? (reasonOther || 'Other') : reasonSel;
    if (!reasonSel) { showToast('Please select a reason.'); return; }
    if (!_declineTargetId) return;
    staffDeclineAppt(_declineTargetId, user ? user.name : 'Staff', reason + (reasonOther && reasonSel !== 'Other' ? ' — ' + reasonOther : ''));
    closeDeclineModal();
    renderConfirmations();
    renderToday();
    showToast('Appointment declined. Admin has been notified.');
}

// ── js/staff/bootstrap/eventListeners.js ────────────────────────
document.getElementById('menuToggle').addEventListener('click', function () { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); });
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }
document.getElementById('logoutBtn').addEventListener('click', function () { spaLogout(); });
function showToast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 3000); }

// ── js/staff/profile/saveStaffProfile.js ────────────────────────
function saveStaffProfile() {
    var newName = document.getElementById('nameInput').value.trim();
    var newSpec = document.getElementById('specInput').value.trim();
    if (!newName) { showToast('Name cannot be empty.'); return; }
    if (!user) { showToast('Session error. Please log in again.'); return; }
    user.name = newName;
    user.specialization = newSpec;
    localStorage.setItem('spa_user', JSON.stringify(user));
    document.getElementById('sidebarName').textContent = newName;
    document.getElementById('profileName').textContent = newName;
    if (typeof updateRegisteredUser === 'function') {
        updateRegisteredUser(user.email, { name: newName, specialization: newSpec });
    }
    showToast('Profile saved! ');
}

// ── js/staff/bootstrap/initSync.js ──────────────────────────────
if (typeof initConnectionIndicator === 'function') initConnectionIndicator();
if (typeof syncServicesFromFirestore === 'function') {
    syncServicesFromFirestore(function () {
        if (typeof listenToServices === 'function') { listenToServices(function () {}); }
    });
}
syncUsersFromFirestore(function () {
    syncApptsFromFirestore(function () {
        renderToday(); renderWeek('all'); renderClients(); updateConfirmBadge();
        listenToAppts(function () { renderToday(); renderWeek('all'); renderClients(); updateConfirmBadge(); });
        listenToUsers(function () { renderClients(); });
    });
});

// ── js/staff/navigation/setBnActive.js ──────────────────────────
function setBnActive(el) {
    document.querySelectorAll('.bn-item').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
}
