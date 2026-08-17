// ── js/admin/session/initUser.js ────────────────────────────────
// Instant render from the last-known cached session (avoids a blank/laggy
// dashboard while Firebase confirms things in the background), then a real
// Firebase Auth + Firestore-role check runs behind the scenes and boots
// anyone whose session doesn't check out.
var user = null;
try { user = JSON.parse(localStorage.getItem('spa_user')); } catch (e) { }
if (!user || user.role !== 'admin') { window.location.href = '../index.html'; }

if (user) {
    document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('sidebarName').textContent = user.name;
}

requireRole('admin', function (verifiedUser) {
    user = verifiedUser;
    document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('sidebarName').textContent = user.name;
});

// ── js/admin/data/getAppointments.js ────────────────────────────
function getAppointments() { return getSharedAppts(); }

// ── js/admin/data/buildClientsList.js ───────────────────────────
function buildClientsList() {
    var regClients = getClientList();
    return regClients.map(function (u) {
        var appts = getSharedAppts().filter(function (a) { return a.clientEmail === u.email && (a.status === 'confirmed' || a.status === 'done'); });
        var lastAppt = appts.length ? appts.sort(function (a, b) { return b.date.localeCompare(a.date); })[0] : null;
        var visits = appts.length;
        var tier = visits >= 20 ? 'Platinum' : visits >= 10 ? 'Gold' : visits >= 5 ? 'Silver' : 'Bronze';
        return {
            name: u.name, email: u.email, visits: visits,
            last: lastAppt ? lastAppt.date.slice(5).replace('-', '/') : 'Never', loyalty: tier
        };
    });
}

// ── js/admin/data/buildStaffList.js ─────────────────────────────
function buildStaffList() {
    return getStaffList().map(function (u) {
        var today = new Date().toISOString().split('T')[0];
        var todayAppts = getSharedAppts().filter(function (a) { return a.date === today && a.staff === u.name; }).length;
        return {
            name: u.name,
            email: u.email || '',
            spec: u.specialization || u.gender || 'All Services',
            today: todayAppts,
            status: u.status || 'active',
            availability: u.availability || 'available'
        };
    });
}

// ── js/admin/data/buildUsersList.js ─────────────────────────────
function buildUsersList() {
    var todayStr = new Date().toISOString().split('T')[0];
    var list = [{ name: user ? user.name : 'Admin', email: user ? user.email : 'admin@gmail.com', role: 'admin', last: 'Today', dateAdded: todayStr }];
    getRegisteredUsers().forEach(function (u) { list.push({ name: u.name, email: u.email, role: u.role, last: 'Recently', dateAdded: u.dateAdded || '—', pending: u.pending }); });
    return list;
}

// ── js/admin/data/state.js ──────────────────────────────────────
var appointments = [];

// ── js/admin/data/sb.js ─────────────────────────────────────────
function sb(s) {
    var c = { confirmed: 'b-confirmed', pending: 'b-pending', cancelled: 'b-cancelled', done: 'b-done', staff_declined: 'b-pending' }[s] || '';
    var label = s === 'staff_declined' ? '⚠ staff declined' : s;
    return '<span class="badge ' + c + '" style="' + (s === 'staff_declined' ? 'background:#fef3c7;color:#b45309;border:1px solid #fcd34d;' : '') + '">' + label + '</span>';
}

// ── js/admin/data/rb.js ─────────────────────────────────────────
function rb(r) { var c = { admin: 'b-admin', staff: 'b-staff', client: 'b-client' }[r] || ''; return '<span class="badge ' + c + '">' + r + '</span>'; }

// --- Revenue helpers (computed from completed appointments) ---

// ── js/admin/revenue/getServicePrice.js ─────────────────────────
function getServicePrice(serviceName) {
    var svcs = getServices();
    for (var i = 0; i < svcs.length; i++) {
        if (svcs[i].name === serviceName) {
            return parseInt((svcs[i].price || '0').replace(/[^\d]/g, ''), 10) || 0;
        }
    }
    return 0;
}

// ── js/admin/revenue/buildWeeklyRevenue.js ──────────────────────
function buildWeeklyRevenue() {
    var appts = getSharedAppts().filter(function (a) { return a.status === 'done'; });
    var now = new Date();
    var dayOfWeek = now.getDay();
    var monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    var dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var dayTotals = [0, 0, 0, 0, 0, 0, 0];
    appts.forEach(function (a) {
        var d = new Date(a.date + 'T00:00:00');
        if (d >= monday) {
            var diff = Math.floor((d - monday) / 86400000);
            if (diff >= 0 && diff <= 6) {
                dayTotals[diff] += a.price || getServicePrice(a.service);
            }
        }
    });
    return { labels: dayLabels, data: dayTotals };
}

// ── js/admin/revenue/buildMonthlyRevenue.js ─────────────────────
function buildMonthlyRevenue() {
    var appts = getSharedAppts().filter(function (a) { return a.status === 'done'; });
    var year = new Date().getFullYear();
    var monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var monthTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    appts.forEach(function (a) {
        var d = new Date(a.date + 'T00:00:00');
        if (d.getFullYear() === year) {
            monthTotals[d.getMonth()] += a.price || getServicePrice(a.service);
        }
    });
    return { labels: monthLabels, data: monthTotals };
}

// ── js/admin/revenue/buildDonutData.js ──────────────────────────
function buildDonutData() {
    var appts = getSharedAppts().filter(function (a) { return a.status === 'done'; });
    var svcs = getServices();
    var catTotals = {};
    appts.forEach(function (a) {
        var cat = a.category;
        if (!cat) {
            cat = 'Other';
            for (var i = 0; i < svcs.length; i++) { if (svcs[i].name === a.service) { cat = svcs[i].category; break; } }
        }
        catTotals[cat] = (catTotals[cat] || 0) + 1;
    });
    var cats = Object.keys(catTotals);
    if (cats.length === 0) {
        return {
            labels: ['Facial Services', 'Gluta Shots & Drip', 'Manicure/Pedicure', 'Wax Services', 'Others'],
            data: [0, 0, 0, 0, 0]
        };
    }
    var total = appts.length || 1;
    cats.sort(function (a, b) { return catTotals[b] - catTotals[a]; });
    var top = cats.slice(0, 4);
    var otherCount = cats.slice(4).reduce(function (s, c) { return s + catTotals[c]; }, 0);
    var labels = top.concat(otherCount > 0 ? ['Others'] : []);
    var data = top.map(function (c) { return Math.round(catTotals[c] / total * 100); });
    if (otherCount > 0) data.push(Math.round(otherCount / total * 100));
    return { labels: labels, data: data };
}

// ── js/admin/revenue/getTodayRevenue.js ─────────────────────────
function getTodayRevenue() {
    var today = new Date().toISOString().split('T')[0];
    return getSharedAppts().filter(function (a) { return a.status === 'done' && a.date === today; })
        .reduce(function (sum, a) { return sum + (a.price || getServicePrice(a.service)); }, 0);
}

// ── js/admin/revenue/getTotalRevenue.js ─────────────────────────
function getTotalRevenue() {
    return getSharedAppts().filter(function (a) { return a.status === 'done'; })
        .reduce(function (sum, a) { return sum + (a.price || getServicePrice(a.service)); }, 0);
}

// --- Overview ---

// ── js/admin/overview/state.js ──────────────────────────────────
var revenueChartInst = null;
var donutChartInst = null;

// ── js/admin/overview/renderOverview.js ─────────────────────────
function renderOverview() {
    appointments = getAppointments();
    document.getElementById('statSvcCount').textContent = getServices().length;

    var weeklyReal = buildWeeklyRevenue();
    var lineCtx = document.getElementById('revenueLineChart').getContext('2d');
    var pinkGrad = lineCtx.createLinearGradient(0, 0, 0, 260);
    pinkGrad.addColorStop(0, 'rgba(236,72,153,0.22)');
    pinkGrad.addColorStop(0.6, 'rgba(236,72,153,0.06)');
    pinkGrad.addColorStop(1, 'rgba(236,72,153,0.00)');

    if (revenueChartInst) revenueChartInst.destroy();
    revenueChartInst = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: weeklyReal.labels,
            datasets: [{
                label: 'Revenue',
                data: weeklyReal.data,
                borderColor: '#ec4899',
                borderWidth: 2.5,
                pointBackgroundColor: '#ec4899',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                backgroundColor: pinkGrad,
                tension: 0.45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#ec4899',
                    borderColor: 'rgba(236,72,153,0.25)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif", size: 12 },
                    callbacks: {
                        title: function (items) { return items[0].label; },
                        label: function (item) { return 'Revenue : ₱' + item.raw.toLocaleString(); }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: function (v) { return '₱' + (v >= 1000 ? (v / 1000) + 'k' : v); }
                    },
                    beginAtZero: true
                }
            }
        }
    });

    var donutCtx = document.getElementById('popularDonutChart').getContext('2d');
    var donutReal = buildDonutData();
    var allColors = ['#3b82f6', '#10b981', '#0f766e', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899'];
    var donutColors = allColors.slice(0, donutReal.labels.length);

    if (donutChartInst) donutChartInst.destroy();
    donutChartInst = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: donutReal.labels,
            datasets: [{
                data: donutReal.data,
                backgroundColor: donutColors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif", size: 12 },
                    callbacks: { label: function (item) { return item.label + ': ' + item.raw + '%'; } }
                }
            }
        }
    });

    document.getElementById('donutLegend').innerHTML = donutReal.labels.map(function (l, i) {
        return '<div class="donut-leg-item"><span class="donut-dot" style="background:' + donutColors[i] + '"></span>'
            + '<span class="donut-leg-label">' + l + '</span>'
            + '<span class="donut-leg-pct">' + donutReal.data[i] + '%</span></div>';
    }).join('');

    renderRecentAppts();
    renderTopServices();
    renderRecentFeedbackMini();
    loadRecentActivity();
    if (typeof initAdminNotifBell === 'function') initAdminNotifBell();
}

// ── js/admin/overview/relativeTime.js ────────────────────────────
function relativeTime(ts) {
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

// ── js/admin/overview/loadRecentActivity.js ──────────────────────
// Recent Activity panel = admin audit trail, unchanged, still reads
// activity_logs. The notification BELL is a separate system now — see
// initAdminNotifBell() below — reading the dedicated `notifications`
// collection instead. Keeping these separate on purpose: activity_logs is
// history, notifications are live alerts with their own read/unread state
// persisted in Firestore (not just "have I seen it" via localStorage).
function loadRecentActivity() {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) { renderActivityTimeline([]); return; }
    db.collection('activity_logs').orderBy('timestamp', 'desc').limit(15).get()
        .then(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(doc.data()); });
            renderActivityTimeline(items);
        })
        .catch(function (e) {
            console.warn('loadRecentActivity error:', e);
            var el = document.getElementById('activityTimeline');
            if (el) el.innerHTML = '<div class="notif-empty">Unable to load activity.</div>';
        });
}

function renderActivityTimeline(items) {
    var el = document.getElementById('activityTimeline');
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="notif-empty">No recent activity yet.</div>'; return; }
    el.innerHTML = items.slice(0, 8).map(function (a) {
        var who = a.userName || a.userEmail || 'Someone';
        return '<div class="activity-row"><span class="activity-dot"></span><div><div class="activity-text">'
            + escHtml(who) + ' — ' + escHtml(a.action || 'did something')
            + (a.details ? ' <span style="color:var(--stone);font-weight:400;">(' + escHtml(a.details) + ')</span>' : '')
            + '</div><div class="activity-time">' + relativeTime(a.timestamp) + '</div></div></div>';
    }).join('');
}

// ── js/admin/notifications/bell.js ────────────────────────────────
// Reads notifications/{id} where recipientRole == 'admin' — a single
// equality filter, sorted client-side (no orderBy on a different field),
// so this never needs a Firestore composite index.
var ADMIN_NOTIF_META = {
    new_appointment: { icon: '📅', section: 'appointments' },
    appointment_confirmed: { icon: '✅', section: 'appointments' },
    appointment_rescheduled: { icon: '🔁', section: 'appointments' },
    appointment_cancelled: { icon: '🚫', section: 'appointments' },
    new_feedback: { icon: '⭐', section: 'feedback' },
    new_message: { icon: '💬', section: 'messages' },
    new_registration: { icon: '🆕', section: 'users' }
};
var _adminNotifUnsub = null;
var _adminNotifCache = [];

function initAdminNotifBell() {
    if (_adminNotifUnsub) return;
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) { showNotifError(); return; }
    _adminNotifUnsub = db.collection('notifications')
        .where('recipientRole', '==', 'admin')
        .limit(50)
        .onSnapshot(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(Object.assign({ _id: doc.id }, doc.data())); });
            items.sort(function (a, b) {
                var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
                var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });
            _adminNotifCache = items;
            renderNotifDropdown(items);
        }, function (e) {
            console.warn('initAdminNotifBell error:', e);
            showNotifError();
        });
}
function stopAdminNotifBell() {
    if (_adminNotifUnsub) { _adminNotifUnsub(); _adminNotifUnsub = null; }
}
window.addEventListener('beforeunload', stopAdminNotifBell);

function showNotifError() {
    var list = document.getElementById('notifList');
    if (list) list.innerHTML = '<div class="notif-empty">Unable to load notifications.</div>';
}

function toggleNotifDropdown(e) {
    if (e) e.stopPropagation();
    var dd = document.getElementById('notifDropdown');
    if (!dd) return;
    var willOpen = !dd.classList.contains('open');
    dd.classList.toggle('open', willOpen);
    if (willOpen) markVisibleNotifsRead(_adminNotifCache);
}
document.addEventListener('click', function (e) {
    var dd = document.getElementById('notifDropdown');
    var wrap = document.getElementById('notifBellBtn');
    if (dd && dd.classList.contains('open') && !dd.contains(e.target) && e.target !== wrap && !wrap.contains(e.target)) {
        dd.classList.remove('open');
    }
});

// Persists read:true in Firestore for every currently-unread notification
// shown in the dropdown — this is the "reliable read mechanism" the
// dropdown needs, not just a localStorage timestamp.
function markVisibleNotifsRead(items) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) return;
    var unread = items.filter(function (n) { return !n.read; }).slice(0, 20);
    if (!unread.length) return;
    var batch = db.batch();
    unread.forEach(function (n) { batch.update(db.collection('notifications').doc(n._id), { read: true }); });
    batch.commit().catch(function (e) { console.warn('markVisibleNotifsRead error:', e); });
}

function notifItemClick(id, section) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (db && id) db.collection('notifications').doc(id).update({ read: true }).catch(function () { });
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.remove('open');
    if (typeof showSection === 'function') showSection(section);
}

function renderNotifDropdown(items) {
    var list = document.getElementById('notifList');
    var badge = document.getElementById('notifBadge');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    list.innerHTML = items.slice(0, 15).map(function (n) {
        var meta = ADMIN_NOTIF_META[n.type] || { icon: '🔔', section: 'overview' };
        return '<div class="notif-item' + (!n.read ? ' unread' : '') + '" onclick="notifItemClick(\'' + n._id + '\',\'' + meta.section + '\')" role="button" tabindex="0">'
            + '<span class="notif-item-icon">' + meta.icon + '</span>'
            + '<div class="notif-item-body">'
            + '<div class="notif-item-text"><strong>' + escHtml(n.title || '') + '</strong><br>' + escHtml(n.message || '') + '</div>'
            + '<div class="notif-item-time">' + relativeTime(n.createdAt) + '</div>'
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

// ── js/admin/overview/topServices.js ─────────────────────────────
function buildTopServicesData() {
    var appts = getSharedAppts().filter(function (a) { return a.status === 'done'; });
    var counts = {};
    appts.forEach(function (a) { if (a.service) counts[a.service] = (counts[a.service] || 0) + 1; });
    var names = Object.keys(counts);
    if (!names.length) return [];
    names.sort(function (a, b) { return counts[b] - counts[a]; });
    var top = names.slice(0, 5);
    var max = counts[top[0]] || 1;
    return top.map(function (n) { return { name: n, count: counts[n], pct: Math.round((counts[n] / max) * 100) }; });
}

function renderTopServices() {
    var el = document.getElementById('topServicesList');
    if (!el) return;
    var data = buildTopServicesData();
    if (!data.length) { el.innerHTML = '<div class="notif-empty">Not enough data yet.</div>'; return; }
    el.innerHTML = data.map(function (s) {
        return '<div class="top-service-row"><div class="top-service-labels"><span>' + escHtml(s.name) + '</span><span>' + s.count + ' booking' + (s.count !== 1 ? 's' : '') + '</span></div>'
            + '<div class="top-service-track"><div class="top-service-fill" style="width:' + s.pct + '%"></div></div></div>';
    }).join('');
}

// ── js/admin/overview/recentFeedbackMini.js ──────────────────────
function renderRecentFeedbackMini() {
    var el = document.getElementById('recentFeedbackGrid');
    if (!el) return;
    var data = (typeof getFeedbackData === 'function') ? getFeedbackData() : [];
    if (!data.length) { el.innerHTML = '<div class="notif-empty">No feedback yet.</div>'; return; }
    var sorted = data.slice().sort(function (a, b) { return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0); });
    el.innerHTML = sorted.slice(0, 3).map(function (f) {
        var r = Math.round(f.rating || 5);
        var stars = '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
        var comment = f.comment ? escHtml(f.comment) : 'Great service!';
        return '<div class="feedback-mini-card"><div class="feedback-mini-stars">' + stars + '</div>'
            + '<div class="feedback-mini-text">"' + comment + '"</div>'
            + '<div class="feedback-mini-author">— ' + escHtml(f.name || 'Anonymous') + '</div></div>';
    }).join('');
}

// ── js/admin/overview/renderRecentAppts.js ──────────────────────
function renderRecentAppts() {
    appointments = getAppointments();
    var pendingCount = appointments.filter(function (a) { return a.status === 'pending'; }).length;
    var doneCount = appointments.filter(function (a) { return a.status === 'done'; }).length;
    var todayStr = new Date().toISOString().split('T')[0];
    var todayCount = appointments.filter(function (a) { return a.date === todayStr; }).length;
    if (document.getElementById('statApptToday')) document.getElementById('statApptToday').textContent = todayCount;
    if (document.getElementById('statPendingCount')) document.getElementById('statPendingCount').textContent = pendingCount + ' pending';
    if (document.getElementById('statCompleted')) document.getElementById('statCompleted').textContent = doneCount;
    if (document.getElementById('statTodayRevenue')) document.getElementById('statTodayRevenue').textContent = '₱' + getTodayRevenue().toLocaleString();
    if (document.getElementById('statTotalRevenue')) document.getElementById('statTotalRevenue').textContent = '₱' + getTotalRevenue().toLocaleString();
    document.getElementById('recentAppts').innerHTML = appointments.slice(0, 5).map(function (a) {
        return '<tr' + (a.status === 'staff_declined' ? ' style="background:#fffbeb;"' : '') + '>'
            + '<td data-label="Client">' + escHtml(a.clientName || a.clientEmail || '—') + '</td>'
            + '<td data-label="Service">' + escHtml(a.service) + '</td>'
            + '<td data-label="Date">' + a.date + ' · ' + a.time + '</td>'
            + '<td data-label="Staff">' + escHtml(a.staff) + '</td>'
            + '<td data-label="Status">' + sb(a.status) + '</td>'
            + '<td>' + apptActionButtons(a) + '</td></tr>';
    }).join('');
}

// --- Appointments ---

// ── Feature 1: Pending badge counter ─────────────────────────────────────────

// ── js/admin/appointments/updatePendingBadge.js ─────────────────
function updatePendingBadge() {
    var pending = getAppointments().filter(function (a) { return a.status === 'pending'; }).length;
    var badge = document.getElementById('pendingNavBadge');
    var bnBadge = document.getElementById('pendingBnBadge');
    if (badge) { badge.textContent = pending > 99 ? '99+' : pending; badge.style.display = pending > 0 ? 'inline-block' : 'none'; }
    if (bnBadge) { bnBadge.textContent = pending > 99 ? '99+' : pending; bnBadge.style.display = pending > 0 ? 'inline-block' : 'none'; }
    // Also update the overview stat card delta text
    var statDelta = document.getElementById('statPendingCount');
    if (statDelta) statDelta.textContent = pending > 0 ? pending + ' pending' : 'none pending';
}

// ── Feature 2: Date range filter ─────────────────────────────────────────────

// ── js/admin/appointments/state.js ──────────────────────────────
var apptDateRange = 'all';

// ── js/admin/appointments/setApptRange.js ───────────────────────
function setApptRange(range, btn) {
    apptDateRange = range;
    document.querySelectorAll('.appt-range-pill').forEach(function (p) { p.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var customWrap = document.getElementById('apptCustomRange');
    if (customWrap) customWrap.style.display = range === 'custom' ? 'flex' : 'none';
    renderAllAppts();
}

// ── js/admin/appointments/applyDateRangeFilter.js ───────────────
function applyDateRangeFilter(data) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (apptDateRange === 'today') {
        var todayStr = today.toISOString().split('T')[0];
        return data.filter(function (a) { return a.date === todayStr; });
    }
    if (apptDateRange === 'week') {
        var weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
        var weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        return data.filter(function (a) { var d = new Date(a.date + 'T00:00:00'); return d >= weekStart && d <= weekEnd; });
    }
    if (apptDateRange === 'month') {
        var y = today.getFullYear(), m = today.getMonth();
        return data.filter(function (a) { var d = new Date(a.date + 'T00:00:00'); return d.getFullYear() === y && d.getMonth() === m; });
    }
    if (apptDateRange === 'custom') {
        var fromEl = document.getElementById('apptDateFrom'); var toEl = document.getElementById('apptDateTo');
        var from = fromEl && fromEl.value ? new Date(fromEl.value + 'T00:00:00') : null;
        var to = toEl && toEl.value ? new Date(toEl.value + 'T23:59:59') : null;
        return data.filter(function (a) {
            var d = new Date(a.date + 'T00:00:00');
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }
    return data; // 'all'
}

// ── js/admin/appointments/apptSummary.js ─────────────────────────
function buildApptSummary() {
    var appts = getSharedAppts();
    var todayStr = new Date().toISOString().split('T')[0];
    var summary = { today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appts.forEach(function (a) {
        if (a.date === todayStr) summary.today++;
        if (a.status === 'pending' || a.status === 'staff_declined') summary.pending++;
        else if (a.status === 'confirmed') summary.confirmed++;
        else if (a.status === 'done') summary.completed++;
        else if (a.status === 'cancelled') summary.cancelled++;
    });
    return summary;
}

function renderApptSummary() {
    var s = buildApptSummary();
    var map = { asToday: s.today, asPending: s.pending, asConfirmed: s.confirmed, asCompleted: s.completed, asCancelled: s.cancelled };
    Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = map[id];
    });
}

// ── js/admin/appointments/serviceFilter.js ───────────────────────
function populateApptServiceFilter() {
    var sel = document.getElementById('apptServiceFilter');
    if (!sel) return;
    var current = sel.value;
    var services = getServices().map(function (s) { return s.name; }).sort();
    sel.innerHTML = '<option value="">All Services</option>' + services.map(function (n) {
        return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
    }).join('');
    sel.value = current;
}

// ── js/admin/appointments/searchClear.js ─────────────────────────
function onApptSearchInput() {
    var clearBtn = document.getElementById('apptSearchClear');
    var input = document.getElementById('apptSearch');
    if (clearBtn) clearBtn.style.display = (input && input.value) ? 'block' : 'none';
    apptCurrentPage = 1;
    renderAllAppts();
}
function clearApptSearch() {
    var input = document.getElementById('apptSearch');
    var clearBtn = document.getElementById('apptSearchClear');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    apptCurrentPage = 1;
    renderAllAppts();
}

// ── js/admin/appointments/pagination.js ───────────────────────────
var apptCurrentPage = 1;
var apptPageSize = 10;

function onApptPageSizeChange() {
    apptPageSize = parseInt(document.getElementById('apptPageSize').value, 10) || 10;
    apptCurrentPage = 1;
    renderAllAppts();
}
function goApptPage(delta) {
    apptCurrentPage += delta;
    if (apptCurrentPage < 1) apptCurrentPage = 1;
    renderAllAppts();
}

// ── js/admin/appointments/renderAllAppts.js ─────────────────────
function renderAllAppts() {
    appointments = getAppointments();
    renderApptSummary();

    var data = appointments;
    var q = (document.getElementById('apptSearch') || { value: '' }).value.toLowerCase().trim();
    var sf = (document.getElementById('apptStatusFilter') || { value: '' }).value;
    var svcf = (document.getElementById('apptServiceFilter') || { value: '' }).value;

    if (q) {
        data = data.filter(function (a) {
            return (a.clientName || '').toLowerCase().indexOf(q) !== -1 ||
                (a.clientEmail || '').toLowerCase().indexOf(q) !== -1 ||
                (a.service || '').toLowerCase().indexOf(q) !== -1 ||
                String(a.id).toLowerCase().indexOf(q) !== -1;
        });
    }
    if (sf) data = data.filter(function (a) { return a.status === sf; });
    if (svcf) data = data.filter(function (a) { return a.service === svcf; });
    data = applyDateRangeFilter(data);

    // Update result count label (date-range pill row)
    var countEl = document.getElementById('apptRangeCount');
    if (countEl) countEl.textContent = data.length + ' result' + (data.length !== 1 ? 's' : '');

    // ── Pagination ──
    var totalResults = data.length;
    var totalPages = Math.max(1, Math.ceil(totalResults / apptPageSize));
    if (apptCurrentPage > totalPages) apptCurrentPage = totalPages;
    var startIdx = (apptCurrentPage - 1) * apptPageSize;
    var pageData = data.slice(startIdx, startIdx + apptPageSize);

    var pageInfo = document.getElementById('apptPageInfo');
    if (pageInfo) {
        pageInfo.textContent = totalResults === 0 ? 'Showing 0 of 0 appointments'
            : 'Showing ' + (startIdx + 1) + '–' + Math.min(startIdx + apptPageSize, totalResults) + ' of ' + totalResults + ' appointments';
    }
    var prevBtn = document.getElementById('apptPrevBtn');
    var nextBtn = document.getElementById('apptNextBtn');
    if (prevBtn) prevBtn.disabled = apptCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = apptCurrentPage >= totalPages;

    document.getElementById('allApptTable').innerHTML = pageData.length ? pageData.map(function (a) {
        var declineNote = a.status === 'staff_declined'
            ? '<div style="font-size:.7rem;color:#b45309;margin-top:3px;">⚠ ' + (a.staffDeclinedBy || 'Staff') + ': ' + (a.staffDeclineReason || '') + '</div>'
            : '';
        return '<tr' + (a.status === 'staff_declined' ? ' style="background:#fffbeb;"' : '') + '>'
            + '<td data-label="ID" style="color:var(--stone);font-size:.78rem;">#' + a.id + '</td>'
            + '<td data-label="Client">' + escHtml(a.clientName || a.clientEmail || '—') + '</td>'
            + '<td data-label="Service">' + escHtml(a.service) + declineNote + '</td>'
            + '<td data-label="Date">' + a.date + ' · ' + a.time + '</td>'
            + '<td data-label="Staff">' + escHtml(a.staff) + '</td>'
            + '<td data-label="Status">' + sb(a.status) + '</td>'
            + '<td>' + apptActionButtons(a) + '</td></tr>';
    }).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px 12px;color:var(--stone);">'
        + '<div style="font-size:1.8rem;margin-bottom:8px;">📭</div>'
        + '<div style="font-weight:600;color:var(--ink);margin-bottom:2px;">No appointments found.</div>'
        + '<div style="font-size:.78rem;">Try adjusting your search or filters.</div></td></tr>';

    updatePendingBadge();
    if (document.getElementById('apptCalendarView') && document.getElementById('apptCalendarView').style.display !== 'none') {
        renderApptCalendar();
    }
}

// Builds the Actions cell contents, showing only the actions valid for the
// appointment's current status (per the workflow: Pending -> Confirmed ->
// Completed, with Pending/Confirmed -> Cancelled as the only side branch).
function apptActionButtons(a) {
    var btns = '<button class="t-action" onclick="viewApptDetails(' + a.id + ')">View</button>';
    if (a.status === 'staff_declined') {
        btns += '<button class="t-action" style="background:#f59e0b;color:white;" onclick="openReassignModal(' + a.id + ')">Reassign</button>';
        return btns;
    }
    if (a.status === 'pending') {
        btns += '<button class="t-action" onclick="approveAppt(' + a.id + ')">Confirm</button>'
            + '<button class="t-action" onclick="openRescheduleModal(' + a.id + ')">Reschedule</button>'
            + '<button class="t-action del" onclick="cancelApptConfirm(' + a.id + ')">Cancel</button>';
    } else if (a.status === 'confirmed') {
        btns += '<button class="t-action" onclick="openRescheduleModal(' + a.id + ')">Reschedule</button>'
            + '<button class="t-action del" onclick="cancelApptConfirm(' + a.id + ')">Cancel</button>'
            + '<button class="t-action done" onclick="completeApptConfirm(' + a.id + ')">Complete</button>';
    }
    // done / cancelled -> View only (already added above)
    return btns;
}

function findAppt(id) {
    return appointments.find(function (a) { return String(a.id) === String(id); }) || null;
}

// ── js/admin/appointments/approveAppt.js ────────────────────────
function approveAppt(id) {
    var rec = findAppt(id);
    updateApptStatus(id, 'confirmed', { staffConfirmed: null });
    appointments = getAppointments(); renderRecentAppts(); renderAllAppts(); updatePendingBadge();
    if (rec && typeof logActivity === 'function') {
        logActivity('Appointment Confirmed', rec.clientName, rec.clientEmail, rec.service + ' on ' + rec.date);
    }
    showToast('Appointment confirmed!');
}

// ── js/admin/appointments/cancelAppt.js ──────────────────────────
// Cancelling now sets status:'cancelled' (kept in the list, red badge) —
// this is a real workflow state, not a hard delete. removeAppt() below is
// left intact for anywhere else that still needs a true delete.
var _pendingCancelId = null;
function cancelApptConfirm(id) {
    var rec = findAppt(id);
    if (!rec) return;
    _pendingCancelId = id;
    document.getElementById('apptConfirmTitle').textContent = 'Cancel this appointment?';
    document.getElementById('apptConfirmMsg').textContent = rec.clientName + ' — ' + rec.service + ' on ' + rec.date + ' at ' + rec.time + '. This cannot be undone.';
    var keepBtn = document.getElementById('apptConfirmKeepBtn');
    var actionBtn = document.getElementById('apptConfirmActionBtn');
    keepBtn.textContent = 'Keep Appointment';
    actionBtn.textContent = 'Cancel Appointment';
    actionBtn.style.background = 'linear-gradient(135deg,#b04a4a,#7a2e2e)';
    actionBtn.onclick = function () { doCancelAppt(id); };
    document.getElementById('apptConfirmModal').classList.add('open');
}
function doCancelAppt(id) {
    var rec = findAppt(id);
    updateApptStatus(id, 'cancelled');
    appointments = getAppointments(); renderRecentAppts(); renderAllAppts(); updatePendingBadge();
    closeModal('apptConfirmModal');
    if (rec && typeof logActivity === 'function') {
        logActivity('Appointment Cancelled', rec.clientName, rec.clientEmail, rec.service + ' on ' + rec.date);
    }
    showToast('Appointment cancelled.');
}

// ── js/admin/appointments/completeAppt.js ────────────────────────
function completeApptConfirm(id) {
    var rec = findAppt(id);
    if (!rec) return;
    document.getElementById('apptConfirmTitle').textContent = 'Mark this appointment as completed?';
    document.getElementById('apptConfirmMsg').textContent = rec.clientName + ' — ' + rec.service + ' on ' + rec.date + ' at ' + rec.time + '.';
    var keepBtn = document.getElementById('apptConfirmKeepBtn');
    var actionBtn = document.getElementById('apptConfirmActionBtn');
    keepBtn.textContent = 'Cancel';
    actionBtn.textContent = 'Confirm';
    actionBtn.style.background = '';
    actionBtn.onclick = function () { closeModal('apptConfirmModal'); adminMarkDone(id); };
    document.getElementById('apptConfirmModal').classList.add('open');
}

// ── js/admin/appointments/viewApptDetails.js ─────────────────────
function viewApptDetails(id) {
    var a = findAppt(id);
    if (!a) return;
    var client = getUserByEmail ? getUserByEmail(a.clientEmail) : null;
    var body = ''
        + '<div style="font-weight:700;color:var(--fern);margin-bottom:4px;font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;">Customer Information</div>'
        + '<div><strong>Name:</strong> ' + escHtml(a.clientName || '—') + '</div>'
        + '<div><strong>Email:</strong> ' + escHtml(a.clientEmail || '—') + '</div>'
        + '<div><strong>Contact:</strong> ' + escHtml((client && client.phone) || 'Not provided') + '</div>'
        + '<div style="font-weight:700;color:var(--fern);margin:14px 0 4px;font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;">Appointment Information</div>'
        + '<div><strong>Appointment ID:</strong> #' + a.id + '</div>'
        + '<div><strong>Service:</strong> ' + escHtml(a.service) + '</div>'
        + '<div><strong>Date:</strong> ' + a.date + '</div>'
        + '<div><strong>Time:</strong> ' + a.time + '</div>'
        + '<div><strong>Assigned Staff:</strong> ' + escHtml(a.staff || '—') + '</div>'
        + '<div><strong>Status:</strong> ' + sb(a.status) + '</div>'
        + '<div style="font-weight:700;color:var(--fern);margin:14px 0 4px;font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;">Additional Information</div>'
        + '<div><strong>Notes:</strong> ' + escHtml(a.notes || 'None') + '</div>'
        + '<div><strong>Booking Date:</strong> ' + escHtml(a.id ? new Date(Number(a.id)).toLocaleString() : '—') + '</div>'
        + '<div><strong>Last Updated:</strong> ' + escHtml(a.confirmedAt || a.completedAt ? new Date(a.completedAt || a.confirmedAt).toLocaleString() : '—') + '</div>';
    document.getElementById('apptViewBody').innerHTML = body;
    document.getElementById('apptViewModal').classList.add('open');
}

// ── js/admin/appointments/reschedule.js ──────────────────────────
var _rescheduleApptId = null;
function openRescheduleModal(id) {
    var a = findAppt(id);
    if (!a) return;
    _rescheduleApptId = id;
    document.getElementById('rescheduleApptInfo').innerHTML =
        '<strong>' + escHtml(a.clientName) + '</strong> &middot; ' + escHtml(a.service) + '<br>Currently: ' + a.date + ' at ' + a.time;
    document.getElementById('rescheduleDate').value = a.date || '';
    document.getElementById('rescheduleTime').value = to24Hour(a.time) || '';
    var sel = document.getElementById('rescheduleStaffSel');
    var staffList = getStaffList().filter(function (s) { return s.availability !== 'unavailable' && s.availability !== 'on_leave' && s.status !== 'inactive'; });
    sel.innerHTML = staffList.map(function (s) {
        return '<option value="' + escHtml(s.name) + '"' + (s.name === a.staff ? ' selected' : '') + '>' + escHtml(s.name) + (s.specialization ? ' — ' + escHtml(s.specialization) : '') + '</option>';
    }).join('') || '<option value="Any available staff">Any available staff</option>';
    document.getElementById('rescheduleConflictWarning').style.display = 'none';
    document.getElementById('apptRescheduleModal').classList.add('open');
}

function to24Hour(t) {
    if (!t) return '';
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(t.trim());
    if (!m) return '';
    var h = parseInt(m[1], 10), min = m[2], ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return (h < 10 ? '0' + h : h) + ':' + min;
}

function checkStaffConflict(staff, date, time, excludeId) {
    return getSharedAppts().some(function (a) {
        return String(a.id) !== String(excludeId) && a.staff === staff && a.date === date && a.time === time
            && a.status !== 'cancelled' && a.status !== 'done';
    });
}

function confirmReschedule() {
    var date = document.getElementById('rescheduleDate').value;
    var time24 = document.getElementById('rescheduleTime').value;
    var staff = document.getElementById('rescheduleStaffSel').value;
    var warnEl = document.getElementById('rescheduleConflictWarning');
    if (!date || !time24 || !staff) { showToast('Please fill in date, time, and staff.'); return; }

    // Convert HH:MM (24h) back to the app's display format ("h:MM AM/PM")
    var parts = time24.split(':'); var h = parseInt(parts[0], 10); var min = parts[1];
    var ap = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12; if (h12 === 0) h12 = 12;
    var timeDisplay = h12 + ':' + min + ' ' + ap;

    if (checkStaffConflict(staff, date, timeDisplay, _rescheduleApptId)) {
        warnEl.textContent = '⚠ ' + staff + ' already has another appointment at this date & time. Please pick a different slot.';
        warnEl.style.display = 'block';
        return;
    }

    var rec = findAppt(_rescheduleApptId);
    updateApptStatus(_rescheduleApptId, rec.status === 'confirmed' ? 'confirmed' : 'pending', {
        date: date, time: timeDisplay, staff: staff
    }, 'reschedule');
    appointments = getAppointments(); renderRecentAppts(); renderAllAppts(); updatePendingBadge();
    closeModal('apptRescheduleModal');
    if (rec && typeof logActivity === 'function') {
        logActivity('Appointment Rescheduled', rec.clientName, rec.clientEmail, 'Now ' + date + ' at ' + timeDisplay + ' with ' + staff);
    }
    showToast('Appointment rescheduled!');
    _rescheduleApptId = null;
}

// ── js/admin/appointments/listCalendarToggle.js ──────────────────
function setApptView(mode) {
    var listBtn = document.getElementById('apptViewListBtn');
    var calBtn = document.getElementById('apptViewCalBtn');
    var listView = document.getElementById('apptListView');
    var calView = document.getElementById('apptCalendarView');
    if (mode === 'calendar') {
        listBtn.classList.remove('active'); calBtn.classList.add('active');
        listView.style.display = 'none'; calView.style.display = 'block';
        renderApptCalendar();
    } else {
        calBtn.classList.remove('active'); listBtn.classList.add('active');
        calView.style.display = 'none'; listView.style.display = 'block';
    }
}

var apptCalMonth = new Date().getMonth();
var apptCalYear = new Date().getFullYear();
var APPT_CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function apptCalPrevMonth() { apptCalMonth--; if (apptCalMonth < 0) { apptCalMonth = 11; apptCalYear--; } renderApptCalendar(); }
function apptCalNextMonth() { apptCalMonth++; if (apptCalMonth > 11) { apptCalMonth = 0; apptCalYear++; } renderApptCalendar(); }

var APPT_STATUS_DOT_COLOR = { pending: '#d97706', staff_declined: '#d97706', confirmed: '#2563eb', done: '#16a34a', cancelled: '#dc2626' };

function renderApptCalendar() {
    var label = document.getElementById('apptCalMonthLabel');
    if (label) label.textContent = APPT_CAL_MONTHS[apptCalMonth] + ' ' + apptCalYear;
    var grid = document.getElementById('apptCalGrid');
    if (!grid) return;

    var appts = getSharedAppts();
    var byDate = {};
    appts.forEach(function (a) {
        if (!a.date) return;
        if (!byDate[a.date]) byDate[a.date] = [];
        byDate[a.date].push(a);
    });

    var firstDay = new Date(apptCalYear, apptCalMonth, 1).getDay();
    var daysInMonth = new Date(apptCalYear, apptCalMonth + 1, 0).getDate();
    var todayStr = new Date().toISOString().split('T')[0];

    grid.innerHTML = '';
    for (var e = 0; e < firstDay; e++) {
        var empty = document.createElement('div');
        grid.appendChild(empty);
    }
    for (var d = 1; d <= daysInMonth; d++) {
        var mm = String(apptCalMonth + 1).padStart(2, '0');
        var dd = String(d).padStart(2, '0');
        var ds = apptCalYear + '-' + mm + '-' + dd;
        var dayAppts = byDate[ds] || [];
        var isToday = ds === todayStr;

        var cell = document.createElement('div');
        cell.className = 'appt-cal-daycell' + (dayAppts.length ? ' has-appts' : '') + (isToday ? ' today' : '');
        var num = document.createElement('span');
        num.textContent = d;
        num.style.cssText = 'font-size:.8rem;font-weight:' + (isToday ? '700' : '500') + ';color:var(--ink);';
        cell.appendChild(num);
        if (dayAppts.length) {
            var dots = document.createElement('div');
            dots.className = 'appt-cal-dots';
            dayAppts.slice(0, 4).forEach(function (a) {
                var dot = document.createElement('span');
                dot.className = 'appt-cal-dot';
                dot.style.background = APPT_STATUS_DOT_COLOR[a.status] || '#999';
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
            cell.onclick = (function (dateStr, list) {
                return function () {
                    if (list.length === 1) { viewApptDetails(list[0].id); return; }
                    setApptView('list');
                    document.getElementById('apptSearch').value = '';
                    apptDateRange = 'custom';
                    document.getElementById('apptDateFrom').value = dateStr;
                    document.getElementById('apptDateTo').value = dateStr;
                    document.querySelectorAll('.appt-range-pill').forEach(function (p) { p.classList.remove('active'); });
                    document.getElementById('apptCustomRange').style.display = 'flex';
                    renderAllAppts();
                };
            })(ds, dayAppts);
        }
        grid.appendChild(cell);
    }
}

// ── js/admin/appointments/removeAppt.js ─────────────────────────
// True hard-delete — kept for completeness, but no longer wired to any
// button in the Appointments table (Cancel now soft-cancels via
// cancelApptConfirm()/doCancelAppt() above so cancelled appointments stay
// visible in history with a red status badge instead of disappearing).
function removeAppt(id) {
    if (!confirm('Remove?')) return;
    var rec = findAppt(id);
    removeSharedAppt(id);
    appointments = getAppointments(); renderRecentAppts(); renderAllAppts(); updatePendingBadge();
    if (rec && typeof logActivity === 'function') {
        logActivity('Appointment Cancelled', rec.clientName, rec.clientEmail, rec.service + ' on ' + rec.date);
    }
    showToast('Removed.');
}

// ── js/admin/appointments/reassignState.js ──────────────────────
var _reassignApptId = null;

// ── js/admin/appointments/openReassignModal.js ──────────────────
function openReassignModal(id) {
    _reassignApptId = id;
    var appt = null;
    var appts = getSharedAppts();
    for (var i = 0; i < appts.length; i++) { if (String(appts[i].id) === String(id)) { appt = appts[i]; break; } }
    if (!appt) return;
    document.getElementById('reassignApptInfo').innerHTML =
        '<strong>' + appt.service + '</strong> &middot; ' + appt.date + ' ' + appt.time
        + '<br><span style="color:#b45309;font-size:.78rem;">Declined by ' + (appt.staffDeclinedBy || 'staff') + ': ' + (appt.staffDeclineReason || '') + '</span>';
    var sel = document.getElementById('reassignStaffSel');
    var staffList = getStaffList().filter(function (s) { return s.availability !== 'unavailable' && s.availability !== 'on_leave' && s.status !== 'inactive'; });
    sel.innerHTML = '<option value="Any available staff">Any available staff</option>'
        + staffList.map(function (s) { return '<option value="' + s.name + '">' + s.name + (s.specialization ? ' — ' + s.specialization : '') + '</option>'; }).join('');
    document.getElementById('reassignModal').classList.add('open');
}

// ── js/admin/appointments/confirmReassign.js ────────────────────
function confirmReassign() {
    var newStaff = document.getElementById('reassignStaffSel').value;
    if (!_reassignApptId) return;
    var list = getSharedAppts();
    list.forEach(function (a) {
        if (String(a.id) === String(_reassignApptId)) {
            a.staff = newStaff;
            a.status = 'confirmed';
            a.staffConfirmed = null;
            a.staffDeclineReason = null;
            a.staffDeclinedBy = null;
        }
    });
    saveSharedAppts(list);
    var db = typeof getDb === 'function' ? getDb() : null;
    if (db) {
        db.collection('appointments').doc(String(_reassignApptId)).update({
            staff: newStaff, status: 'confirmed', staffConfirmed: null, staffDeclineReason: null, staffDeclinedBy: null
        }).catch(function (e) { console.warn('Firestore reassign error:', e); });
    }
    appointments = getAppointments();
    renderAllAppts(); renderRecentAppts();
    closeModal('reassignModal'); _reassignApptId = null;
    showToast('Appointment reassigned to ' + newStaff + '!');
}

// ── js/admin/appointments/setAvailability.js ────────────────────
function setAvailability(email, avail) {
    if (typeof setStaffAvailability === 'function') {
        setStaffAvailability(email, avail);
    } else {
        updateRegisteredUser(email, { availability: avail });
    }
    renderStaff();
    var labels = { available: 'Available', unavailable: 'Unavailable', on_leave: 'On Leave' };
    showToast('Staff status set to ' + (labels[avail] || avail));
}

// ── js/admin/appointments/adminMarkDone.js ──────────────────────
function adminMarkDone(id) {
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
        completedBy: user ? user.name : 'Admin',
        completedByEmail: user ? user.email : '',
        price: priceNum,
        category: categoryName
    });
    appointments = getAppointments();
    renderRecentAppts(); renderAllAppts(); updatePendingBadge();
    showToast('Appointment marked as done! ✓');
}

// ── js/admin/appointments/addAppt.js ────────────────────────────
function addAppt() {
    var svc = document.getElementById('apptSvc').value;
    var date = document.getElementById('apptDate').value || new Date().toISOString().split('T')[0];
    var time = document.getElementById('apptTime') ? document.getElementById('apptTime').value : '10:00 AM';
    var staff = document.getElementById('apptStaff') ? document.getElementById('apptStaff').value : 'Any available staff';
    var clientSel = document.getElementById('apptClient');
    var clientEmail = clientSel ? clientSel.value : '';
    var clientName = clientSel && clientSel.selectedIndex >= 0 ? clientSel.options[clientSel.selectedIndex].textContent : 'Walk-in';
    var note = document.getElementById('apptNotes') ? document.getElementById('apptNotes').value.trim() : '';
    if (!date) { showToast('Please select a date.'); return; }
    addSharedAppt({
        id: Date.now(), clientEmail: clientEmail, clientName: clientName,
        service: svc, date: date, time: time, staff: staff,
        status: 'confirmed', notes: note
    });
    appointments = getAppointments();
    renderAllAppts(); renderRecentAppts(); closeModal('apptModal');
    if (typeof logActivity === 'function') {
        logActivity('New Appointment', clientName, clientEmail, svc + ' on ' + date);
    }
    showToast('Appointment created and confirmed!');
}

// --- Services ---

// ── SERVICES — card-based UI ──────────────────────────────────────────────────

// ── js/admin/services/state.js ──────────────────────────────────
var _svcOpenEditId = null;
var _svcOpenAddCat = null;

// ── js/admin/services/svcPriceNum.js ────────────────────────────
function _svcPriceNum(p) { return parseInt((p || '0').replace(/[^\d]/g, ''), 10) || 0; }

// ── js/admin/services/escH.js ───────────────────────────────────
function _escH(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ── js/admin/services/escA.js ───────────────────────────────────
function _escA(s) { return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ── js/admin/services/sanitize.js ───────────────────────────────
function _sanitize(s) { return s.replace(/[^a-zA-Z0-9]/g, '_'); }

// ── js/admin/services/populateCatFilter.js ──────────────────────
function populateCatFilter() {
    var cats = getCategories();
    var sel = document.getElementById('svcCatFilter');
    var cur = sel ? sel.value : '';
    if (sel) sel.innerHTML = '<option value="">All Categories</option>' + cats.map(function (c) { return '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    var gCat = document.getElementById('gSvcCat');
    if (gCat) gCat.innerHTML = cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    var sCat = document.getElementById('svcCat');
    if (sCat) {
        var curSCat = sCat.value;
        sCat.innerHTML = cats.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') + '<option value="__new__">+ New Category...</option>';
        if (curSCat) sCat.value = curSCat;
    }
}

// ── js/admin/services/svcUpdateStats.js ─────────────────────────
function _svcUpdateStats() {
    var all = getServices();
    if (document.getElementById('svcStatTotal')) document.getElementById('svcStatTotal').textContent = all.length;
    if (document.getElementById('svcStatCats')) document.getElementById('svcStatCats').textContent = getCategories().length;
    var prices = all.map(function (s) { return _svcPriceNum(s.price); }).filter(function (p) { return p > 0; });
    if (prices.length) {
        var avg = Math.round(prices.reduce(function (a, b) { return a + b; }, 0) / prices.length);
        var high = Math.max.apply(null, prices);
        if (document.getElementById('svcStatAvg')) document.getElementById('svcStatAvg').textContent = '₱' + avg.toLocaleString();
        if (document.getElementById('svcStatHigh')) document.getElementById('svcStatHigh').textContent = '₱' + high.toLocaleString();
    }
    if (document.getElementById('statSvcCount')) document.getElementById('statSvcCount').textContent = all.length;
}

// ── js/admin/services/renderServicesCards.js ────────────────────
function renderServicesCards() {
    var allSvcs = getServices();
    var q = (document.getElementById('svcSearch') || { value: '' }).value.toLowerCase();
    var cf = (document.getElementById('svcCatFilter') || { value: '' }).value;
    var svcs = allSvcs;
    if (q) svcs = svcs.filter(function (s) { return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.price || '').toLowerCase().includes(q); });
    if (cf) svcs = svcs.filter(function (s) { return s.category === cf; });

    var container = document.getElementById('svcCardContainer');
    if (!container) return;
    if (!svcs.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--stone);font-size:.9rem;">No services found.</div>';
        return;
    }

    var cats = [];
    svcs.forEach(function (s) { if (cats.indexOf(s.category) === -1) cats.push(s.category); });
    container.innerHTML = '';

    cats.forEach(function (cat) {
        var catSvcs = svcs.filter(function (s) { return s.category === cat; });
        var sk = _sanitize(cat);
        var isAddOpen = _svcOpenAddCat === cat;

        var sec = document.createElement('div');
        sec.style.cssText = 'margin-bottom:24px;';

        // Category header
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
        hdr.innerHTML = '<span style="font-size:12px;font-weight:600;color:var(--stone);text-transform:uppercase;letter-spacing:.05em;">' + _escH(cat) + '</span>'
            + '<span style="font-size:11px;color:var(--silver);background:var(--pearl);padding:2px 8px;border-radius:100px;">' + catSvcs.length + '</span>'
            + '<button onclick="_svcOpenCatAdd(\'' + _escA(cat) + '\')" style="margin-left:auto;font-size:12px;color:var(--fern);background:none;border:1.5px solid var(--fern);border-radius:8px;padding:3px 10px;cursor:pointer;">+ Add here</button>';
        sec.appendChild(hdr);

        // Inline add form per category
        var addForm = document.createElement('div');
        addForm.id = 'svcAddForm_' + sk;
        addForm.style.cssText = 'display:' + (isAddOpen ? 'block' : 'none') + ';background:var(--pearl);border-radius:12px;border:1.5px solid var(--border);padding:14px;margin-bottom:10px;';
        addForm.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px;">Add to ' + _escH(cat) + '</div>'
            + '<input class="search-input" id="caSvcName_' + sk + '" placeholder="Service name" style="width:100%;margin-bottom:8px;box-sizing:border-box;" />'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
            + '<input class="search-input" id="caSvcPrice_' + sk + '" placeholder="Price e.g. ₱500" />'
            + '<input class="search-input" id="caSvcDur_' + sk + '" placeholder="Duration e.g. 60 min" /></div>'
            + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
            + '<button class="btn-cancel" onclick="_svcCloseCatAdd()">Cancel</button>'
            + '<button class="btn-modal-primary" onclick="_svcSaveCatAdd(\'' + _escA(cat) + '\')">Save</button></div>';
        sec.appendChild(addForm);

        // Service cards grid
        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;overflow:visible;';

        catSvcs.forEach(function (s) {
            var isEditing = (_svcOpenEditId === s.id);
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;';

            var card = document.createElement('div');
            card.id = 'svcCard_' + s.id;
            card.style.cssText = 'background:var(--white);border:1.5px solid ' + (isEditing ? 'var(--fern)' : 'var(--border)') + ';border-radius:12px;padding:14px;transition:border-color .15s;';
            card.innerHTML = '<div style="margin-bottom:10px;">'
                + '<div style="font-size:.9rem;font-weight:600;color:var(--ink);line-height:1.3;margin-bottom:3px;">' + _escH(s.name) + '</div>'
                + '<div style="font-size:.75rem;color:var(--stone);">&#9203; ' + _escH(s.duration || 'varies') + '</div>'
                + '</div>'
                + '<div style="display:flex;align-items:center;justify-content:space-between;">'
                + '<span style="font-size:1rem;font-weight:700;color:var(--fern);">' + _escH(s.price) + '</span>'
                + '<div style="display:flex;gap:6px;">'
                + '<button class="t-action edit" onclick="_svcToggleEdit(\'' + s.id + '\')" style="font-size:11px;padding:4px 10px;">' + (isEditing ? 'Close' : 'Edit') + '</button>'
                + '<button class="t-action del" onclick="deleteSvc(\'' + s.id + '\')" style="font-size:11px;padding:4px 8px;">&#x2715;</button>'
                + '</div></div>';

            var editPanel = document.createElement('div');
            editPanel.id = 'svcIE_' + s.id;
            editPanel.style.cssText = 'display:' + (isEditing ? 'block' : 'none') + ';'
                + 'position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:50;'
                + 'background:var(--white);border:1.5px solid var(--fern);border-radius:12px;'
                + 'padding:14px;box-shadow:0 4px 16px rgba(0,0,0,0.10);';
            editPanel.innerHTML = '<div style="font-size:11px;font-weight:600;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;">Edit Service</div>'
                + '<input class="search-input" id="ie_name_' + s.id + '" value="' + _escA(s.name) + '" placeholder="Name" style="width:100%;margin-bottom:6px;box-sizing:border-box;" />'
                + '<div style="display:flex;gap:6px;margin-bottom:6px;">'
                + '<input class="search-input" id="ie_price_' + s.id + '" value="' + _escA(s.price) + '" placeholder="Price" style="flex:1;min-width:0;" />'
                + '<input class="search-input" id="ie_dur_' + s.id + '" value="' + _escA(s.duration || '') + '" placeholder="Duration" style="flex:1;min-width:0;" /></div>'
                + '<div style="display:flex;gap:6px;justify-content:flex-end;">'
                + '<button class="btn-modal-primary" onclick="_svcSaveEdit(\'' + s.id + '\')" style="font-size:12px;padding:6px 14px;">Save</button>'
                + '<button class="btn-cancel" onclick="_svcCancelEdit()" style="font-size:12px;padding:6px 12px;">Cancel</button>'
                + '</div>';

            wrap.appendChild(card);
            wrap.appendChild(editPanel);
            grid.appendChild(wrap);
        });


        sec.appendChild(grid);
        container.appendChild(sec);

        if (isAddOpen) {
            setTimeout(function () { var el = document.getElementById('caSvcName_' + sk); if (el) el.focus(); }, 50);
        }
    });

    _svcUpdateStats();
}

// Alias so existing callers still work

// ── js/admin/services/renderServicesTable.js ────────────────────
function renderServicesTable() { renderServicesCards(); }

// ── js/admin/services/svcToggleEdit.js ──────────────────────────
function _svcToggleEdit(id) {
    _svcOpenEditId = (_svcOpenEditId === id) ? null : id;
    renderServicesCards();
    if (_svcOpenEditId) {
        setTimeout(function () { var el = document.getElementById('ie_name_' + id); if (el) { el.focus(); el.select(); } }, 50);
    }
}

// ── js/admin/services/svcCancelEdit.js ──────────────────────────
function _svcCancelEdit() { _svcOpenEditId = null; renderServicesCards(); }

// ── js/admin/services/svcSaveEdit.js ────────────────────────────
function _svcSaveEdit(id) {
    var nameEl = document.getElementById('ie_name_' + id);
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) { showToast('Service name cannot be empty.'); return; }
    var price = (document.getElementById('ie_price_' + id) || {}).value || '';
    var dur = (document.getElementById('ie_dur_' + id) || {}).value || '';
    var svcs = getServices();
    svcs = svcs.map(function (s) {
        if (s.id !== id) return s;
        return { id: s.id, category: s.category, emoji: s.emoji || '', name: name, price: price || s.price, duration: dur || s.duration, bookings: s.bookings };
    });
    saveServices(svcs);
    _svcOpenEditId = null;
    showToast('Service updated! ✓');
    renderServicesCards(); populateCatFilter();
}

// ── js/admin/services/svcOpenCatAdd.js ──────────────────────────
function _svcOpenCatAdd(cat) { _svcOpenAddCat = cat; renderServicesCards(); }

// ── js/admin/services/svcCloseCatAdd.js ─────────────────────────
function _svcCloseCatAdd() { _svcOpenAddCat = null; renderServicesCards(); }

// ── js/admin/services/svcSaveCatAdd.js ──────────────────────────
function _svcSaveCatAdd(cat) {
    var sk = _sanitize(cat);
    var name = (document.getElementById('caSvcName_' + sk) || {}).value || '';
    var price = (document.getElementById('caSvcPrice_' + sk) || {}).value || '';
    var dur = (document.getElementById('caSvcDur_' + sk) || {}).value || '';
    if (!name.trim()) { showToast('Please enter a service name.'); return; }
    if (!price.trim()) { showToast('Please enter a price.'); return; }
    var svcs = getServices();
    svcs.push({ id: 'svc' + Date.now(), category: cat, emoji: '', name: name.trim(), price: price.trim(), duration: dur.trim() || 'varies', bookings: 0 });
    saveServices(svcs);
    _svcOpenAddCat = null;
    showToast('Service added! ✓');
    renderServicesCards(); populateCatFilter();
}

// ── js/admin/services/openSvcModal.js ───────────────────────────
function openSvcModal() {
    document.getElementById('editSvcId').value = '';
    document.getElementById('svcName').value = '';
    var catSel = document.getElementById('svcCat');
    if (catSel && catSel.options.length) catSel.selectedIndex = 0;
    document.getElementById('svcPrice').value = '';
    document.getElementById('svcDuration').value = '';
    document.getElementById('svcModalTitle').textContent = 'Add New Service';
    document.getElementById('newCatGroup').style.display = 'none';
    document.getElementById('svcModal').classList.add('open');
}

// ── js/admin/services/openEditSvc.js ────────────────────────────
function openEditSvc(id) {
    var svcs = getServices();
    var s = null; for (var i = 0; i < svcs.length; i++) { if (svcs[i].id === id) { s = svcs[i]; break; } }
    if (!s) return;
    document.getElementById('editSvcId').value = s.id;
    document.getElementById('svcName').value = s.name;
    document.getElementById('svcPrice').value = s.price;
    document.getElementById('svcDuration').value = s.duration;
    document.getElementById('svcModalTitle').textContent = 'Edit Service';
    document.getElementById('newCatGroup').style.display = 'none';
    var catSel = document.getElementById('svcCat');
    var found = false;
    for (var j = 0; j < catSel.options.length; j++) { if (catSel.options[j].value === s.category) { catSel.value = s.category; found = true; break; } }
    if (!found) { var opt = document.createElement('option'); opt.value = s.category; opt.textContent = s.category; catSel.insertBefore(opt, catSel.lastElementChild); catSel.value = s.category; }
    document.getElementById('svcModal').classList.add('open');
}

// ── js/admin/services/svcCatChangeListener.js ───────────────────
document.getElementById('svcCat').addEventListener('change', function () {
    document.getElementById('newCatGroup').style.display = this.value === '__new__' ? '' : 'none';
});

// ── js/admin/services/saveSvc.js ────────────────────────────────
function saveSvc() {
    var name = document.getElementById('svcName').value.trim();
    var catSel = document.getElementById('svcCat').value;
    var cat = catSel === '__new__' ? (document.getElementById('newCatInput').value.trim() || 'Other') : catSel;
    var price = document.getElementById('svcPrice').value.trim();
    var duration = document.getElementById('svcDuration').value.trim();
    var editId = document.getElementById('editSvcId').value;
    if (!name) { showToast('Please enter a service name.'); return; }
    if (!price) { showToast('Please enter a price.'); return; }
    var svcs = getServices();
    if (editId) {
        svcs = svcs.map(function (s) { return s.id === editId ? { id: s.id, category: cat, emoji: s.emoji || '', name: name, price: price, duration: duration || 'varies', bookings: s.bookings } : s; });
        showToast('Service updated! ✓');
    } else {
        svcs.push({ id: 'svc' + Date.now(), category: cat, emoji: '', name: name, price: price, duration: duration || 'varies', bookings: 0 });
        showToast('Service added! ✓');
    }
    saveServices(svcs);
    renderServicesCards(); populateCatFilter();
    closeModal('svcModal');
}

// ── js/admin/services/openGlobalSvcAdd.js ───────────────────────
function openGlobalSvcAdd() { /* kept for compat */ openSvcModal(); }

// ── js/admin/services/closeGlobalSvcAdd.js ──────────────────────
function closeGlobalSvcAdd() { closeModal('svcModal'); }

// ── js/admin/services/saveGlobalSvc.js ──────────────────────────
function saveGlobalSvc() { saveSvc(); }

// ── js/admin/services/deleteSvc.js ──────────────────────────────
function deleteSvc(id) {
    if (!confirm('Delete this service from the catalog? This cannot be undone.')) return;
    var svcs = getServices().filter(function (s) { return s.id !== id; });
    saveServices(svcs);
    if (typeof deleteServiceFromFirestore === 'function') deleteServiceFromFirestore(id);
    renderServicesCards(); populateCatFilter(); showToast('Service deleted.');
}

// ── js/admin/chatbot/faqManagement.js ────────────────────────────
// Admin "Chatbot Management" CRUD panel. Reads/writes the SAME
// chatbotFAQs data as the Client/public chatbot widget (js/chatbot-widget.js)
// via the shared functions in shared-data.js — no separate/fake FAQ store.
var _faqOpenEditId = null;
var _faqUnsub = null;

function _faqDuplicateExists(question, excludeId) {
    var norm = normalizeChatText(question);
    return getFAQs().some(function (f) {
        return String(f.id) !== String(excludeId) && normalizeChatText(f.question) === norm;
    });
}

function renderFaqList() {
    // Live Firestore sync so the panel reflects changes made from any
    // admin session; onSnapshot also flows edits to the Client chatbot in
    // real time (Part 9).
    if (!_faqUnsub && typeof listenToFAQs === 'function') {
        _faqUnsub = listenToFAQs(function () { renderFaqList(); });
    }

    var all = getFAQs();
    var q = (document.getElementById('faqSearch') || { value: '' }).value.toLowerCase().trim();
    var statusFilter = (document.getElementById('faqStatusFilter') || { value: '' }).value;
    var list = all;
    if (q) {
        list = list.filter(function (f) {
            return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) ||
                (f.keywords || []).some(function (k) { return k.toLowerCase().includes(q); });
        });
    }
    if (statusFilter === 'active') list = list.filter(function (f) { return f.active !== false; });
    if (statusFilter === 'inactive') list = list.filter(function (f) { return f.active === false; });

    document.getElementById('faqStatTotal').textContent = all.length;
    document.getElementById('faqStatActive').textContent = all.filter(function (f) { return f.active !== false; }).length;
    document.getElementById('faqStatDisabled').textContent = all.filter(function (f) { return f.active === false; }).length;

    var container = document.getElementById('faqListContainer');
    if (!container) return;
    if (!list.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--stone);font-size:.9rem;">No FAQs found.</div>';
        return;
    }

    container.innerHTML = list.map(function (f) {
        var isEditing = (_faqOpenEditId === f.id);
        var isActive = f.active !== false;
        var kw = (f.keywords || []).join(', ');
        return '<div style="background:var(--white);border:1.5px solid ' + (isEditing ? 'var(--fern)' : 'var(--border)') + ';border-radius:12px;padding:16px;margin-bottom:12px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:200px;">'
            + '<div style="font-size:.7rem;font-weight:600;color:var(--stone);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Question</div>'
            + '<div style="font-size:.92rem;font-weight:600;color:var(--ink);margin-bottom:10px;">' + _escH(f.question) + '</div>'
            + '<div style="font-size:.7rem;font-weight:600;color:var(--stone);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Answer</div>'
            + '<div style="font-size:.85rem;color:var(--charcoal);line-height:1.5;margin-bottom:8px;">' + _escH(f.answer) + '</div>'
            + (kw ? '<div style="font-size:.72rem;color:var(--stone);">Keywords: ' + _escH(kw) + '</div>' : '')
            + '</div>'
            + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">'
            + '<span class="badge ' + (isActive ? 'b-confirmed' : 'b-pending') + '">' + (isActive ? 'Active' : 'Disabled') + '</span>'
            + '<div style="display:flex;gap:6px;">'
            + '<button class="t-action edit" onclick="openFaqModal(\'' + f.id + '\')">Edit</button>'
            + '<button class="t-action" onclick="toggleFaqActive(\'' + f.id + '\')">' + (isActive ? 'Disable' : 'Enable') + '</button>'
            + '<button class="t-action del" onclick="deleteFaq(\'' + f.id + '\')">Delete</button>'
            + '</div></div></div></div>';
    }).join('');
}

function openFaqModal(id) {
    document.getElementById('faqModalTitle').textContent = id ? 'Edit FAQ' : 'Add New FAQ';
    if (id) {
        var faq = getFAQs().filter(function (f) { return String(f.id) === String(id); })[0];
        if (!faq) { showToast('FAQ not found.'); return; }
        document.getElementById('editFaqId').value = faq.id;
        document.getElementById('faqQuestion').value = faq.question;
        document.getElementById('faqAnswer').value = faq.answer;
        document.getElementById('faqKeywords').value = (faq.keywords || []).join(', ');
        document.getElementById('faqActive').checked = faq.active !== false;
    } else {
        document.getElementById('editFaqId').value = '';
        document.getElementById('faqQuestion').value = '';
        document.getElementById('faqAnswer').value = '';
        document.getElementById('faqKeywords').value = '';
        document.getElementById('faqActive').checked = true;
    }
    document.getElementById('faqModal').classList.add('open');
}

function saveFaqFromModal() {
    var question = document.getElementById('faqQuestion').value.trim();
    var answer = document.getElementById('faqAnswer').value.trim();
    var keywordsRaw = document.getElementById('faqKeywords').value.trim();
    var active = document.getElementById('faqActive').checked;
    var editId = document.getElementById('editFaqId').value;

    if (!question) { showToast('Question is required.'); return; }
    if (!answer) { showToast('Answer is required.'); return; }
    if (_faqDuplicateExists(question, editId)) { showToast('A FAQ with this question already exists.'); return; }

    var keywords = keywordsRaw ? keywordsRaw.split(',').map(function (k) { return k.trim(); }).filter(Boolean) : [];
    var id = editId || ('faq' + Date.now());
    saveFAQ({ id: id, question: question, answer: answer, keywords: keywords, active: active });

    showToast(editId ? 'FAQ updated successfully.' : 'FAQ added successfully.');
    closeModal('faqModal');
    renderFaqList();
}

function toggleFaqActive(id) {
    var faq = getFAQs().filter(function (f) { return String(f.id) === String(id); })[0];
    if (!faq) return;
    saveFAQ({ id: faq.id, question: faq.question, answer: faq.answer, keywords: faq.keywords, active: !(faq.active !== false) });
    showToast('FAQ ' + (faq.active !== false ? 'disabled' : 'enabled') + '.');
    renderFaqList();
}

function deleteFaq(id) {
    if (!confirm('Delete this FAQ? This cannot be undone.')) return;
    deleteFAQFromFirestore(id);
    if (_faqOpenEditId === id) _faqOpenEditId = null;
    showToast('FAQ deleted successfully.');
    renderFaqList();
}

// ── js/admin/services/populateApptSvc.js ────────────────────────
function populateApptSvc() {
    document.getElementById('apptSvc').innerHTML = getServices().map(function (s) { return '<option>' + s.name + '</option>'; }).join('');
    var clientSel = document.getElementById('apptClient');
    var clients = getClientList();
    clientSel.innerHTML = clients.length
        ? clients.map(function (c) { return '<option value="' + c.email + '">' + c.name + '</option>'; }).join('')
        : '<option value="">No clients registered yet</option>';
}

// ── js/admin/services/openApptModal.js ──────────────────────────
function openApptModal() {
    populateApptSvc();
    var staffSel = document.getElementById('apptStaff');
    var staffUsers = getStaffList();
    staffSel.innerHTML = '<option value="Any available staff">Any available staff</option>';
    staffUsers.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name + (s.specialization ? ' — ' + s.specialization : '');
        staffSel.appendChild(opt);
    });
    var today = new Date().toISOString().split('T')[0];
    initBookingAvailability('appt', today);
    var notesEl = document.getElementById('apptNotes');
    if (notesEl) notesEl.value = '';
    document.getElementById('apptModal').classList.add('open');
}

// --- Clients ---

// ── js/admin/clients/renderClients.js ───────────────────────────
function renderClients() {
    var data = buildClientsList();
    var q = (document.getElementById('clientSearch') || { value: '' }).value.toLowerCase();
    if (q) data = data.filter(function (c) { return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q); });
    var lbMap = { Platinum: 'b-admin', Gold: 'b-confirmed', Silver: 'b-staff', Bronze: 'b-client' };
    document.getElementById('clientsTable').innerHTML = data.map(function (c) {
        return '<tr><td data-label="Name"><strong>' + c.name + '</strong></td><td data-label="Email" style="color:var(--stone)">' + c.email + '</td><td data-label="Visits">' + c.visits + '</td><td data-label="Last">' + c.last + '</td>'
            + '<td data-label="Loyalty"><span class="badge ' + (lbMap[c.loyalty] || '') + '">' + c.loyalty + '</span></td>'
            + '<td>'
            + '<button class="t-action" onclick="viewClient(\'' + c.email + '\')">View</button>'
            + '<button class="t-action del" onclick="removeClient(\'' + c.email + '\', \'' + c.name.replace(/'/g, "\\'") + '\')">✕</button>'
            + '</td></tr>';
    }).join('');
}

// ── js/admin/clients/promoteToStaff.js ──────────────────────────
function promoteToStaff(email, name) {
    if (!confirm('Promote ' + name + ' to Staff?\n\nThey will be moved from Clients to Staff and can log in with their existing account (including Google sign-in).')) return;
    var updates = { role: 'staff', specialization: 'All Services' };
    if (typeof updateRegisteredUser === 'function') {
        updateRegisteredUser(email, updates);
    } else {
        var reg = getRegisteredUsers();
        reg.forEach(function (u) { if (u.email === email) { u.role = 'staff'; u.specialization = 'All Services'; } });
        localStorage.setItem('spa_registered_users', JSON.stringify(reg));
    }
    renderClients();
    renderStaff();
    renderUsers();
    showToast(name + ' is now a Staff member! ✓');
}

// ── js/admin/clients/removeClient.js ────────────────────────────
function removeClient(email, name) {
    var displayName = name || email;
    if (!confirm('Remove ' + displayName + '?')) return;
    if (typeof removeRegisteredUserByEmail === 'function') {
        removeRegisteredUserByEmail(email);
    } else {
        var reg = getRegisteredUsers();
        var updated = reg.filter(function (u) { return u.email !== email; });
        saveRegisteredUsers(updated);
    }
    renderClients(); showToast(displayName + ' removed.');
}

// --- Staff ---

// ── js/admin/staff/renderStaff.js ───────────────────────────────
function renderStaff() {
    var staffList = buildStaffList();
    document.getElementById('staffTable').innerHTML = staffList.length
        ? staffList.map(function (s) {
            var email = s.email;
            var avail = s.availability;
            var availColor = { available: '#10b981', unavailable: '#ef4444', on_leave: '#f59e0b' }[avail] || '#10b981';
            var availLabel = { available: 'Available', unavailable: 'Unavailable', on_leave: 'On Leave' }[avail] || 'Available';
            return '<tr>'
                + '<td data-label="Name"><strong>' + s.name + '</strong></td>'
                + '<td data-label="Specialization">' + s.spec + '</td>'
                + '<td data-label="Sessions">' + s.today + '</td>'
                + '<td data-label="Status"><span class="badge ' + (s.status === 'active' ? 'b-confirmed' : 'b-pending') + '">' + s.status + '</span></td>'
                + '<td data-label="Availability"><span style="display:inline-flex;align-items:center;gap:5px;font-size:.75rem;font-weight:600;color:' + availColor + ';">● ' + availLabel + '</span></td>'
                + '<td>'
                + '<select class="filter-select" style="font-size:.73rem;padding:4px 8px;min-width:120px;" onchange="setAvailability(\'' + email + '\',this.value)">'
                + '<option value="available"' + (avail === 'available' ? ' selected' : '') + '>✓ Available</option>'
                + '<option value="unavailable"' + (avail === 'unavailable' ? ' selected' : '') + '>✕ Unavailable</option>'
                + '<option value="on_leave"' + (avail === 'on_leave' ? ' selected' : '') + '>🌿 On Leave</option>'
                + '</select>'
                + ' <button class="t-action edit" onclick="toggleStaffStatus(\'' + s.name + '\')">' + (s.status === 'active' ? 'Deactivate' : 'Activate') + '</button>'
                + ' <button class="t-action" style="background:#94a3b8;color:#fff;" onclick="demoteToClient(\'' + email + '\', \'' + s.name + '\')">↩ Client</button>'
                + '<button class="t-action del" onclick="removeStaff(\'' + email + '\', \'' + s.name.replace(/'/g, "\\'") + '\')">✕</button>'
                + '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;color:var(--stone);padding:20px;">No staff registered yet.</td></tr>';
}

// ── js/admin/staff/toggleStaffStatus.js ─────────────────────────
function toggleStaffStatus(name) {
    var reg = getRegisteredUsers();
    var target = null;
    reg.forEach(function (u) { if (u.name === name && u.role === 'staff') { u.status = (u.status === 'inactive' ? 'active' : 'inactive'); target = u; } });
    saveRegisteredUsers(reg);
    if (target && typeof updateRegisteredUser === 'function') {
        updateRegisteredUser(target.email, { status: target.status });
    }
    renderStaff(); showToast('Staff status updated.');
}

// ── js/admin/staff/removeStaff.js ───────────────────────────────
function removeStaff(email, name) {
    var displayName = name || email;
    if (!confirm('Remove ' + displayName + '?')) return;
    if (typeof removeRegisteredUserByEmail === 'function') {
        removeRegisteredUserByEmail(email);
    } else {
        var reg = getRegisteredUsers();
        var updated = reg.filter(function (u) { return u.email !== email; });
        saveRegisteredUsers(updated);
    }
    renderStaff(); showToast(displayName + ' removed.');
}

// ── js/admin/staff/demoteToClient.js ────────────────────────────
function demoteToClient(email, name) {
    if (!confirm('Move ' + name + ' back to Client?\n\nThey will lose staff access and be moved to the Clients list.')) return;
    var updates = { role: 'client' };
    if (typeof updateRegisteredUser === 'function') {
        updateRegisteredUser(email, updates);
    } else {
        var reg = getRegisteredUsers();
        reg.forEach(function (u) { if (u.email === email) { u.role = 'client'; } });
        localStorage.setItem('spa_registered_users', JSON.stringify(reg));
    }
    renderClients();
    renderStaff();
    renderUsers();
    showToast(name + ' moved back to Client. ✓');
}

// --- Users ---

// ── js/admin/staff/openStaffModal.js ────────────────────────────
function openStaffModal() {
    document.getElementById('newStaffName').value = '';
    document.getElementById('newStaffEmail').value = '';
    document.getElementById('newStaffPassword').value = '';
    document.getElementById('newStaffSpec').value = 'All Services';
    document.getElementById('staffModal').classList.add('open');
}

// ── js/admin/staff/addStaff.js ──────────────────────────────────
function addStaff() {
    var name = document.getElementById('newStaffName').value.trim();
    var email = document.getElementById('newStaffEmail').value.trim().toLowerCase();
    var pass = document.getElementById('newStaffPassword').value;
    var spec = document.getElementById('newStaffSpec').value;
    if (!name) { showToast('Please enter a full name.'); return; }
    if (!email) { showToast('Please enter an email address.'); return; }
    if (!pass) { showToast('Please enter a password.'); return; }
    if (pass.length < 6) { showToast('Password must be at least 6 characters.'); return; }
    var reg = getRegisteredUsers();
    if (reg.some(function (u) { return u.email === email; })) { showToast('An account with this email already exists.'); return; }
    var newStaff = { name: name, email: email, password: pass, role: 'staff', specialization: spec, gender: spec, avatar: null, profilePhoto: null, phone: null };
    if (typeof addRegisteredUser === 'function') {
        addRegisteredUser(newStaff);
    } else {
        reg.push(newStaff);
        localStorage.setItem('spa_registered_users', JSON.stringify(reg));
    }
    renderStaff();
    closeModal('staffModal');
    showToast(name + ' added as staff! ✓');
}

// ── js/admin/users/state.js ─────────────────────────────────────
var _userRoleFilter = 'all';
var _userSearchQuery = '';
var _userSearchDebounceTimer = null;

// ── js/admin/users/search.js ─────────────────────────────────────
// Debounced (300ms) real-time search across name / email / role, combined
// with the existing role-pill filter. ESC clears the field.
function onUserSearchInput() {
    var input = document.getElementById('userSearchInput');
    var clearBtn = document.getElementById('userSearchClear');
    if (clearBtn) clearBtn.style.display = input.value ? 'block' : 'none';

    clearTimeout(_userSearchDebounceTimer);
    _userSearchDebounceTimer = setTimeout(function () {
        _userSearchQuery = input.value.trim().toLowerCase();
        renderUsers();
    }, 300);
}

function onUserSearchKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        clearUserSearch();
    }
}

function clearUserSearch() {
    var input = document.getElementById('userSearchInput');
    var clearBtn = document.getElementById('userSearchClear');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    clearTimeout(_userSearchDebounceTimer);
    _userSearchQuery = '';
    renderUsers();
}

// Wraps every case-insensitive match of `q` inside `text` with <mark>,
// escaping HTML first so the highlighted output can never inject markup.
function highlightUserMatch(text, q) {
    var safe = escHtml(text);
    if (!q) return safe;
    var safeQ = escHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp('(' + safeQ + ')', 'ig'), '<mark style="background:rgba(212,175,55,0.35);color:inherit;border-radius:2px;">$1</mark>');
}

// ── js/admin/users/setUserRoleFilter.js ─────────────────────────
function setUserRoleFilter(role) {
    _userRoleFilter = role;
    // Update button styles
    var roleMap = { all: 'ufAll', admin: 'ufAdmin', staff: 'ufStaff', client: 'ufClient' };
    Object.keys(roleMap).forEach(function (r) {
        var btn = document.getElementById(roleMap[r]);
        if (!btn) return;
        if (r === role) {
            btn.style.background = 'var(--fern)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'var(--fern)';
        } else {
            btn.style.background = 'var(--white)';
            btn.style.color = 'var(--ink)';
            btn.style.borderColor = 'var(--border)';
        }
    });
    renderUsers();
}

// ── js/admin/users/renderUsers.js ───────────────────────────────
function renderUsers() {
    var users = buildUsersList();
    var roleFiltered = _userRoleFilter === 'all' ? users : users.filter(function (u) { return u.role === _userRoleFilter; });

    var q = _userSearchQuery;
    var filtered = !q ? roleFiltered : roleFiltered.filter(function (u) {
        return (u.name || '').toLowerCase().indexOf(q) !== -1 ||
            (u.email || '').toLowerCase().indexOf(q) !== -1 ||
            (u.role || '').toLowerCase().indexOf(q) !== -1;
    });

    var countEl = document.getElementById('userFilterCount');
    if (countEl) countEl.textContent = 'Showing ' + filtered.length + ' of ' + users.length + ' user' + (users.length !== 1 ? 's' : '');

    var tbody = document.getElementById('usersTable');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px 12px;color:var(--stone);font-size:.85rem;">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(function (u) {
        var pendingBadge = u.pending ? '<span style="font-size:.65rem;background:rgba(217,119,6,0.12);color:#d97706;border:1px solid rgba(217,119,6,0.3);border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:600;vertical-align:middle;">⏳ Pending</span>' : '';
        var resendBtn = u.pending ? '<button class="t-action" style="background:#d97706;color:#fff;" onclick="resendVerifyLink(\'' + u.email + '\', \'' + u.name + '\')">Resend Link</button>' : '';
        var formattedDate = u.dateAdded && u.dateAdded !== '—'
            ? (function (d) { var p = d.split('-'); return p.length === 3 ? p[1] + '/' + p[2] + '/' + p[0] : d; })(u.dateAdded)
            : '—';
        var nameHtml = highlightUserMatch(u.name, q);
        var emailHtml = highlightUserMatch(u.email, q);
        return '<tr><td data-label="Name"><strong>' + nameHtml + '</strong>' + pendingBadge + '</td><td data-label="Email" style="color:var(--stone)">' + emailHtml + '</td><td data-label="Role">' + rb(u.role) + '</td><td data-label="Last Login">' + u.last + '</td><td data-label="Date Added" style="color:var(--stone);font-size:.82rem;">' + formattedDate + '</td>'
            + '<td>' + resendBtn + '<button class="t-action edit" onclick="openEditUserModal(\'' + u.email + '\')">Edit</button><button class="t-action del" onclick="removeUser(\'' + u.email + '\')">✕</button></td></tr>';
    }).join('');
}

// ── js/admin/users/resendVerifyLink.js ──────────────────────────
function resendVerifyLink(email, name) {
    if (!firebaseReady || !auth) { showToast('Firebase not available.'); return; }
    var role = 'client';
    try {
        var reg = getRegisteredUsers();
        var found = reg.find(function (u) { return u.email === email; });
        if (found) role = found.role || 'client';
    } catch (e) { }

    var actionCodeSettings = {
        url: window.location.origin + '/index.html?verified=1&email=' + encodeURIComponent(email),
        handleCodeInApp: true
    };
    auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(function () {
            var pendingKey = 'spa_pending_verify_' + email.replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(pendingKey, JSON.stringify({ name: name, email: email, role: role, sentAt: new Date().toISOString() }));
            showToast('✅ Verification link resent to ' + email);
        })
        .catch(function (err) { showToast('Failed to resend: ' + err.message); });
}

// ── js/admin/users/openUserModal.js ─────────────────────────────
function openUserModal() {
    document.getElementById('userModal').classList.add('open');
    // Reset fields
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserRole').value = 'client';
    // Default date to today
    var todayStr = new Date().toISOString().split('T')[0];
    var dateEl = document.getElementById('newUserDateAdded');
    if (dateEl) dateEl.value = todayStr;
    setEmailCheckUI('idle');
    // Reset verification state
    _verifyLinkSent = false;
    var vs = document.getElementById('verifyStatus');
    if (vs) vs.style.display = 'none';
    var sl = document.getElementById('sendVerifyLabel');
    if (sl) sl.textContent = '📧 Send Verification Link';
    var sb = document.getElementById('sendVerifyBtn');
    if (sb) { sb.disabled = false; sb.style.opacity = '1'; }
}

// ── Email existence check via Firebase Auth ──────────────────────────────────

// ── js/admin/users/emailCheckState.js ───────────────────────────
var _emailCheckTimer = null;
var _emailCheckStatus = 'idle'; // idle | checking | found | notfound | error

// ── js/admin/users/setEmailCheckUI.js ───────────────────────────
function setEmailCheckUI(status, msg) {
    _emailCheckStatus = status;
    var icon = document.getElementById('emailCheckIcon');
    var msgEl = document.getElementById('emailCheckMsg');
    if (!icon || !msgEl) return;

    var configs = {
        idle: { icon: '', show: false, text: '', bg: '', color: '' },
        checking: { icon: '⏳', show: true, text: 'Checking email…', bg: 'rgba(100,100,100,0.08)', color: '#888' },
        found: { icon: '✅', show: true, text: msg || 'Gmail account found — can be added.', bg: 'rgba(22,163,74,0.08)', color: '#16a34a' },
        notfound: { icon: '❌', show: true, text: msg || 'No Google account found for this email.', bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
        localonly: { icon: '⚠️', show: true, text: msg || 'Email is not a Google account — will be added as a local user.', bg: 'rgba(217,119,6,0.08)', color: '#d97706' },
        duplicate: { icon: '🚫', show: true, text: msg || 'This email is already registered in the system.', bg: 'rgba(220,38,38,0.08)', color: '#dc2626' },
        error: { icon: '⚠️', show: true, text: msg || 'Could not verify email. You may still proceed.', bg: 'rgba(217,119,6,0.08)', color: '#d97706' }
    };

    var cfg = configs[status] || configs.idle;
    icon.textContent = cfg.icon;
    icon.style.display = cfg.show ? 'inline' : 'none';
    msgEl.style.display = cfg.show ? 'block' : 'none';
    msgEl.textContent = cfg.text;
    msgEl.style.background = cfg.bg;
    msgEl.style.color = cfg.color;
}

// Wire up email input — check on blur and on typing (debounced)

// ── js/admin/users/domReadyEmailCheckListener.js ────────────────
document.addEventListener('DOMContentLoaded', function () {
    var emailInput = document.getElementById('newUserEmail');
    if (!emailInput) return;

    emailInput.addEventListener('input', function () {
        clearTimeout(_emailCheckTimer);
        var val = this.value.trim().toLowerCase();
        if (!val) { setEmailCheckUI('idle'); return; }
        setEmailCheckUI('checking');
        _emailCheckTimer = setTimeout(function () { checkEmailExists(val); }, 700);
    });

    emailInput.addEventListener('blur', function () {
        clearTimeout(_emailCheckTimer);
        var val = this.value.trim().toLowerCase();
        if (val) checkEmailExists(val);
    });

    setTimeout(renderCalendar, 400);
    setTimeout(updatePendingBadge, 600);
});

// ── js/admin/users/checkEmailExists.js ──────────────────────────
function checkEmailExists(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailCheckUI('idle');
        return;
    }

    // 1) Check local system first (always)
    var reg = getRegisteredUsers();
    if (reg.some(function (u) { return u.email === email; }) || email === 'admin@gmail.com') {
        setEmailCheckUI('duplicate', 'This email is already registered in the system.');
        return;
    }

    // 2) Check Firebase Auth using createUserWithEmailAndPassword probe
    //    fetchSignInMethodsForEmail is disabled in newer Firebase projects by default,
    //    so instead we attempt to create a temp account with a dummy password.
    //    If it throws 'email-already-in-use' → account exists (Google or email/pw).
    //    If it succeeds → no existing account; immediately delete the temp user.
    if (typeof firebaseReady !== 'undefined' && firebaseReady && auth) {
        setEmailCheckUI('checking');

        // First try fetchSignInMethodsForEmail (works if enabled in Firebase Console)
        auth.fetchSignInMethodsForEmail(email)
            .then(function (methods) {
                if (methods && methods.length > 0) {
                    var isGoogle = methods.indexOf('google.com') !== -1;
                    if (isGoogle) {
                        setEmailCheckUI('found', '✓ Google account detected — safe to add.');
                    } else {
                        setEmailCheckUI('found', '✓ Firebase account exists — safe to add.');
                    }
                } else {
                    // fetchSignInMethods returned empty — may be disabled in this project.
                    // Fall back: probe via createUserWithEmailAndPassword.
                    _probeEmailViaCreate(email);
                }
            })
            .catch(function (err) {
                // fetchSignInMethods itself errored (e.g. method disabled) — fall back to probe.
                console.warn('[AddUser] fetchSignInMethods unavailable, probing via create:', err.message);
                _probeEmailViaCreate(email);
            });
    } else {
        setEmailCheckUI('localonly', 'Firebase unavailable — email not verified online.');
    }
}

// Probe whether an email has an existing Firebase/Google account.
// Strategy: attempt signInWithEmailAndPassword with a bogus password.
//   - auth/wrong-password        → account EXISTS (email+pw user)
//   - auth/user-not-found        → no account at all
//   - auth/invalid-credential    → newer SDK unified error; means NO account found
//   - auth/account-exists-with-different-credential → account EXISTS (Google/other provider)
//   - auth/operation-not-allowed → email/pw provider disabled; fall back to create probe
// This works even when fetchSignInMethodsForEmail is disabled.

// ── js/admin/users/probeEmailViaCreate.js ───────────────────────
function _probeEmailViaCreate(email) {
    var bogusPass = 'X_probe_' + Math.random().toString(36).slice(2);

    auth.signInWithEmailAndPassword(email, bogusPass)
        .then(function () {
            // Should never succeed with a bogus password, but just in case
            setEmailCheckUI('found', '✓ Existing account detected — safe to add.');
        })
        .catch(function (err) {
            console.log('[AddUser] signIn probe error code:', err.code);

            if (err.code === 'auth/wrong-password' ||
                err.code === 'auth/too-many-requests') {
                // wrong-password → account exists with email/password
                // too-many-requests → also implies account exists (Firebase rate-limits existing accounts)
                setEmailCheckUI('found', '✓ Existing account detected — safe to add.');

            } else if (err.code === 'auth/user-not-found' ||
                err.code === 'auth/invalid-credential' ||
                err.code === 'auth/invalid-login-credentials') {
                // These all mean: no account exists for this email
                // Try one more method: createUserWithEmailAndPassword
                _probeEmailViaCreateAccount(email);

            } else if (err.code === 'auth/account-exists-with-different-credential') {
                // Account exists but with Google/other provider (not email+pw)
                setEmailCheckUI('found', '✓ Google/social account detected — safe to add.');

            } else if (err.code === 'auth/operation-not-allowed') {
                // Email/password sign-in disabled — try create probe instead
                _probeEmailViaCreateAccount(email);

            } else {
                console.warn('[AddUser] signIn probe unexpected error:', err.code, err.message);
                setEmailCheckUI('error', 'Could not verify email online. You may still proceed.');
            }
        });
}

// Secondary probe: try creating a throwaway account.
// If email-already-in-use → account exists (could be Google).
// If success → no account; delete immediately.
// If operation-not-allowed → both providers disabled; cannot verify.

// ── js/admin/users/probeEmailViaCreateAccount.js ────────────────
function _probeEmailViaCreateAccount(email) {
    var dummyPass = 'Pr0be__' + Math.random().toString(36).slice(2) + Date.now();

    auth.createUserWithEmailAndPassword(email, dummyPass)
        .then(function (cred) {
            // Created successfully → no prior account existed
            cred.user.delete().catch(function () { });
            setEmailCheckUI('localonly', 'No existing Google account found for this email.');
        })
        .catch(function (err) {
            if (err.code === 'auth/email-already-in-use') {
                // Account exists — likely Google since signIn probe said "not found"
                setEmailCheckUI('found', '✓ Google account detected — safe to add.');
            } else if (err.code === 'auth/admin-restricted-operation' ||
                err.code === 'auth/operation-not-allowed') {
                // Both email/pw sign-in AND sign-up are disabled in this Firebase project.
                // We genuinely cannot verify — show neutral warning.
                setEmailCheckUI('localonly', 'Cannot verify online — will be added as local user.');
            } else {
                console.warn('[AddUser] create probe error:', err.code, err.message);
                setEmailCheckUI('error', 'Could not verify email online. You may still proceed.');
            }
        });
}

// ── Verification link state ──────────────────────────────────────────────────

// ── js/admin/users/verifyLinkState.js ───────────────────────────
var _verifyLinkSent = false;

// ── js/admin/users/sendVerificationLink.js ──────────────────────
function sendVerificationLink() {
    var email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    var name = document.getElementById('newUserName').value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address first.');
        return;
    }
    if (_emailCheckStatus === 'duplicate') {
        showToast('This email is already registered.');
        return;
    }
    if (!firebaseReady || !auth) {
        showToast('Firebase not available. Cannot send link.');
        return;
    }

    // Show spinner
    document.getElementById('sendVerifyLabel').style.display = 'none';
    document.getElementById('sendVerifySpin').style.display = 'block';
    document.getElementById('sendVerifyBtn').disabled = true;

    var actionCodeSettings = {
        // After clicking, user lands back on the app login page
        url: window.location.origin + '/index.html?verified=1&email=' + encodeURIComponent(email),
        handleCodeInApp: true
    };

    auth.sendSignInLinkToEmail(email, actionCodeSettings)
        .then(function () {
            _verifyLinkSent = true;
            // Store pending user info so we can register them when they click the link
            var pendingKey = 'spa_pending_verify_' + email.replace(/[^a-z0-9]/g, '_');
            var role = document.getElementById('newUserRole').value;
            localStorage.setItem(pendingKey, JSON.stringify({
                name: name || email,
                email: email,
                role: role,
                sentAt: new Date().toISOString()
            }));

            document.getElementById('sendVerifyLabel').style.display = 'block';
            document.getElementById('sendVerifyLabel').textContent = '✓ Link Sent!';
            document.getElementById('sendVerifySpin').style.display = 'none';
            document.getElementById('sendVerifyBtn').style.background = 'rgba(22,163,74,0.08)';
            document.getElementById('sendVerifyBtn').style.borderColor = '#16a34a';
            document.getElementById('sendVerifyBtn').style.color = '#16a34a';

            var vs = document.getElementById('verifyStatus');
            vs.style.display = 'block';
            vs.style.background = 'rgba(22,163,74,0.08)';
            vs.style.color = '#16a34a';
            vs.textContent = '✅ Verification link sent to ' + email + '. They must click it before their account activates.';
        })
        .catch(function (err) {
            document.getElementById('sendVerifyLabel').style.display = 'block';
            document.getElementById('sendVerifySpin').style.display = 'none';
            document.getElementById('sendVerifyBtn').disabled = false;

            var vs = document.getElementById('verifyStatus');
            vs.style.display = 'block';
            vs.style.background = 'rgba(220,38,38,0.08)';
            vs.style.color = '#dc2626';

            if (err.code === 'auth/operation-not-allowed') {
                vs.textContent = '⚠️ Email link sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → Enable "Email link (passwordless sign-in)".';
            } else {
                vs.textContent = '⚠️ Failed to send: ' + err.message;
            }
            console.warn('[AddUser] sendSignInLinkToEmail error:', err.code, err.message);
        });
}

// ── js/admin/users/addUser.js ───────────────────────────────────
function addUser() {
    var name = document.getElementById('newUserName').value.trim();
    var email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    var role = document.getElementById('newUserRole').value;
    var dateEl = document.getElementById('newUserDateAdded');
    var dateAdded = dateEl ? (dateEl.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];

    if (!name) { showToast('Please enter a name.'); return; }
    if (!email) { showToast('Please enter an email.'); return; }

    // Block duplicates
    if (_emailCheckStatus === 'duplicate') {
        showToast('That email is already registered in the system.');
        return;
    }

    // Must have sent the verification link before creating
    if (!_verifyLinkSent) {
        showToast('Please send the verification link to the user first.');
        // Highlight the send button
        var sb = document.getElementById('sendVerifyBtn');
        if (sb) { sb.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.25)'; setTimeout(function () { sb.style.boxShadow = ''; }, 1500); }
        return;
    }

    var reg = getRegisteredUsers();
    if (reg.some(function (u) { return u.email === email; })) { showToast('Email already exists.'); return; }

    // Add user as "pending" — their account is officially created when they click the link.
    // We still add them to the local list so admin can assign roles immediately.
    var nu = {
        name: name,
        email: email,
        password: null,        // no password — they sign in via email link or Google
        role: role,
        avatar: null,
        profilePhoto: null,
        phone: null,
        dateAdded: dateAdded,
        pending: true          // flag: waiting for email link verification
    };
    if (typeof addRegisteredUser === 'function') { addRegisteredUser(nu); }
    else { reg.push(nu); localStorage.setItem('spa_registered_users', JSON.stringify(reg)); }

    renderUsers(); renderClients(); renderStaff();
    closeModal('userModal');
    setEmailCheckUI('idle');
    _verifyLinkSent = false;
    showToast('✅ ' + name + ' added as ' + role + '. Waiting for them to verify their email.');
}

// ── js/admin/users/removeUser.js ────────────────────────────────
function removeUser(email) {
    if (!confirm('Remove user?')) return;
    if (typeof removeRegisteredUserByEmail === 'function') {
        removeRegisteredUserByEmail(email);
    } else {
        var reg = getRegisteredUsers();
        var updated = reg.filter(function (u) { return u.email !== email; });
        localStorage.setItem('spa_registered_users', JSON.stringify(updated));
    }
    renderUsers(); showToast('User removed.');
}

// --- Reports ---
// All figures on this page are computed live from getSharedAppts() / getServices()
// (the same localStorage+Firestore-backed data source used by the Overview
// dashboard's getTotalRevenue()/getTodayRevenue()/buildTopServicesData()), so
// Reports and Dashboard never disagree for the same underlying records.
// Nothing here is hardcoded or sampled — an empty filtered result renders the
// "No report data available" message instead of a fabricated ₱0/0% chart.

// ── js/admin/reports/state.js ───────────────────────────────────
var dayBarInst = null;
var rptStatusChartInst = null;
var rptDateRange = 'month';

// ── js/admin/reports/filters.js ───────────────────────────────────
function setRptRange(range, btn) {
    rptDateRange = range;
    document.querySelectorAll('#rptRangeBar .appt-range-pill').forEach(function (p) { p.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var customWrap = document.getElementById('rptCustomRange');
    if (customWrap) customWrap.style.display = range === 'custom' ? 'flex' : 'none';
    renderReports();
}

// Same convention as applyDateRangeFilter() on the Appointments page:
// appt.date is a plain 'YYYY-MM-DD' string, always parsed as local time
// (…T00:00:00) so this can't drift with the browser's timezone.
function applyRptDateFilter(data) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (rptDateRange === 'today') {
        var todayStr = today.toISOString().split('T')[0];
        return data.filter(function (a) { return a.date === todayStr; });
    }
    if (rptDateRange === 'week') {
        var dow = today.getDay();
        var weekStart = new Date(today); weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
        var weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        return data.filter(function (a) { var d = new Date(a.date + 'T00:00:00'); return d >= weekStart && d <= weekEnd; });
    }
    if (rptDateRange === 'month') {
        var y = today.getFullYear(), m = today.getMonth();
        return data.filter(function (a) { var d = new Date(a.date + 'T00:00:00'); return d.getFullYear() === y && d.getMonth() === m; });
    }
    if (rptDateRange === 'custom') {
        var fromEl = document.getElementById('rptDateFrom'); var toEl = document.getElementById('rptDateTo');
        var from = fromEl && fromEl.value ? new Date(fromEl.value + 'T00:00:00') : null;
        var to = toEl && toEl.value ? new Date(toEl.value + 'T23:59:59') : null;
        return data.filter(function (a) {
            var d = new Date(a.date + 'T00:00:00');
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }
    return data; // 'all'
}

function rptRangeLabel() {
    var now = new Date();
    if (rptDateRange === 'today') return 'Today';
    if (rptDateRange === 'week') return 'This Week';
    if (rptDateRange === 'month') return now.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
    if (rptDateRange === 'custom') {
        var fromEl = document.getElementById('rptDateFrom'); var toEl = document.getElementById('rptDateTo');
        if (fromEl && fromEl.value && toEl && toEl.value) return fromEl.value + ' to ' + toEl.value;
        if (fromEl && fromEl.value) return 'from ' + fromEl.value;
        if (toEl && toEl.value) return 'up to ' + toEl.value;
        return 'Custom Range';
    }
    return 'All Time';
}

function populateRptServiceFilter() {
    var sel = document.getElementById('rptServiceFilter');
    if (!sel) return;
    var current = sel.value;
    var services = getServices().map(function (s) { return s.name; }).sort();
    sel.innerHTML = '<option value="">All Services</option>' + services.map(function (n) {
        return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
    }).join('');
    sel.value = current;
}

function rptSetText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Groups a list of appointments into a real bar-chart time series: by
// individual date when the selected data spans <=31 days (so "Today"/"This
// Week"/short custom ranges are readable), otherwise by month. Returns
// {labels:[], data:[]} straight from the actual records — no fixed Mon–Sun
// buckets that would misrepresent a Month/All-Time/custom range.
function buildRptTimeSeries(list) {
    if (!list.length) return { labels: [], data: [] };
    var dates = list.map(function (a) { return a.date; }).sort();
    var minD = new Date(dates[0] + 'T00:00:00');
    var maxD = new Date(dates[dates.length - 1] + 'T00:00:00');
    var spanDays = Math.round((maxD - minD) / 86400000);
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (spanDays <= 31) {
        var byDate = {};
        list.forEach(function (a) { byDate[a.date] = (byDate[a.date] || 0) + 1; });
        var dKeys = Object.keys(byDate).sort();
        return {
            labels: dKeys.map(function (d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }),
            data: dKeys.map(function (d) { return byDate[d]; })
        };
    }
    var byMonth = {};
    list.forEach(function (a) {
        var d = new Date(a.date + 'T00:00:00');
        var key = d.getFullYear() + '-' + d.getMonth();
        byMonth[key] = (byMonth[key] || 0) + 1;
    });
    var mKeys = Object.keys(byMonth).sort(function (a, b) {
        var pa = a.split('-'), pb = b.split('-');
        return (pa[0] - pb[0]) || (pa[1] - pb[1]);
    });
    return {
        labels: mKeys.map(function (k) { var p = k.split('-'); return monthNames[+p[1]] + ' ' + p[0]; }),
        data: mKeys.map(function (k) { return byMonth[k]; })
    };
}

// ── js/admin/reports/renderReports.js ───────────────────────────
function renderReports() {
    var allAppts = getSharedAppts();
    var svcFilter = (document.getElementById('rptServiceFilter') || {}).value || '';
    var statusFilter = (document.getElementById('rptStatusFilter') || {}).value || '';

    // periodAppts = everything matching the Date Range + Service filter (the
    // scope the appointment-count cards report on, so a user can see what
    // each status filter option would match before picking one).
    var periodAppts = applyRptDateFilter(allAppts);
    if (svcFilter) periodAppts = periodAppts.filter(function (a) { return a.service === svcFilter; });
    // filteredAppts additionally applies the Status filter, for the
    // revenue/session figures which should reflect the exact selection.
    var filteredAppts = statusFilter ? periodAppts.filter(function (a) { return a.status === statusFilter; }) : periodAppts;

    // ── 1) Appointment Report: Total / Pending / Confirmed / Completed / Cancelled ──
    var totalAppts = periodAppts.length;
    var pendingCount = periodAppts.filter(function (a) { return a.status === 'pending' || a.status === 'staff_declined'; }).length;
    var confirmedCount = periodAppts.filter(function (a) { return a.status === 'confirmed'; }).length;
    var completedCount = periodAppts.filter(function (a) { return a.status === 'done'; }).length;
    var cancelledCount = periodAppts.filter(function (a) { return a.status === 'cancelled'; }).length;
    rptSetText('rptTotalAppts', totalAppts);
    rptSetText('rptPendingCount', pendingCount);
    rptSetText('rptConfirmedCount', confirmedCount);
    rptSetText('rptCompletedCount', completedCount);
    rptSetText('rptCancelledCount', cancelledCount);

    // ── 2) Revenue Report ── only 'done' (completed) appointments count as
    // real revenue — cancelled appointments are never included. Uses the
    // exact same price-resolution as getTotalRevenue()/getTodayRevenue() on
    // the Overview dashboard (appt.price if stored, else current catalog
    // price), so Dashboard and Reports revenue always agree for the same data.
    var doneInFilter = filteredAppts.filter(function (a) { return a.status === 'done'; });
    var periodRevenue = doneInFilter.reduce(function (sum, a) { return sum + (a.price || getServicePrice(a.service)); }, 0);
    var sessions = filteredAppts.filter(function (a) { return a.status === 'done' || a.status === 'confirmed'; }).length;
    var allTimeSessions = allAppts.filter(function (a) { return a.status === 'done' || a.status === 'confirmed'; }).length;

    // Return rate is intentionally an all-time metric (a "returning client"
    // isn't meaningful scoped to "Today"), computed from every completed
    // appointment on record.
    var clientVisits = {};
    allAppts.filter(function (a) { return a.status === 'done'; }).forEach(function (a) {
        var key = a.clientEmail || a.clientName || '';
        if (!key) return;
        clientVisits[key] = (clientVisits[key] || 0) + 1;
    });
    var totalClients = Object.keys(clientVisits).length;
    var returningClients = Object.keys(clientVisits).filter(function (k) { return clientVisits[k] >= 2; }).length;
    var returnRate = totalClients > 0 ? Math.round(returningClients / totalClients * 100) : 0;

    // Cancellation rate is scoped to the selected Date Range + Service (not
    // the Status filter, since that would make the ratio meaningless).
    var cancelledForRate = periodAppts.filter(function (a) { return a.status === 'cancelled'; }).length;
    var cancelRate = totalAppts > 0 ? Math.round(cancelledForRate / totalAppts * 100) : 0;

    rptSetText('rptMonthRevenue', '₱' + periodRevenue.toLocaleString());
    rptSetText('rptMonthRevenueLabel', rptRangeLabel() + ' Revenue');
    rptSetText('rptMonthSessions', sessions);
    rptSetText('rptMonthSessionsLabel', 'Sessions — ' + rptRangeLabel());
    rptSetText('rptAllTimeSessions', allTimeSessions + ' all time');
    rptSetText('rptReturnRate', returnRate + '%');
    rptSetText('rptReturnRateSub', returningClients + ' of ' + totalClients + ' clients returned (all time)');
    rptSetText('rptCancelRate', cancelRate + '%');
    rptSetText('rptCancelRateSub', cancelledForRate + ' of ' + totalAppts + ' bookings — ' + rptRangeLabel());

    // ── 8) Empty data state — no fabricated chart/list data for a period
    // with zero matching appointments; the count/₱0 cards above are still
    // shown because they're genuinely-computed zeros, not placeholders. ──
    var emptyEl = document.getElementById('rptEmptyState');
    var row1 = document.getElementById('rptPanelsRow1');
    var row2 = document.getElementById('rptPanelsRow2');
    var hasData = periodAppts.length > 0;
    if (emptyEl) emptyEl.style.display = hasData ? 'none' : 'block';
    if (row1) row1.style.display = hasData ? '' : 'none';
    if (row2) row2.style.display = hasData ? '' : 'none';
    if (!hasData) {
        if (dayBarInst) { dayBarInst.destroy(); dayBarInst = null; }
        if (rptStatusChartInst) { rptStatusChartInst.destroy(); rptStatusChartInst = null; }
        return;
    }

    // ── 3) Revenue by Service — real per-service totals from completed
    // bookings in the selected period, sorted highest-first (top 6 shown). ──
    var revByService = {};
    doneInFilter.forEach(function (a) { revByService[a.service] = (revByService[a.service] || 0) + (a.price || getServicePrice(a.service)); });
    var revSvcNames = Object.keys(revByService).sort(function (a, b) { return revByService[b] - revByService[a]; }).slice(0, 6);
    var revEl = document.getElementById('revByService');
    if (!revSvcNames.length) {
        revEl.innerHTML = '<div class="notif-empty">No completed bookings with revenue for this period.</div>';
    } else {
        var maxR = Math.max.apply(null, revSvcNames.map(function (n) { return revByService[n]; })) || 1;
        revEl.innerHTML = revSvcNames.map(function (n) {
            var pct = Math.round(revByService[n] / maxR * 100);
            return '<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:4px;"><span>' + escHtml(n) + '</span><span style="color:var(--stone)">₱' + revByService[n].toLocaleString() + '</span></div>'
                + '<div style="background:var(--mist);border-radius:100px;height:6px;"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,var(--fern),var(--mint));border-radius:100px;"></div></div></div>';
        }).join('');
    }

    // ── 5) Popular Services — booking counts from completed appointments in
    // the period. Uses the SAME 'done'-only definition as the Overview
    // dashboard's buildTopServicesData(), so Dashboard "Top Services" and
    // Reports "Popular Services" never disagree for the same date range. ──
    var svcCounts = {};
    doneInFilter.forEach(function (a) { if (a.service) svcCounts[a.service] = (svcCounts[a.service] || 0) + 1; });
    var popNames = Object.keys(svcCounts).sort(function (a, b) { return svcCounts[b] - svcCounts[a]; }).slice(0, 6);
    var popEl = document.getElementById('rptPopularServices');
    if (!popNames.length) {
        popEl.innerHTML = '<div class="notif-empty">No completed bookings for this period.</div>';
    } else {
        var maxP = svcCounts[popNames[0]] || 1;
        popEl.innerHTML = popNames.map(function (n) {
            var pct = Math.round(svcCounts[n] / maxP * 100);
            return '<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:4px;"><span>' + escHtml(n) + '</span><span style="color:var(--stone)">' + svcCounts[n] + ' booking' + (svcCounts[n] !== 1 ? 's' : '') + '</span></div>'
                + '<div style="background:var(--mist);border-radius:100px;height:6px;"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#C9952A,#E8C060);border-radius:100px;"></div></div></div>';
        }).join('');
    }

    // ── 9) Charts: Bookings Over Time (confirmed + completed, real dates —
    // grouped by day or month depending on the span, see buildRptTimeSeries)
    var tsSource = periodAppts.filter(function (a) { return a.status === 'done' || a.status === 'confirmed'; });
    var ts = buildRptTimeSeries(tsSource);
    rptSetText('rptBarSub', rptRangeLabel() + ' · confirmed & completed appointments');
    var barCanvas = document.getElementById('dayBarChart');
    if (dayBarInst) { dayBarInst.destroy(); dayBarInst = null; }
    if (ts.labels.length) {
        var barCtx = barCanvas.getContext('2d');
        dayBarInst = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ts.labels,
                datasets: [{
                    label: 'Bookings',
                    data: ts.data,
                    backgroundColor: function (ctx) {
                        var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 160);
                        g.addColorStop(0, 'rgba(201,149,42,0.85)');
                        g.addColorStop(1, 'rgba(139,105,20,0.40)');
                        return g;
                    },
                    borderColor: '#C9952A',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1A1200', titleColor: '#E8C060', bodyColor: '#F5DFA0',
                        borderColor: 'rgba(201,149,42,0.4)', borderWidth: 1, padding: 10,
                        titleFont: { family: "'Playfair Display', serif", size: 13 },
                        bodyFont: { family: "'Jost', sans-serif", size: 12 }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#B0A070', font: { family: "'Jost',sans-serif", size: 11 } } },
                    y: { grid: { color: 'rgba(201,149,42,0.08)' }, ticks: { color: '#B0A070', font: { family: "'Jost',sans-serif", size: 11 }, precision: 0 }, beginAtZero: true }
                }
            }
        });
    }

    // ── 9) Appointment Status Distribution — real counts per status for the
    // selected Date Range + Service (independent of the Status filter, so
    // switching the Status dropdown doesn't collapse the chart to one slice).
    var statusCounts = { pending: 0, confirmed: 0, done: 0, cancelled: 0, staff_declined: 0 };
    periodAppts.forEach(function (a) { if (statusCounts.hasOwnProperty(a.status)) statusCounts[a.status]++; });
    var statusMeta = [
        { key: 'pending', label: 'Pending', color: '#f59e0b' },
        { key: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
        { key: 'done', label: 'Completed', color: '#22c55e' },
        { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        { key: 'staff_declined', label: 'Staff Declined', color: '#a855f7' }
    ].filter(function (s) { return statusCounts[s.key] > 0; });
    var statusCanvas = document.getElementById('rptStatusChart');
    if (rptStatusChartInst) { rptStatusChartInst.destroy(); rptStatusChartInst = null; }
    if (statusMeta.length) {
        var sdCtx = statusCanvas.getContext('2d');
        rptStatusChartInst = new Chart(sdCtx, {
            type: 'doughnut',
            data: {
                labels: statusMeta.map(function (s) { return s.label; }),
                datasets: [{
                    data: statusMeta.map(function (s) { return statusCounts[s.key]; }),
                    backgroundColor: statusMeta.map(function (s) { return s.color; }),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#6b5b3a', font: { family: "'Jost',sans-serif", size: 11 }, padding: 10, boxWidth: 10 } },
                    tooltip: {
                        backgroundColor: '#1A1200', titleColor: '#E8C060', bodyColor: '#F5DFA0',
                        borderColor: 'rgba(201,149,42,0.4)', borderWidth: 1, padding: 10,
                        titleFont: { family: "'Playfair Display', serif", size: 13 },
                        bodyFont: { family: "'Jost', sans-serif", size: 12 }
                    }
                }
            }
        });
    }
}

// --- Navigation ---

// ── js/admin/reports/exportBackup.js ────────────────────────────
// Exports all Firestore collections into a single downloadable Excel (.xlsx)
// backup file — one sheet per collection, with consistent column ordering.
var BACKUP_COLLECTIONS = ['users', 'appointments', 'services', 'feedback', 'messages'];

function exportBackup() {
    var btn = document.getElementById('backupBtn');
    var db = getDb();

    if (!db) {
        alert('Backup failed: not connected to the database.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Backup failed: Excel library did not load. Check your internet connection and try again.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Backing up...';
    }

    var collectionsData = {};
    var pending = BACKUP_COLLECTIONS.length;
    var hadError = false;

    BACKUP_COLLECTIONS.forEach(function (colName) {
        db.collection(colName).get().then(function (snapshot) {
            var docs = [];
            snapshot.forEach(function (doc) {
                docs.push(flattenForExcel(Object.assign({ id: doc.id }, doc.data())));
            });
            collectionsData[colName] = docs;
        }).catch(function (err) {
            hadError = true;
            collectionsData[colName] = [{ error: err.message }];
        }).finally(function () {
            pending--;
            if (pending === 0) {
                finishBackup(collectionsData, btn, hadError);
            }
        });
    });
}

// Excel cells can't hold nested objects/arrays — convert them to readable strings.
function flattenForExcel(obj) {
    var flat = {};
    for (var key in obj) {
        var val = obj[key];
        if (val === null || val === undefined) {
            flat[key] = '';
        } else if (typeof val === 'object') {
            // Firestore Timestamp objects have a toDate() method
            if (typeof val.toDate === 'function') {
                flat[key] = val.toDate().toISOString();
            } else {
                flat[key] = JSON.stringify(val);
            }
        } else {
            flat[key] = val;
        }
    }
    return flat;
}

// Builds one consistent column order for a whole collection: "id" first,
// then every other key seen across all docs, alphabetically. Every doc
// gets every column (blank string if it doesn't have that field), so rows
// line up instead of drifting per-document.
function buildOrderedColumns(docs) {
    var keySet = {};
    docs.forEach(function (doc) {
        for (var k in doc) { keySet[k] = true; }
    });
    var keys = Object.keys(keySet).filter(function (k) { return k !== 'id'; }).sort();
    return ['id'].concat(keys);
}

function normalizeRows(docs, columns) {
    return docs.map(function (doc) {
        var row = {};
        columns.forEach(function (col) { row[col] = (doc[col] !== undefined ? doc[col] : ''); });
        return row;
    });
}

function autoSizeColumns(sheet, columns, rows) {
    sheet['!cols'] = columns.map(function (col) {
        var maxLen = String(col).length;
        rows.forEach(function (row) {
            var len = String(row[col] || '').length;
            if (len > maxLen) maxLen = len;
        });
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });
}

function finishBackup(collectionsData, btn, hadError) {
    var wb = XLSX.utils.book_new();

    BACKUP_COLLECTIONS.forEach(function (colName) {
        var docs = collectionsData[colName] || [];
        var sheet;
        if (docs.length > 0) {
            var columns = buildOrderedColumns(docs);
            var rows = normalizeRows(docs, columns);
            sheet = XLSX.utils.json_to_sheet(rows, { header: columns });
            autoSizeColumns(sheet, columns, rows);
        } else {
            sheet = XLSX.utils.aoa_to_sheet([['(no data)']]);
        }
        // Sheet names max 31 chars, no special chars
        XLSX.utils.book_append_sheet(wb, sheet, colName.slice(0, 31));
    });

    var dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, 'shortcuts-spa-backup-' + dateStr + '.xlsx');

    if (btn) {
        btn.disabled = false;
        btn.textContent = '⬇ Backup Data';
    }

    if (hadError) {
        alert('Backup done, pero may collection(s) na hindi na-fetch nang tama. Check yung Excel file for details.');
    }
}

// ── js/admin/navigation/state.js ────────────────────────────────
var allSec = ['overview', 'appointments', 'services', 'clients', 'staff', 'reports', 'feedback', 'users', 'messages', 'chatbot'];

// ── js/admin/navigation/showSection.js ──────────────────────────
function showSection(name) {
    allSec.forEach(function (s) { document.getElementById('section-' + s).style.display = s === name ? '' : 'none'; });
    if (name === 'feedback') { renderFeedback(); populateFbServiceFilter(); }
    if (name === 'overview') { renderOverview(); setTimeout(renderCalendar, 150); }
    document.querySelectorAll('.nav-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    document.querySelectorAll('.bn-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    var titles = { overview: 'Dashboard', appointments: 'Appointments', services: 'Services & Pricing', clients: 'Clients', staff: 'Staff', reports: 'Reports', users: 'Users', messages: 'Messages & Promos', chatbot: 'Chatbot Management' };
    document.getElementById('pageTitle').textContent = titles[name] || '';
    document.getElementById('pageSubtitle').textContent = name === 'overview' ? (new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' · Full admin access') : '';
    if (name === 'appointments') { renderAllAppts(); populateApptSvc(); populateApptServiceFilter(); }
    if (name === 'services') { renderServicesCards(); populateCatFilter(); }
    if (name === 'clients') renderClients();
    if (name === 'staff') renderStaff();
    if (name === 'reports') { populateRptServiceFilter(); renderReports(); }
    if (name === 'users') renderUsers();
    if (name === 'messages') { renderMessages(); initAdminConvInbox(); }
    if (name === 'chatbot') { renderFaqList(); }
    closeSidebar(); return false;
}

// ── js/admin/navigation/closeModal.js ───────────────────────────
function closeModal(id) { var el = document.getElementById(id); el.classList.remove('open'); el.classList.remove('active'); }

// ── js/admin/navigation/modalOverlayListeners.js ────────────────
document.querySelectorAll('.modal-overlay').forEach(function (el) { el.addEventListener('click', function (e) { if (e.target === el) el.classList.remove('open'); }); });

// ── js/admin/navigation/closeSidebar.js ─────────────────────────
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }

// ── js/admin/bootstrap/sidebarEventListeners.js ─────────────────
document.getElementById('menuToggle').addEventListener('click', function () { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); });
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('logoutBtn').addEventListener('click', function () { spaLogout(); });

// ── js/admin/shared/showToast.js ────────────────────────────────
function showToast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 3000); }

// ── js/admin/bootstrap/windowResizeListener.js ──────────────────
window.addEventListener('resize', function () {
    if (revenueChartInst) revenueChartInst.resize();
    if (donutChartInst) donutChartInst.resize();
    if (dayBarInst) dayBarInst.resize();
    if (rptStatusChartInst) rptStatusChartInst.resize();
});

// --- Client detail view ---

// ── js/admin/clientDetail/viewClient.js ─────────────────────────
function viewClient(email) {
    var reg = getRegisteredUsers();
    var u = null;
    for (var i = 0; i < reg.length; i++) { if (reg[i].email === email) { u = reg[i]; break; } }
    if (!u) { showToast('Client not found.'); return; }
    var appts = getSharedAppts().filter(function (a) { return a.clientEmail === email; });
    var confirmed = appts.filter(function (a) { return a.status === 'confirmed' || a.status === 'done'; });
    var visits = confirmed.length;
    var tier = visits >= 20 ? 'Platinum' : visits >= 10 ? 'Gold' : visits >= 5 ? 'Silver' : 'Bronze';
    var tierColor = { Platinum: '#8B5CF6', Gold: '#C9952A', Silver: '#64748b', Bronze: '#b45309' }[tier];
    var initials = (u.name || 'C').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    document.getElementById('cvModalTitle').textContent = u.name + "'s Profile";
    document.getElementById('cvProfile').innerHTML =
        '<div class="cv-avatar-big">' + initials + '</div>' +
        '<div>' +
        '<div style="font-size:1.05rem;font-weight:700;color:var(--ink);">' + u.name + '</div>' +
        '<div style="font-size:.8rem;color:var(--stone);margin-top:2px;">' + u.email + '</div>' +
        (u.phone ? '<div style="font-size:.78rem;color:var(--stone);margin-top:2px;">' + u.phone + '</div>' : '') +
        '<span style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:100px;font-size:.72rem;font-weight:600;background:' + tierColor + '22;color:' + tierColor + ';">' + tier + '</span>' +
        '</div>';
    var lastAppt = appts.length ? appts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0] : null;
    var pending = appts.filter(function (a) { return a.status === 'pending'; }).length;
    document.getElementById('cvStats').innerHTML =
        '<div class="cv-stat-box"><div class="cv-stat-val">' + visits + '</div><div class="cv-stat-lbl">Total Visits</div></div>' +
        '<div class="cv-stat-box"><div class="cv-stat-val">' + pending + '</div><div class="cv-stat-lbl">Pending</div></div>' +
        '<div class="cv-stat-box"><div class="cv-stat-val">' + (lastAppt ? lastAppt.date.slice(5).replace('-', '/') : '&#8212;') + '</div><div class="cv-stat-lbl">Last Visit</div></div>';
    var sc = { confirmed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444' };
    var emo = function (s) { return (s.indexOf('Facial') > -1) ? '&#127807;' : (s.indexOf('Gluta') > -1) ? '&#128137;' : (s.indexOf('Nail') > -1 || s.indexOf('Manicure') > -1 || s.indexOf('Pedicure') > -1) ? '&#128133;' : (s.indexOf('Wax') > -1) ? '&#129511;' : (s.indexOf('Lash') > -1 || s.indexOf('Brow') > -1) ? '&#128065;' : '&#10024;'; };
    document.getElementById('cvAppts').innerHTML = appts.length
        ? appts.slice(0, 20).map(function (a) {
            return '<div class="cv-appt-row">' +
                '<span style="font-size:1rem;">' + emo(a.service) + '</span>' +
                '<span class="cv-appt-svc">' + a.service + '</span>' +
                '<span class="cv-appt-date">' + a.date + ' &middot; ' + a.time + '</span>' +
                '<span style="font-size:.7rem;font-weight:600;color:' + (sc[a.status] || '#94a3b8') + ';">' + a.status + '</span>' +
                '</div>';
        }).join('')
        : '<div style="text-align:center;color:var(--stone);padding:20px;font-size:.85rem;">No appointments yet.</div>';
    document.getElementById('clientViewModal').classList.add('open');
}

// --- Edit user ---

// ── js/admin/userEdit/openEditUserModal.js ──────────────────────
function openEditUserModal(email) {
    var reg = getRegisteredUsers();
    var u = null;
    for (var i = 0; i < reg.length; i++) { if (reg[i].email === email) { u = reg[i]; break; } }
    if (!u) { showToast('User not found.'); return; }
    document.getElementById('editUserEmail').value = email;
    document.getElementById('editUserName').value = u.name || '';
    document.getElementById('editUserRole').value = u.role || 'client';
    document.getElementById('editUserPassword').value = '';
    document.getElementById('editUserModal').classList.add('open');
}

// ── js/admin/userEdit/saveEditUser.js ───────────────────────────
function saveEditUser() {
    var email = document.getElementById('editUserEmail').value;
    var name = document.getElementById('editUserName').value.trim();
    var role = document.getElementById('editUserRole').value;
    var pass = document.getElementById('editUserPassword').value;
    if (!name) { showToast('Please enter a name.'); return; }
    if (pass && pass.length > 0 && pass.length < 6) { showToast('Password must be at least 6 characters.'); return; }
    var updates = { name: name, role: role };
    if (pass && pass.length >= 6) updates.password = pass;
    if (typeof updateRegisteredUser === 'function') { updateRegisteredUser(email, updates); }
    else {
        var reg = getRegisteredUsers();
        reg.forEach(function (u) { if (u.email === email) { for (var k in updates) u[k] = updates[k]; } });
        localStorage.setItem('spa_registered_users', JSON.stringify(reg));
    }
    renderUsers(); renderClients(); renderStaff();
    closeModal('editUserModal');
    showToast('User updated!');
}

// --- Revenue chart dropdown ---

// ── js/admin/revenueChart/state.js ──────────────────────────────
var currentChartRange = 'weekly';

// ── js/admin/revenueChart/getRevenueData.js ─────────────────────
function getRevenueData() {
    return { weekly: buildWeeklyRevenue(), monthly: buildMonthlyRevenue() };
}

// ── js/admin/revenueChart/toggleRevenueDropdown.js ──────────────
function toggleRevenueDropdown(e) {
    e.stopPropagation();
    var dd = document.getElementById('revenueDropdown');
    var rect = document.getElementById('revMenuBtn').getBoundingClientRect();
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = (rect.right - 175) + 'px';
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

// ── js/admin/revenueChart/outsideClickListener.js ───────────────
document.addEventListener('click', function () { var dd = document.getElementById('revenueDropdown'); if (dd) dd.style.display = 'none'; });

// ── js/admin/revenueChart/setChartRange.js ──────────────────────
function setChartRange(range) {
    currentChartRange = range;
    document.getElementById('revenueDropdown').style.display = 'none';
    var d = getRevenueData()[range];
    var sub = document.querySelector('.panel-sub');
    if (sub) sub.textContent = range === 'weekly' ? 'Weekly revenue performance' : 'Monthly revenue performance';
    if (!revenueChartInst) return;
    revenueChartInst.data.labels = d.labels;
    revenueChartInst.data.datasets[0].data = d.data;
    revenueChartInst.update();
    showToast('Showing ' + range + ' revenue.');
}

// ── js/admin/revenueChart/exportRevenueCSV.js ───────────────────
function exportRevenueCSV() {
    document.getElementById('revenueDropdown').style.display = 'none';
    var d = getRevenueData()[currentChartRange];
    var rows = [['Period', 'Revenue (PHP)']].concat(d.labels.map(function (l, i) { return [l, d.data[i]]; }));
    var csv = rows.map(function (r) { return r.join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.download = 'revenue-' + currentChartRange + '.csv';
    a.href = url; a.click();
    URL.revokeObjectURL(url);
    showToast('Revenue exported as CSV!');
}

// --- Messages / Promos ---

// ── js/admin/messages/state.js ──────────────────────────────────
var MSG_TYPE_META = {
    promo: { label: '🎉 Promo', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
    announcement: { label: '📢 Announcement', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    personal: { label: '💌 Personal', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' }
};

// ── EmailJS helper ────────────────────────────────────────────────────────────

// ── js/admin/messages/isEmailJsReady.js ─────────────────────────
function isEmailJsReady() {
    return typeof emailjs !== 'undefined'
        && typeof EMAILJS_PUBLIC_KEY !== 'undefined'
        && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY'
        && typeof EMAILJS_SERVICE_ID !== 'undefined'
        && EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID'
        && typeof EMAILJS_TEMPLATE_ID !== 'undefined'
        && EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID';
}

// ── js/admin/messages/sendEmailViaEmailJS.js ────────────────────
function sendEmailViaEmailJS(toEmail, toName, subject, body, onDone) {
    if (!isEmailJsReady()) {
        console.warn('[Spa] EmailJS not configured — skipping email to ' + toEmail);
        if (onDone) onDone(false, 'EmailJS not configured');
        return;
    }
    var senderName = (user && user.name) ? user.name : "Shortcut's Skin Care Spa";
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: toEmail,
        to_name: toName || toEmail,
        from_name: senderName,
        reply_to: (user && user.email) ? user.email : '',
        subject: subject,
        message: body
    }).then(function () {
        console.log('[Spa] Email sent to ' + toEmail);
        if (onDone) onDone(true);
    }, function (err) {
        console.warn('[Spa] EmailJS error for ' + toEmail + ':', err);
        if (onDone) onDone(false, err);
    });
}

// ── js/admin/messages/sendBulkEmails.js ─────────────────────────
function sendBulkEmails(recipients, subject, body, onAllDone) {
    if (!recipients || recipients.length === 0) { if (onAllDone) onAllDone(0, 0); return; }
    var sent = 0, failed = 0, done = 0;
    recipients.forEach(function (r) {
        sendEmailViaEmailJS(r.email, r.name, subject, body, function (ok) {
            if (ok) sent++; else failed++;
            done++;
            if (done === recipients.length && onAllDone) onAllDone(sent, failed);
        });
    });
}

// ── Semaphore SMS helper ──────────────────────────────────────────────────────
// Set your Semaphore API key here (get it from semaphore.co)

// ── js/admin/messages/semaphoreState.js ─────────────────────────
var SEMAPHORE_API_KEY = 'YOUR_SEMAPHORE_API_KEY';
var SEMAPHORE_SENDER = "ShortcutSpa"; // Max 11 chars, alphanumeric, no spaces

// ── js/admin/messages/isSemaphoreReady.js ───────────────────────
function isSemaphoreReady() {
    return typeof SEMAPHORE_API_KEY !== 'undefined'
        && SEMAPHORE_API_KEY !== 'YOUR_SEMAPHORE_API_KEY'
        && SEMAPHORE_API_KEY.length > 0;
}

// ── js/admin/messages/updateSemaphoreBadge.js ───────────────────
function updateSemaphoreBadge() {
    var badge = document.getElementById('semaphoreStatusBadge');
    if (!badge) return;
    if (isSemaphoreReady()) {
        badge.textContent = '✓ Ready';
        badge.style.cssText = 'margin-left:auto;font-size:.7rem;padding:2px 8px;border-radius:100px;font-weight:600;background:#f0fdf4;color:#16a34a;border:1px solid #86efac;';
    } else {
        badge.textContent = 'Not configured';
        badge.style.cssText = 'margin-left:auto;font-size:.7rem;padding:2px 8px;border-radius:100px;font-weight:600;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;';
    }
}

// ── js/admin/messages/sendSmsViaSemaphore.js ────────────────────
function sendSmsViaSemaphore(toNumber, message, onDone) {
    if (!isSemaphoreReady()) {
        console.warn('[Spa] Semaphore not configured — skipping SMS to ' + toNumber);
        if (onDone) onDone(false, 'Semaphore not configured');
        return;
    }
    // Normalize PH number: 09xxxxxxxxx → +639xxxxxxxxx
    var normalized = toNumber.replace(/\D/g, '');
    if (normalized.startsWith('0')) normalized = '63' + normalized.slice(1);
    if (!normalized.startsWith('63')) normalized = '63' + normalized;

    var params = new URLSearchParams();
    params.append('apikey', SEMAPHORE_API_KEY);
    params.append('number', normalized);
    params.append('message', message);
    params.append('sendername', SEMAPHORE_SENDER);

    fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && (Array.isArray(data) ? data[0].status !== 'failed' : data.status !== 'failed')) {
                console.log('[Spa] SMS sent to ' + normalized);
                if (onDone) onDone(true);
            } else {
                console.warn('[Spa] Semaphore error for ' + normalized + ':', data);
                if (onDone) onDone(false, data);
            }
        })
        .catch(function (err) {
            console.warn('[Spa] Semaphore fetch error:', err);
            if (onDone) onDone(false, err);
        });
}

// ── js/admin/messages/sendBulkSms.js ────────────────────────────
function sendBulkSms(recipients, message, onAllDone) {
    // recipients = [{name, phone}]
    var valid = recipients.filter(function (r) { return r.phone && /^(09|\+639|639)\d{9}$/.test(r.phone.replace(/\s/g, '')); });
    if (valid.length === 0) { if (onAllDone) onAllDone(0, 0, recipients.length); return; }
    var sent = 0, failed = 0, done = 0;
    valid.forEach(function (r) {
        sendSmsViaSemaphore(r.phone, message, function (ok) {
            if (ok) sent++; else failed++;
            done++;
            if (done === valid.length && onAllDone) onAllDone(sent, failed, recipients.length - valid.length);
        });
    });
}

// ── Render sent messages ──────────────────────────────────────────────────────

// ── js/admin/messages/clientChatInbox.js ────────────────────────
// The admin-side inbox for the two-way client<->spa chat (separate from
// the one-way broadcast "Messages & Promos" composer below). See
// shared-data.js for the conversations/{clientUid} data layer and
// firestore.rules for how per-conversation access is enforced.
var _convListUnsub = null;
var _convThreadUnsub = null;
var _convActiveUid = null;
var _convCache = [];

function initAdminConvInbox() {
    if (_convListUnsub) return; // already listening
    _convListUnsub = listenToAllConversations(function (list) {
        _convCache = list;
        renderConvList(list);
        // Keep an open thread's messages/read-state in sync if the list refreshes
        if (_convActiveUid) {
            var stillThere = list.some(function (c) { return c._id === _convActiveUid; });
            if (stillThere) highlightActiveConvItem();
        }
    });
}

function stopAdminConvInbox() {
    if (_convListUnsub) { _convListUnsub(); _convListUnsub = null; }
    if (_convThreadUnsub) { _convThreadUnsub(); _convThreadUnsub = null; }
    _convActiveUid = null;
}
window.addEventListener('beforeunload', stopAdminConvInbox);

function renderConvList(list) {
    var el = document.getElementById('convList');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="notif-empty">No client conversations yet.</div>'; return; }
    el.innerHTML = list.map(function (c) {
        var unread = !!c.unreadByAdmin;
        var preview = c.lastMessage ? escHtml(c.lastMessage) : 'No messages yet';
        return '<div class="admin-chat-item' + (c._id === _convActiveUid ? ' active' : '') + '" id="convitem-' + c._id + '" onclick="openAdminConversation(\'' + c._id + '\')">'
            + '<div class="admin-chat-item-name"><span>' + escHtml(c.clientName || c.clientEmail || 'Client') + '</span>'
            + (unread ? '<span class="admin-chat-unread-dot"></span>' : '') + '</div>'
            + '<div class="admin-chat-item-preview">' + preview + '</div></div>';
    }).join('');
}

function highlightActiveConvItem() {
    document.querySelectorAll('.admin-chat-item').forEach(function (el) { el.classList.remove('active'); });
    var el = document.getElementById('convitem-' + _convActiveUid);
    if (el) el.classList.remove('admin-chat-unread-dot'); // no-op guard
    if (el) el.classList.add('active');
}

function openAdminConversation(uid) {
    if (_convActiveUid === uid) return;
    _convActiveUid = uid;
    highlightActiveConvItem();

    var conv = _convCache.find(function (c) { return c._id === uid; }) || {};
    document.getElementById('convThreadHeader').textContent = conv.clientName || conv.clientEmail || 'Client';
    document.getElementById('convInputRow').style.display = 'flex';
    document.getElementById('convThread').innerHTML = '<div class="notif-empty">Loading messages...</div>';

    if (_convThreadUnsub) { _convThreadUnsub(); _convThreadUnsub = null; }
    _convThreadUnsub = listenToConversation(uid, function (msgs) {
        renderConvThread(msgs);
        markConversationMessagesRead(uid, 'admin');
        markConversationRead(uid, 'admin');
    });
}

function renderConvThread(msgs) {
    var el = document.getElementById('convThread');
    if (!el) return;
    if (!msgs.length) {
        el.innerHTML = '<div style="margin:auto;text-align:center;color:var(--stone);font-size:.85rem;">No messages in this conversation yet.</div>';
        return;
    }
    el.innerHTML = msgs.map(function (m) {
        var mine = m.senderRole === 'admin' || m.senderRole === 'staff';
        var time = (m.sentAt && typeof m.sentAt.toDate === 'function')
            ? m.sentAt.toDate().toLocaleString('en-PH', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
            : 'Sending…';
        return '<div style="align-self:' + (mine ? 'flex-end' : 'flex-start') + ';max-width:78%;">'
            + '<div style="background:' + (mine ? 'var(--fern)' : '#fff') + ';color:' + (mine ? '#fff' : 'var(--ink)')
            + ';border:1px solid ' + (mine ? 'var(--fern)' : 'var(--border)') + ';border-radius:14px;'
            + (mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;')
            + 'padding:9px 13px;font-size:.85rem;line-height:1.45;white-space:pre-wrap;word-break:break-word;">'
            + escHtml(m.text) + '</div>'
            + '<div style="font-size:.68rem;color:var(--stone);margin-top:3px;text-align:' + (mine ? 'right' : 'left') + ';">' + time + '</div></div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function onConvInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); }
}

function sendAdminReply() {
    var input = document.getElementById('convInput');
    var btn = document.getElementById('convSendBtn');
    if (!input || !_convActiveUid) return;
    var text = input.value;
    if (!text.trim()) return;

    var me = null;
    try { me = JSON.parse(localStorage.getItem('spa_user')); } catch (e) { }
    var role = (me && me.role === 'staff') ? 'staff' : 'admin';

    btn.disabled = true;
    sendChatMessage(_convActiveUid, role, me ? me.name : 'Spa Team', me ? me.email : '', text, function (ok, err) {
        btn.disabled = false;
        if (ok) { input.value = ''; }
        else { showToast(err || 'Message failed to send. Please try again.'); }
    });
}

// ── js/admin/messages/renderMessages.js ─────────────────────────
function renderMessages() {
    var msgs = getMessages().filter(function (m) { return !m.deletedByAdmin; });
    var container = document.getElementById('msgSentList');
    if (!container) return;

    if (msgs.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--stone);"><div style="font-size:2.5rem;margin-bottom:12px;">✉</div><p style="font-weight:500;">No messages sent yet</p><p style="font-size:.82rem;margin-top:4px;">Compose a promo or announcement to get started.</p></div>';
        return;
    }

    container.innerHTML = msgs.map(function (m) {
        var meta = MSG_TYPE_META[m.type] || MSG_TYPE_META.announcement;
        var audience = m.audience || 'clients';
        var audienceColor = audience.indexOf('staff') !== -1 ? '#0ea5e9' : 'var(--fern)';
        var audienceBg = audience.indexOf('staff') !== -1 ? '#f0f9ff' : '#e8f5ee';

        var recipientLabel;
        if (m.recipients === 'all_clients') {
            recipientLabel = '<span style="font-size:.75rem;background:#e8f5ee;color:var(--fern);padding:2px 10px;border-radius:100px;font-weight:500;">All Clients</span>';
        } else if (m.recipients === 'all_staff') {
            recipientLabel = '<span style="font-size:.75rem;background:#f0f9ff;color:#0ea5e9;padding:2px 10px;border-radius:100px;font-weight:500;">All Staff</span>';
        } else if (Array.isArray(m.recipients)) {
            recipientLabel = '<span style="font-size:.75rem;background:' + audienceBg + ';color:' + audienceColor + ';padding:2px 10px;border-radius:100px;font-weight:500;">' + m.recipients.length + ' ' + audience + '</span>';
        } else {
            recipientLabel = '<span style="font-size:.75rem;background:#e8f5ee;color:var(--fern);padding:2px 10px;border-radius:100px;font-weight:500;">All Clients</span>';
        }

        var emailBadge = m.emailSent
            ? '<span style="font-size:.7rem;background:#f0fdf4;color:#16a34a;border:1px solid #86efac;padding:2px 8px;border-radius:100px;">📧 Email sent</span>'
            : '';

        var sentDate = m.sentAt ? new Date(m.sentAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

        return '<div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:12px;border-left:4px solid ' + meta.color + ';">'
            + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">'
            + '<span style="font-size:.72rem;font-weight:600;background:' + meta.bg + ';color:' + meta.color + ';border:1px solid ' + meta.border + ';padding:2px 10px;border-radius:100px;">' + meta.label + '</span>'
            + recipientLabel
            + emailBadge
            + '<span style="font-size:.7rem;color:var(--stone);">' + sentDate + '</span>'
            + '</div>'
            + '<div style="font-weight:600;font-size:.95rem;color:var(--ink);margin-bottom:4px;">' + escHtml(m.subject) + '</div>'
            + '<div style="font-size:.83rem;color:var(--stone);line-height:1.6;white-space:pre-wrap;">' + escHtml(m.body) + '</div>'
            + '</div>'
            + '<button onclick="deleteMessage(\'' + m.id + '\');renderMessages();" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--stone);padding:4px;opacity:.6;" title="Delete">'
            + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>'
            + '</button>'
            + '</div></div>';
    }).join('');
}

// ── js/admin/shared/escHtml.js ──────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Compose modal helpers ─────────────────────────────────────────────────────

// ── js/admin/messages/openComposeModal.js ───────────────────────
function openComposeModal() {
    var clients = getClientList();
    var staff = getStaffList();

    // Populate client checkboxes
    var clientBox = document.getElementById('clientCheckboxList');
    if (clientBox) {
        clientBox.innerHTML = clients.length === 0
            ? '<p style="font-size:.8rem;color:var(--stone);padding:8px 4px;">No registered clients yet.</p>'
            : clients.map(function (c) {
                var initial = (c.name || '?').charAt(0).toUpperCase();
                return '<label class="recipient-row">'
                    + '<input type="checkbox" value="' + escHtml(c.email) + '" data-name="' + escHtml(c.name) + '" style="accent-color:var(--fern);" />'
                    + '<div class="recipient-avatar" style="background:linear-gradient(135deg,var(--fern),var(--sage));">' + escHtml(initial) + '</div>'
                    + '<div class="recipient-info"><div class="recipient-name">' + escHtml(c.name) + '</div>'
                    + '<div class="recipient-email">' + escHtml(c.email) + '</div></div>'
                    + '</label>';
            }).join('');
    }

    // Populate staff checkboxes
    var staffBox = document.getElementById('staffCheckboxList');
    if (staffBox) {
        staffBox.innerHTML = staff.length === 0
            ? '<p style="font-size:.8rem;color:var(--stone);padding:8px 4px;">No staff members found.</p>'
            : staff.map(function (s) {
                var initial = (s.name || '?').charAt(0).toUpperCase();
                return '<label class="recipient-row">'
                    + '<input type="checkbox" value="' + escHtml(s.email) + '" data-name="' + escHtml(s.name) + '" style="accent-color:#0ea5e9;" />'
                    + '<div class="recipient-avatar" style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);">' + escHtml(initial) + '</div>'
                    + '<div class="recipient-info"><div class="recipient-name">' + escHtml(s.name) + '</div>'
                    + '<div class="recipient-email">' + escHtml(s.email) + '</div></div>'
                    + '</label>';
            }).join('');
    }

    // Reset fields
    document.getElementById('msgType').value = 'promo';
    document.getElementById('msgAudienceType').value = 'all_clients';
    document.getElementById('msgSubject').value = '';
    var cs = document.getElementById('composeClientSearch'); if (cs) cs.value = '';
    var ss = document.getElementById('staffSearch'); if (ss) ss.value = '';
    document.getElementById('msgBody').value = '';
    var tog = document.getElementById('sendEmailToggle');
    if (tog) tog.checked = false;
    var togSms = document.getElementById('sendSmsToggle');
    if (togSms) togSms.checked = false;

    // Show EmailJS status badge
    var badge = document.getElementById('emailjsStatusBadge');
    if (badge) {
        if (isEmailJsReady()) {
            badge.textContent = '✓ Ready';
            badge.style.cssText = 'margin-left:auto;font-size:.7rem;padding:2px 8px;border-radius:100px;font-weight:600;background:#f0fdf4;color:#16a34a;border:1px solid #86efac;';
        } else {
            badge.textContent = 'Not configured';
            badge.style.cssText = 'margin-left:auto;font-size:.7rem;padding:2px 8px;border-radius:100px;font-weight:600;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;';
        }
    }

    // Show Semaphore SMS status badge
    updateSemaphoreBadge();

    toggleRecipientPicker();
    document.getElementById('composeModal').classList.add('open');
}

// ── js/admin/messages/toggleRecipientPicker.js ──────────────────
function toggleRecipientPicker() {
    var val = document.getElementById('msgAudienceType').value;
    document.getElementById('specificRecipientWrap').style.display = (val === 'specific_clients') ? 'block' : 'none';
    document.getElementById('specificStaffWrap').style.display = (val === 'specific_staff') ? 'block' : 'none';
}

// ── Send message ──────────────────────────────────────────────────────────────

// ── js/admin/messages/sendPromoMessage.js ───────────────────────
function sendPromoMessage() {
    var type = document.getElementById('msgType').value;
    var audienceVal = document.getElementById('msgAudienceType').value;
    var subject = document.getElementById('msgSubject').value.trim();
    var body = document.getElementById('msgBody').value.trim();
    var wantEmail = document.getElementById('sendEmailToggle') && document.getElementById('sendEmailToggle').checked;
    var wantSms = document.getElementById('sendSmsToggle') && document.getElementById('sendSmsToggle').checked;

    if (!subject) { showToast('Please enter a subject.'); return; }
    if (!body) { showToast('Please write a message.'); return; }

    // Resolve recipients list and label
    var recipients;   // stored value
    var audience;     // 'clients' | 'staff'
    var emailTargets; // [{email, name}] for EmailJS
    var smsTargets;   // [{name, phone}] for Semaphore

    if (audienceVal === 'all_clients') {
        recipients = 'all_clients';
        audience = 'clients';
        emailTargets = getClientList().map(function (c) { return { email: c.email, name: c.name }; });
        smsTargets = getClientList().filter(function (c) { return c.phone; }).map(function (c) { return { name: c.name, phone: c.phone }; });
    } else if (audienceVal === 'all_staff') {
        recipients = 'all_staff';
        audience = 'staff';
        emailTargets = getStaffList().map(function (s) { return { email: s.email, name: s.name }; });
        smsTargets = getStaffList().filter(function (s) { return s.phone; }).map(function (s) { return { name: s.name, phone: s.phone }; });
    } else if (audienceVal === 'specific_clients') {
        var checked = document.querySelectorAll('#clientCheckboxList input[type=checkbox]:checked');
        if (checked.length === 0) { showToast('Please select at least one client.'); return; }
        recipients = Array.from(checked).map(function (cb) { return cb.value; });
        audience = 'clients';
        emailTargets = Array.from(checked).map(function (cb) { return { email: cb.value, name: cb.dataset.name || cb.value }; });
        // For specific clients, look up phone from the registered list
        var allClients = getClientList();
        smsTargets = Array.from(checked).map(function (cb) {
            var found = allClients.find(function (c) { return c.email === cb.value; });
            return found && found.phone ? { name: found.name, phone: found.phone } : null;
        }).filter(Boolean);
    } else { // specific_staff
        var checkedS = document.querySelectorAll('#staffCheckboxList input[type=checkbox]:checked');
        if (checkedS.length === 0) { showToast('Please select at least one staff member.'); return; }
        recipients = Array.from(checkedS).map(function (cb) { return cb.value; });
        audience = 'staff';
        emailTargets = Array.from(checkedS).map(function (cb) { return { email: cb.value, name: cb.dataset.name || cb.value }; });
        var allStaff = getStaffList();
        smsTargets = Array.from(checkedS).map(function (cb) {
            var found = allStaff.find(function (s) { return s.email === cb.value; });
            return found && found.phone ? { name: found.name, phone: found.phone } : null;
        }).filter(Boolean);
    }

    var msg = {
        id: Date.now(),
        type: type,
        subject: subject,
        body: body,
        recipients: recipients,
        audience: audience,
        sentAt: new Date().toISOString(),
        sentBy: user ? user.email : 'admin',
        emailSent: false
    };

    // Disable button while sending
    var btn = document.getElementById('sendMsgBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    function finalize(emailSent, smsSent) {
        msg.emailSent = !!emailSent;
        msg.smsSent = !!smsSent;
        sendMessage(msg);
        renderMessages();
        closeModal('composeModal');
        if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }

        var recipientText = (recipients === 'all_clients') ? 'all clients'
            : (recipients === 'all_staff') ? 'all staff'
                : recipients.length + ' ' + audience;
        var emailNote = wantEmail && isEmailJsReady() ? ' + email 📧' : '';
        var smsNote = wantSms && isSemaphoreReady() ? ' + SMS 📱' : '';
        showToast('Message sent to ' + recipientText + emailNote + smsNote + ' ✉');
    }

    var emailDone = false, smsDone = false;
    var emailResult = false, smsResult = false;

    function checkBothDone() {
        if (emailDone && smsDone) finalize(emailResult, smsResult);
    }

    if (wantEmail && isEmailJsReady() && emailTargets.length > 0) {
        sendBulkEmails(emailTargets, subject, body, function (sent, failed) {
            if (failed > 0) showToast('⚠ ' + failed + ' email(s) failed. Check console.');
            emailResult = sent > 0;
            emailDone = true;
            checkBothDone();
        });
    } else {
        if (wantEmail && !isEmailJsReady()) showToast('⚠ EmailJS not configured — message saved but no email sent.');
        emailDone = true;
        checkBothDone();
    }

    if (wantSms && isSemaphoreReady() && smsTargets.length > 0) {
        var smsBody = subject + ': ' + body + '\n— Shortcut\'s Skin Care Spa';
        sendBulkSms(smsTargets, smsBody, function (sent, failed, noPhone) {
            if (failed > 0) showToast('⚠ ' + failed + ' SMS(es) failed. Check console.');
            if (noPhone > 0) showToast('ℹ ' + noPhone + ' recipient(s) have no phone number on file.');
            smsResult = sent > 0;
            smsDone = true;
            checkBothDone();
        });
    } else {
        if (wantSms && !isSemaphoreReady()) showToast('⚠ Semaphore not configured — no SMS sent.');
        if (wantSms && isSemaphoreReady() && smsTargets.length === 0) showToast('ℹ No recipients have a phone number on file.');
        smsDone = true;
        checkBothDone();
    }
}

// Render charts immediately, then refresh once Firestore data arrives

// ── js/admin/bootstrap/initOverview.js ──────────────────────────
if (typeof initConnectionIndicator === 'function') initConnectionIndicator();
setTimeout(function () { renderOverview(); }, 100);

// Sync services from Firestore first, then sync everything else

// ── js/admin/bootstrap/initServicesSync.js ──────────────────────
if (typeof syncServicesFromFirestore === 'function') {
    syncServicesFromFirestore(function () {
        renderServicesCards();
        populateCatFilter();
        // Live listener — auto-update services table when another device changes the catalog
        if (typeof listenToServices === 'function') {
            listenToServices(function () { renderServicesCards(); populateCatFilter(); });
        }
    });
}

// ── js/admin/bootstrap/initMainSync.js ──────────────────────────
syncUsersFromFirestore(function () {
    syncApptsFromFirestore(function () {
        syncMessagesFromFirestore(function () {
            renderOverview();
            listenToUsers(function () { renderClients(); renderStaff(); renderUsers(); });
            listenToAppts(function () { renderRecentAppts(); renderAllAppts(); updatePendingBadge(); });
            listenToMessages(function () { renderMessages(); });
        });
    });
});

// ── js/admin/navigation/setBnActive.js ──────────────────────────
function setBnActive(el) {
    document.querySelectorAll('.bn-item').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
}
// ══════════════════════════════════════════════════════════
//  FEEDBACK MODULE
// ══════════════════════════════════════════════════════════

// ── js/admin/feedback/getFeedbackData.js ────────────────────────
function getFeedbackData() {
    if (typeof getFeedback === 'function') return getFeedback();
    try { return JSON.parse(localStorage.getItem('spa_feedback') || '[]'); } catch (e) { return []; }
}

// ── js/admin/feedback/renderFeedback.js ─────────────────────────
function renderFeedback() {
    var all = getFeedbackData();
    var filterSvc = (document.getElementById('fbFilterService') || {}).value || '';
    var filterRating = (document.getElementById('fbFilterRating') || {}).value || '';

    // Update stats
    var total = all.length;
    var avgRating = total ? (all.reduce(function (s, f) { return s + (f.rating || 0); }, 0) / total).toFixed(1) : '—';
    var excellent = all.filter(function (f) { return f.rating === 5; }).length;
    var now = new Date();
    var thisMonth = all.filter(function (f) {
        var d = new Date(f.submittedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Top service by average rating
    var svcMap = {};
    all.forEach(function (f) {
        if (!f.serviceName) return;
        if (!svcMap[f.serviceName]) svcMap[f.serviceName] = { total: 0, count: 0 };
        svcMap[f.serviceName].total += f.rating || 0;
        svcMap[f.serviceName].count++;
    });
    var topSvc = '—';
    var topAvg = 0;
    Object.keys(svcMap).forEach(function (name) {
        var avg = svcMap[name].total / svcMap[name].count;
        if (avg > topAvg) { topAvg = avg; topSvc = name.split(' ').slice(0, 2).join(' '); }
    });

    var avgEl = document.getElementById('fbAvgRating');
    if (avgEl) avgEl.textContent = avgRating !== '—' ? avgRating + ' ★' : '—';
    var totEl = document.getElementById('fbTotalCount');
    if (totEl) totEl.textContent = total + ' review' + (total !== 1 ? 's' : '');
    var excEl = document.getElementById('fbExcellentCount');
    if (excEl) excEl.textContent = excellent;
    var monEl = document.getElementById('fbThisMonth');
    if (monEl) monEl.textContent = thisMonth;
    var monLbl = document.getElementById('fbMonthLabel');
    if (monLbl) monLbl.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    var topEl = document.getElementById('fbTopService');
    if (topEl) topEl.textContent = topSvc;

    // Filter
    var filtered = all.filter(function (f) {
        if (filterSvc && f.serviceName !== filterSvc) return false;
        if (filterRating && String(f.rating) !== filterRating) return false;
        return true;
    });

    var countEl = document.getElementById('fbFilterCount');
    if (countEl) countEl.textContent = 'Showing ' + filtered.length + ' of ' + total;

    var tbody = document.getElementById('feedbackTable');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--stone);">No feedback yet. Share the QR codes with your clients! 🌿</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(function (f) {
        var stars = '⭐'.repeat(f.rating || 0);
        var date = f.submittedAt ? new Date(f.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        var name = f.name || 'Anonymous';
        var email = f.email ? '<div style="font-size:.74rem;color:var(--stone);">' + f.email + '</div>' : '';
        var comment = f.comment ? ('<span style="color:var(--ink);">' + escHtml(f.comment) + '</span>') : '<span style="color:var(--silver);font-style:italic;">No comment</span>';
        var ratingColor = f.rating >= 4 ? '#16a34a' : f.rating === 3 ? '#d97706' : '#dc2626';
        return '<tr>' +
            '<td><div style="font-weight:500;">' + escHtml(name) + '</div>' + email + '</td>' +
            '<td>' + escHtml(f.serviceName || '—') + '</td>' +
            '<td><span style="font-size:1rem;color:' + ratingColor + ';font-weight:600;">' + stars + '</span></td>' +
            '<td style="max-width:220px;font-size:.82rem;line-height:1.5;">' + comment + '</td>' +
            '<td style="font-size:.8rem;white-space:nowrap;">' + date + '</td>' +
            '<td><button onclick="deleteFeedbackEntry(' + f.id + ')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:.8rem;padding:4px 8px;border-radius:6px;transition:background .15s;" onmouseover="this.style.background=\'var(--red-lt)\'" onmouseout="this.style.background=\'none\'">Delete</button></td>' +
            '</tr>';
    }).join('');
}

// ── js/admin/feedback/populateFbServiceFilter.js ────────────────
function populateFbServiceFilter() {
    var sel = document.getElementById('fbFilterService');
    if (!sel) return;
    var current = sel.value;
    // Collect unique service names from feedback
    var all = getFeedbackData();
    var names = [];
    all.forEach(function (f) { if (f.serviceName && names.indexOf(f.serviceName) === -1) names.push(f.serviceName); });
    sel.innerHTML = '<option value="">All Services</option>';
    names.forEach(function (n) {
        var opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        if (n === current) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ── js/admin/feedback/deleteFeedbackEntry.js ────────────────────
function deleteFeedbackEntry(id) {
    if (!confirm('Delete this feedback entry?')) return;
    if (typeof deleteFeedback === 'function') {
        deleteFeedback(id);
    } else {
        try {
            var list = JSON.parse(localStorage.getItem('spa_feedback') || '[]').filter(function (f) { return String(f.id) !== String(id); });
            localStorage.setItem('spa_feedback', JSON.stringify(list));
        } catch (e) { }
    }
    renderFeedback();
    showToast('Feedback deleted.');
}

// ── js/admin/feedback/openQrModal.js ────────────────────────────
function openQrModal() {
    try {
        var modal = document.getElementById('qrModal');
        if (!modal) { alert('QR Modal not found. Please refresh.'); return; }
        var list = document.getElementById('qrServiceList');
        if (!list) { alert('qrServiceList not found.'); return; }

        // Single QR pointing to the public reviews page
        var reviewsUrl = window.location.href.replace(/dashboard-admin\.html.*$/, 'reviews.html');
        var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(reviewsUrl);

        list.innerHTML =
            '<div style="text-align:center;padding:10px 0 6px;">'
            + '<img src="' + qrUrl + '" width="200" height="200" style="border-radius:12px;border:1.5px solid var(--border);" />'
            + '<div style="margin-top:14px;font-size:.72rem;color:var(--stone);word-break:break-all;">' + reviewsUrl + '</div>'
            + '<div style="display:flex;gap:10px;justify-content:center;margin-top:14px;">'
            + '<button onclick="copyFbLink(\'' + reviewsUrl.replace(/'/g, "%27") + '\')" style="font-size:.82rem;padding:8px 18px;border-radius:10px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;color:var(--ink);font-family:inherit;">📋 Copy Link</button>'
            + '<a href="' + reviewsUrl + '" target="_blank" style="font-size:.82rem;padding:8px 18px;border-radius:10px;border:1.5px solid var(--fern);background:var(--white);color:var(--fern);font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">🔗 Open</a>'
            + '</div>'
            + '<p style="font-size:.75rem;color:var(--stone);margin-top:16px;line-height:1.6;">Print this QR and place it at the counter.<br/>Clients scan to see all reviews — no login needed.</p>'
            + '</div>';

        modal.classList.add('open');
    } catch (err) {
        console.error('openQrModal error:', err);
        alert('Error: ' + err.message);
    }
}

// ── js/admin/feedback/copyFbLink.js ─────────────────────────────
function copyFbLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { showToast('Link copied! 📋'); })
            .catch(function () { fallbackCopy(url); });
    } else { fallbackCopy(url); }
}

// ── js/admin/feedback/fallbackCopy.js ───────────────────────────
function fallbackCopy(url) {
    var ta = document.createElement('textarea');
    ta.value = url; ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Link copied! 📋'); }
    catch (e) { showToast('Copy manually: ' + url); }
    document.body.removeChild(ta);
}

// Sync feedback from Firestore on load

// ── js/admin/bootstrap/initFeedbackSync.js ──────────────────────
if (typeof syncFeedbackFromFirestore === 'function') {
    syncFeedbackFromFirestore(function () {
        if (document.getElementById('section-feedback') &&
            document.getElementById('section-feedback').style.display !== 'none') {
            renderFeedback();
        }
    });
}

// ══════════════════════════════════════════════════════════
// ── APPOINTMENT CALENDAR ──────────────────────────────────
// ══════════════════════════════════════════════════════════

// ── js/admin/calendar/state.js ──────────────────────────────────
var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth();

var CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

var CAL_STATUS_COLOR = {
    confirmed: { bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', text: '#15803d' },
    pending: { bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', text: '#b45309' },
    done: { bg: '#f8fafc', border: '#cbd5e1', dot: '#64748b', text: '#475569' },
    cancelled: { bg: '#fef2f2', border: '#fca5a5', dot: '#dc2626', text: '#b91c1c' },
    staff_declined: { bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', text: '#b45309' }
};

// ── js/admin/calendar/renderCalendar.js ─────────────────────────
function renderCalendar() {
    var label = document.getElementById('calMonthLabel');
    if (label) label.textContent = CAL_MONTHS[calMonth] + ' ' + calYear;

    var grid = document.getElementById('calGrid');
    if (!grid) return;

    var appts = typeof getSharedAppts === 'function' ? getSharedAppts() : [];
    var dateMap = {};
    appts.forEach(function (a) {
        if (!a.date) return;
        if (!dateMap[a.date]) dateMap[a.date] = { total: 0, pending: 0, confirmed: 0 };
        dateMap[a.date].total++;
        if (a.status === 'pending' || a.status === 'staff_declined') dateMap[a.date].pending++;
        if (a.status === 'confirmed') dateMap[a.date].confirmed++;
    });

    var firstDay = new Date(calYear, calMonth, 1).getDay();
    var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    var todayStr = new Date().toISOString().split('T')[0];

    // Clear and rebuild grid using DOM (avoids innerHTML quoting bugs)
    grid.innerHTML = '';

    // Leading empty cells
    for (var e = 0; e < firstDay; e++) {
        var empty = document.createElement('div');
        empty.style.cssText = 'height:46px;';
        grid.appendChild(empty);
    }

    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
        var mm = String(calMonth + 1).padStart(2, '0');
        var dd = String(d).padStart(2, '0');
        var ds = calYear + '-' + mm + '-' + dd;
        var info = dateMap[ds] || null;
        var isToday = (ds === todayStr);

        var cell = document.createElement('div');
        cell.style.cssText = [
            'height:46px',
            'border-radius:10px',
            'border:1.5px solid ' + (isToday ? 'var(--fern)' : 'var(--border)'),
            'background:' + (isToday ? 'var(--fern)' : (info ? 'var(--white)' : 'var(--pearl)')),
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'justify-content:center',
            'gap:3px',
            'cursor:' + (info ? 'pointer' : 'default'),
            'transition:background .15s,transform .1s',
            info ? 'box-shadow:0 1px 6px rgba(0,0,0,0.07)' : ''
        ].filter(Boolean).join(';');

        // Day number
        var num = document.createElement('span');
        num.textContent = d;
        num.style.cssText = 'font-size:.85rem;font-weight:' + (isToday ? '700' : '500') + ';color:' + (isToday ? 'white' : 'var(--ink)') + ';line-height:1;';
        cell.appendChild(num);

        // Dot indicator
        if (info) {
            var dot = document.createElement('span');
            var dotColor = info.pending > 0 ? '#f59e0b' : (info.confirmed > 0 ? '#16a34a' : '#94a3b8');
            dot.style.cssText = 'display:block;width:5px;height:5px;border-radius:50%;background:' + dotColor + ';';
            cell.appendChild(dot);
        }

        // Hover effect + click
        (function (dateStr, hasAppts, today) {
            cell.addEventListener('mouseenter', function () {
                if (today) { this.style.background = 'var(--sage)'; }
                else if (hasAppts) { this.style.background = 'var(--mist)'; this.style.transform = 'scale(1.06)'; }
            });
            cell.addEventListener('mouseleave', function () {
                this.style.background = today ? 'var(--fern)' : (hasAppts ? 'var(--white)' : 'var(--pearl)');
                this.style.transform = '';
            });
            if (hasAppts) {
                cell.addEventListener('click', function () { openCalDay(dateStr); });
            }
        })(ds, !!info, isToday);

        grid.appendChild(cell);
    }
}

// ── js/admin/calendar/openCalDay.js ─────────────────────────────
function openCalDay(dateStr) {
    var appts = (typeof getSharedAppts === 'function' ? getSharedAppts() : [])
        .filter(function (a) { return a.date === dateStr; })
        .sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });

    var parts = dateStr.split('-');
    var displayDate = CAL_MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
    document.getElementById('calDayTitle').textContent = '\uD83D\uDCC5 ' + displayDate;

    var list = document.getElementById('calDayList');
    if (appts.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--stone);font-size:.85rem;">No appointments on this date.</div>';
    } else {
        list.innerHTML = appts.map(function (a) {
            var sc = CAL_STATUS_COLOR[a.status] || CAL_STATUS_COLOR.pending;
            var statusLabel = a.status === 'staff_declined' ? '\u26A0 Staff Declined' : (a.status || 'pending');
            var clientName = escHtml(a.clientName || a.clientEmail || 'Walk-in');
            var service = escHtml(a.service || '\u2014');
            var staff = escHtml(a.staff || 'Any staff');
            return '<div style="padding:10px 12px;border-radius:9px;border:1.5px solid ' + sc.border + ';background:' + sc.bg + ';display:flex;gap:10px;align-items:center;">'
                + '<div style="min-width:52px;text-align:center;background:white;border-radius:6px;padding:5px 4px;border:1px solid ' + sc.border + ';font-size:.7rem;font-weight:600;color:' + sc.text + ';line-height:1.3;">' + escHtml(a.time || '\u2014') + '</div>'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-weight:600;font-size:.85rem;color:var(--ink);">' + clientName + '</div>'
                + '<div style="font-size:.76rem;color:var(--stone);margin-top:1px;">' + service + ' \u00B7 ' + staff + '</div>'
                + '</div>'
                + '<span style="font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:100px;background:' + sc.bg + ';color:' + sc.text + ';border:1px solid ' + sc.border + ';white-space:nowrap;flex-shrink:0;">' + statusLabel + '</span>'
                + '</div>';
        }).join('');
    }

    document.getElementById('calDayModal').classList.add('open');
}

// ── js/admin/calendar/calPrevMonth.js ───────────────────────────
function calPrevMonth() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
}

// ── js/admin/calendar/calNextMonth.js ───────────────────────────
function calNextMonth() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
}


// ── CHECKBOX SEARCH FILTER ────────────────────────────────

// ── js/admin/shared/filterCheckboxList.js ───────────────────────
function filterCheckboxList(searchId, listId) {
    var query = document.getElementById(searchId).value.toLowerCase().trim();
    var labels = document.querySelectorAll('#' + listId + ' label');
    labels.forEach(function (label) {
        var text = label.textContent.toLowerCase();
        if (text.includes(query)) {
            label.classList.remove('row-hidden');
        } else {
            label.classList.add('row-hidden');
        }
    });
}
// ── MONTH PICKER POPUP ────────────────────────────────────────────────────────

// ── js/admin/monthPicker/state.js ───────────────────────────────
var _mpYear = new Date().getFullYear();

// ── js/admin/monthPicker/toggleMonthPicker.js ───────────────────
function toggleMonthPicker(e) {
    e.stopPropagation();
    var picker = document.getElementById('calMonthPicker');
    if (picker.style.display !== 'none') {
        picker.style.display = 'none';
        return;
    }
    _mpYear = calYear;
    renderMonthPicker();
    var label = document.getElementById('calMonthLabel');
    var rect = label.getBoundingClientRect();
    picker.style.top = (rect.bottom + 6) + 'px';
    picker.style.left = Math.max(8, rect.left + (rect.width / 2) - 130) + 'px';
    picker.style.display = 'block';
}

// ── js/admin/monthPicker/renderMonthPicker.js ───────────────────
function renderMonthPicker() {
    document.getElementById('mpYearLabel').textContent = _mpYear;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var now = new Date();
    var grid = document.getElementById('mpMonthGrid');
    grid.innerHTML = months.map(function (m, i) {
        var isCurrent = (_mpYear === calYear && i === calMonth);
        var isToday = (_mpYear === now.getFullYear() && i === now.getMonth());
        var bg = isCurrent ? 'var(--fern)' : (isToday ? 'var(--mist)' : 'var(--pearl)');
        var color = isCurrent ? '#fff' : 'var(--ink)';
        var fw = isCurrent ? '700' : '500';
        return '<div onclick="mpSelectMonth(' + i + ')" style="padding:8px 4px;border-radius:9px;border:1.5px solid ' + (isCurrent ? 'var(--fern)' : 'var(--border)') + ';background:' + bg + ';color:' + color + ';font-size:.8rem;font-weight:' + fw + ';text-align:center;cursor:pointer;transition:background .12s;" onmouseover="if(!this.classList.contains(\'mp-sel\')){this.style.background=\'var(--mist)\';}" onmouseout="this.style.background=\'' + bg + '\'">' + m + '</div>';
    }).join('');
}

// ── js/admin/monthPicker/mpSelectMonth.js ───────────────────────
function mpSelectMonth(idx) {
    calYear = _mpYear;
    calMonth = idx;
    renderCalendar();
    document.getElementById('calMonthPicker').style.display = 'none';
}

// ── js/admin/monthPicker/mpPrevYear.js ──────────────────────────
function mpPrevYear() { _mpYear--; renderMonthPicker(); }

// ── js/admin/monthPicker/mpNextYear.js ──────────────────────────
function mpNextYear() { _mpYear++; renderMonthPicker(); }

// ── js/admin/monthPicker/outsideClickListener.js ────────────────
document.addEventListener('click', function (e) {
    var picker = document.getElementById('calMonthPicker');
    if (picker && picker.style.display !== 'none') {
        if (!picker.contains(e.target) && e.target.id !== 'calMonthLabel') {
            picker.style.display = 'none';
        }
    }
});
