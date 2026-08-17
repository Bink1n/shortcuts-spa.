// ── js/client/session/initUser.js ───────────────────────────────
var user = null;
try { user = JSON.parse(localStorage.getItem('spa_user')); } catch (e) { }
if (!user || user.role !== 'client') { window.location.href = '../index.html'; }

function paintClientUser(u) {
    var ini = u.name.charAt(0).toUpperCase();
    document.getElementById('sidebarAvatar').textContent = ini;
    document.getElementById('sidebarName').textContent = u.name;
    document.getElementById('profileAvatar').textContent = ini;
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileEmail').textContent = u.email;
    document.getElementById('profileNameInput').value = u.name;
    document.getElementById('profileEmailInput').value = u.email;
    document.getElementById('profilePhoneInput').value = u.phone || '';
    document.getElementById('pageTitle').textContent = 'Good day, ' + u.name + '!';

    if (u.profilePhoto) {
        var img = document.createElement('img');
        img.src = u.profilePhoto;
        img.style.cssText = 'width:60px;height:60px;border-radius:50%;object-fit:cover;';
        document.getElementById('profileAvatarWrap').innerHTML = '';
        document.getElementById('profileAvatarWrap').appendChild(img);
        var sideImg = document.createElement('img'); sideImg.src = u.profilePhoto;
        sideImg.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover;';
        var sa = document.getElementById('sidebarAvatar');
        sa.style.padding = '0'; sa.style.overflow = 'hidden';
        sa.innerHTML = ''; sa.appendChild(sideImg);
    }
}
if (user) paintClientUser(user);

requireRole('client', function (verifiedUser) {
    user = verifiedUser;
    paintClientUser(user);
    healClientUidIfMissing(user.email);
    if (typeof initChatBadgeListener === 'function') initChatBadgeListener();
    if (typeof initClientNotifBell === 'function') initClientNotifBell();
});

// ── js/client/shared/healClientUid.js ───────────────────────────
// Legacy accounts (migrated from the old password-only login before this app
// tracked Firebase Auth uids) can have a users/ Firestore doc with no `uid`
// field, or a stale one from before a later re-migration. Client
// notifications are addressed by uid (see resolveClientUidByEmail in
// shared-data.js), so a missing uid here is exactly why they silently never
// arrive. The client is the one party who always knows their own current
// auth.currentUser.uid for certain, so self-heal it on every dashboard load.
// merge:true + always including `email` keeps this valid under both the
// Firestore `create` and `update` rules for users/, and never touches any
// other field already on the doc (name, role, loyalty data, etc.).
function healClientUidIfMissing(email) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    var uid = (typeof currentUid === 'function') ? currentUid() : null;
    if (!db || !uid || !email) return;
    var safeId = email.replace(/[^a-zA-Z0-9]/g, '_');
    db.collection('users').doc(safeId).set({ uid: uid, email: email }, { merge: true })
        .catch(function (e) { console.warn('healClientUidIfMissing error:', e); });
}

// ── js/client/shared/escHtml.js ─────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── js/client/loyalty/getLoyalty.js ─────────────────────────────
function getLoyalty(visits) {
    if (visits >= 20) return { tier: 'Platinum', pts: visits * 20 };
    if (visits >= 10) return { tier: 'Gold', pts: visits * 15 };
    if (visits >= 5) return { tier: 'Silver', pts: visits * 10 };
    return { tier: 'Bronze', pts: visits * 5 };
}

// ── js/client/appointments/getMyAppointments.js ─────────────────
function getMyAppointments() {
    return getSavedMyAppts(user ? user.email : '');
}

// ── js/client/appointments/renderApptCard.js ────────────────────
function renderApptCard(a, showCancel) {
    var d = new Date(a.date + 'T00:00:00');
    var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var sc = { confirmed: 'status-confirmed', pending: 'status-pending', cancelled: 'status-cancelled', done: 'status-done' }[a.status] || '';
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var isPast = new Date(a.date + 'T00:00:00') < now;
    return '<div class="appt-card">'
        + '<div class="appt-date"><div class="day">' + d.getDate() + '</div><div class="month">' + mo[d.getMonth()] + '</div></div>'
        + '<div class="appt-info">'
        + '<div class="appt-service">' + a.service + '</div>'
        + '<div class="appt-meta">' + a.time + ' &middot; ' + a.staff + (a.notes ? ' &middot; ' + a.notes : '') + '</div>'
        + '</div>'
        + '<span class="appt-status ' + sc + '">' + a.status + '</span>'
        + (showCancel && !isPast && a.status !== 'cancelled' && a.status !== 'done'
            ? '<div class="appt-actions"><button class="appt-btn danger" onclick="cancelAppt(' + a.id + ')">Cancel</button></div>'
            : '')
        + '</div>';
}

// ── js/client/appointments/renderLists.js ───────────────────────
function renderLists() {
    var appts = getMyAppointments();
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var upcoming = appts.filter(function (a) { return new Date(a.date + 'T00:00:00') >= now && a.status !== 'cancelled' && a.status !== 'done' && a.status !== 'staff_declined'; });
    var history = appts.filter(function (a) { return new Date(a.date + 'T00:00:00') < now || a.status === 'cancelled' || a.status === 'done'; });
    var declined = appts.filter(function (a) { return a.status === 'staff_declined'; });
    var visits = appts.filter(function (a) { return a.status === 'confirmed' || a.status === 'done'; }).length;
    var loyalty = getLoyalty(visits);

    document.getElementById('statUpcoming').textContent = upcoming.length;
    document.getElementById('statTotal').textContent = visits;
    document.getElementById('statSvcs').textContent = getServices().length;
    document.getElementById('statLoyalty').textContent = loyalty.tier;
    document.getElementById('statPts').textContent = loyalty.pts + ' pts earned';
    document.getElementById('profileTier').textContent = loyalty.tier + ' Member';

    if (appts.length > 0) {
        var earliest = appts.reduce(function (m, a) { return a.date < m ? a.date : m; }, appts[0].date);
        document.getElementById('statMemberSince').textContent = 'Member since ' + earliest.slice(0, 4);
    }

    document.getElementById('upcomingList').innerHTML = upcoming.length
        ? upcoming.map(function (a) { return renderApptCard(a, true); }).join('')
        : '<p style="color:var(--stone);font-size:.85rem;padding:12px 0;">No upcoming appointment. <a href="#" onclick="return showSection(\'book\')" style="color:var(--sage);">Book now &rarr;</a></p>';

    document.getElementById('allApptList').innerHTML = appts.length
        ? appts.map(function (a) { return renderApptCard(a, true); }).join('')
        : '<p style="color:var(--stone);font-size:.85rem;padding:12px 0;">No appointments. <a href="#" onclick="return showSection(\'book\')" style="color:var(--sage);">Book your first service &rarr;</a></p>';

    document.getElementById('historyList').innerHTML = history.length
        ? history.map(function (a) { return renderApptCard(a, false); }).join('')
        : '<p style="color:var(--stone);font-size:.85rem;padding:12px 0;">No visit history yet.</p>';

    var noticeBox = document.getElementById('declinedNotices');
    if (noticeBox) {
        if (declined.length > 0) {
            noticeBox.style.display = '';
            noticeBox.innerHTML = '<div class="notice-banner-title">️ Staff Update on Your Appointment' + (declined.length > 1 ? 's' : '') + '</div>'
                + declined.map(function (a) {
                    var d = new Date(a.date + 'T00:00:00');
                    var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return '<div class="notice-item">'
                        + '<div class="notice-item-top">'
                        + '<strong>' + a.service + '</strong>'
                        + '<span style="font-size:.75rem;color:var(--stone);">' + mo[d.getMonth()] + ' ' + d.getDate() + ' &middot; ' + a.time + '</span>'
                        + '</div>'
                        + '<div class="notice-reason"><span style="color:#dc2626;">Declined by ' + (a.staffDeclinedBy || 'staff') + ':</span> ' + (a.staffDeclineReason || 'No reason given') + '</div>'
                        + '<div class="notice-actions">'
                        + '<button class="cbtn cbtn-accept" onclick="keepAndReassign(' + a.id + ')">Keep &amp; Reassign Staff</button>'
                        + '<button class="cbtn cbtn-decline" onclick="cancelDeclinedAppt(' + a.id + ')">Cancel Appointment</button>'
                        + '</div>'
                        + '</div>';
                }).join('');
        } else {
            noticeBox.style.display = 'none';
            noticeBox.innerHTML = '';
        }
    }
}

// ── js/client/appointments/cancelAppt.js ────────────────────────
function cancelAppt(id) {
    if (!confirm('Cancel this appointment?')) return;
    updateApptStatus(id, 'cancelled');
    renderLists();
    showToast('Appointment cancelled.');
}

// ── js/client/appointments/cancelDeclinedAppt.js ────────────────
function cancelDeclinedAppt(id) {
    if (!confirm('Cancel this appointment?')) return;
    updateApptStatus(id, 'cancelled');
    renderLists();
    showToast('Appointment cancelled.');
}

// ── js/client/appointments/keepAndReassign.js ───────────────────
function keepAndReassign(id) {
    // Reset to pending so admin can pick a different staff member
    updateApptStatus(id, 'pending', { staffConfirmed: null, staffDeclineReason: null });
    renderLists();
    showToast('Request sent! Admin will reassign a staff member for you.');
}

// ── js/client/services/state.js ─────────────────────────────────
var activeCategory = 'All';

// ── js/client/services/renderCatTabs.js ─────────────────────────
function renderCatTabs() {
    var cats = ['All'].concat(getCategories());
    document.getElementById('catTabs').innerHTML = cats.map(function (c) {
        return '<button class="cat-tab' + (c === activeCategory ? ' active' : '') + '" onclick="setCategory(\'' + c.replace(/'/g, "\\'") + '\')">' + (c === 'All' ? '&#127807; All' : c) + '</button>';
    }).join('');
}

// ── js/client/services/setCategory.js ───────────────────────────
function setCategory(cat) { activeCategory = cat; renderCatTabs(); renderSvcList(); }

// ── js/client/services/getSvcRatingMap.js ───────────────────────
function getSvcRatingMap() {
    var fb = (typeof getFeedback === 'function') ? getFeedback() : [];
    try { if (!fb.length) fb = JSON.parse(localStorage.getItem('spa_feedback') || '[]'); } catch (e) { }
    var map = {};
    fb.forEach(function (f) {
        if (!f.serviceName) return;
        if (!map[f.serviceName]) map[f.serviceName] = { total: 0, count: 0 };
        map[f.serviceName].total += f.rating || 0;
        map[f.serviceName].count++;
    });
    return map;
}

// ── js/client/services/renderSvcList.js ─────────────────────────
function renderSvcList() {
    var svcs = getServices();
    var q = (document.getElementById('svcSearch') || { value: '' }).value.toLowerCase();
    if (activeCategory !== 'All') svcs = svcs.filter(function (s) { return s.category === activeCategory; });
    if (q) svcs = svcs.filter(function (s) { return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.price.toLowerCase().includes(q); });
    document.getElementById('svcCount').textContent = svcs.length + ' services';
    var ratingMap = getSvcRatingMap();
    document.getElementById('svcList').innerHTML = svcs.length
        ? svcs.map(function (s) {
            var rm = ratingMap[s.name];
            var ratingBadge = rm && rm.count > 0
                ? '<span style="font-size:.74rem;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:100px;padding:2px 8px;display:inline-flex;align-items:center;gap:3px;margin-left:4px;">⭐ ' + (rm.total / rm.count).toFixed(1) + ' <span style="color:var(--stone);font-weight:400;">(' + rm.count + ')</span></span>'
                : '';
            return '<div class="svc-row">'
                + '<span class="svc-emoji">' + s.emoji + '</span>'
                + '<div class="svc-info"><div class="svc-name">' + s.name + ratingBadge + '</div><div class="svc-cat">' + s.category + '</div></div>'
                + '<span class="svc-dur">' + s.duration + '</span>'
                + '<span class="svc-price">' + s.price + '</span>'
                + '<button class="book-btn" onclick="openBookModal(\'' + s.name.replace(/'/g, "\\'") + '\')">Book</button>'
                + '</div>';
        }).join('')
        : '<p style="text-align:center;color:var(--stone);font-size:.85rem;padding:28px 0;">No services found.</p>';
}

// ── js/client/services/renderPopular.js ─────────────────────────
function renderPopular() {
    var top = getServices().slice(0, 6);
    document.getElementById('popularList').innerHTML = top.map(function (s) {
        return '<div class="svc-row">'
            + '<span class="svc-emoji">' + s.emoji + '</span>'
            + '<div class="svc-info"><div class="svc-name">' + s.name + '</div><div class="svc-cat">' + s.category + '</div></div>'
            + '<span class="svc-price">' + s.price + '</span>'
            + '<button class="book-btn" onclick="openBookModal(\'' + s.name.replace(/'/g, "\\'") + '\')">Book</button>'
            + '</div>';
    }).join('');
}

// ── js/client/booking/populateBookSelect.js ─────────────────────
function populateBookSelect(pre) {
    document.getElementById('bookService').innerHTML = getServices().map(function (s) {
        return '<option value="' + s.name + '"' + (s.name === pre ? ' selected' : '') + '>' + s.name + ' &mdash; ' + s.price + '</option>';
    }).join('');
}

// ── js/client/booking/hasActiveAppointment.js ────────────────────
// Per Scope & Limitations: "The client would also be allowed to schedule
// one appointment at a time, meaning if a user has a pending appointment,
// scheduling another appointment is not allowed or limited." This also
// doubles as a fake/spam-booking guard — one account can't flood the
// system with several simultaneous bookings.
function hasActiveAppointment() {
    var ACTIVE_STATUSES = ['pending', 'confirmed'];
    return getMyAppointments().some(function (a) {
        return ACTIVE_STATUSES.indexOf(a.status) !== -1;
    });
}

// ── js/client/booking/openBookModal.js ──────────────────────────
function openBookModal(service) {
    if (hasActiveAppointment()) {
        showToast('You already have an active appointment. Please wait until it is completed or cancelled before booking another.');
        return false;
    }

    populateBookSelect(service);

    // Refresh staff dropdown every time the modal opens
    var staffUsers = getCachedStaffList().filter(function (s) { return s.status !== 'inactive'; });
    var sel = document.getElementById('bookStaff');
    sel.innerHTML = '<option value="Any available staff">Any available staff</option>';
    staffUsers.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.name; opt.textContent = s.name + (s.specialization ? ' — ' + s.specialization : '');
        sel.appendChild(opt);
    });

    var t = new Date(); t.setDate(t.getDate() + 1);
    initBookingAvailability('book', t.toISOString().split('T')[0]);
    document.getElementById('bookNotes').value = '';
    document.getElementById('bookModal').classList.add('open');
    return false;
}

// ── js/client/booking/closeBookModal.js ─────────────────────────
function closeBookModal() { document.getElementById('bookModal').classList.remove('open'); }

// ── js/client/booking/confirmBooking.js ─────────────────────────
function confirmBooking() {
    var svc = document.getElementById('bookService').value;
    var date = document.getElementById('bookDate').value;
    var time = document.getElementById('bookTime').value;
    var stf = document.getElementById('bookStaff').value;
    var note = document.getElementById('bookNotes').value.trim();
    if (!date) { showToast('Please pick a date.'); return; }
    // Safety-net re-check (in addition to the one in openBookModal) in case
    // an appointment was created in another tab/device while this modal was
    // still open.
    if (hasActiveAppointment()) {
        showToast('You already have an active appointment. Please wait until it is completed or cancelled before booking another.');
        closeBookModal();
        return;
    }
    addSharedAppt({
        id: Date.now(),
        clientUid: (typeof currentUid === 'function') ? currentUid() : null,
        clientEmail: user ? user.email : '',
        clientName: user ? user.name : 'Client',
        service: svc,
        date: date,
        time: time,
        staff: stf,
        status: 'pending',
        notes: note
    });
    renderLists();
    closeBookModal();
    if (typeof logActivity === 'function') {
        logActivity('New Appointment', user ? user.name : 'Client', user ? user.email : '', svc + ' on ' + date);
    }
    showToast('Appointment booked! Pending admin confirmation.');
}

// ── js/client/profile/saveProfile.js ────────────────────────────
function saveProfile() {
    var newName = document.getElementById('profileNameInput').value.trim();
    var newPhone = document.getElementById('profilePhoneInput').value.trim();
    var bdayEl = document.getElementById('profileBirthday');
    var newBday = bdayEl ? bdayEl.value : '';
    if (!newName) { showToast('Name cannot be empty.'); return; }
    user.name = newName; user.phone = newPhone;
    if (newBday) user.birthday = newBday;
    localStorage.setItem('spa_user', JSON.stringify(user));
    document.getElementById('sidebarName').textContent = newName;
    document.getElementById('profileName').textContent = newName;
    document.getElementById('pageTitle').textContent = 'Good day, ' + newName + '!';
    if (typeof updateRegisteredUser === 'function') {
        var updates = { name: newName, phone: newPhone };
        if (newBday) updates.birthday = newBday;
        updateRegisteredUser(user.email, updates);
    }
    showToast('Profile updated! ');
}

// ── js/client/navigation/showSection.js ─────────────────────────
function showSection(name) {
    ['overview', 'appointments', 'book', 'profile', 'history', 'messages', 'myreviews'].forEach(function (s) {
        document.getElementById('section-' + s).style.display = s === name ? '' : 'none';
    });
    document.querySelectorAll('.nav-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    document.querySelectorAll('.bn-item').forEach(function (el) {
        el.classList.remove('active');
        if ((el.getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) el.classList.add('active');
    });
    var titles = { overview: 'Overview', appointments: 'My Appointments', book: 'Book a Service', profile: 'My Profile', history: 'Visit History', messages: 'Messages & Promos', myreviews: 'My Reviews' };
    document.getElementById('pageTitle').textContent = name === 'overview' ? 'Good day, ' + (user ? user.name : '') + '!' : titles[name];
    document.getElementById('pageSubtitle').textContent = name === 'overview' ? "Here's what's coming up for you" : '';
    if (name === 'book') { renderCatTabs(); renderSvcList(); }
    if (name === 'overview' || name === 'appointments' || name === 'history' || name === 'profile') renderLists();
    if (name === 'messages') { renderClientMessages(); initClientChat(); }
    if (name === 'myreviews') renderMyReviews();
    closeSidebar(); return false;
}

// ── js/client/messages/state.js ─────────────────────────────────
var CLIENT_READ_MSGS_KEY = 'spa_read_msgs_' + (user ? user.email.replace(/[^a-z0-9]/gi, '_') : 'guest');

// ── js/client/messages/getReadMsgIds.js ─────────────────────────
function getReadMsgIds() {
    try { return JSON.parse(localStorage.getItem(CLIENT_READ_MSGS_KEY) || '[]'); } catch (e) { return []; }
}

// ── js/client/messages/markMsgRead.js ───────────────────────────
function markMsgRead(id) {
    var read = getReadMsgIds();
    if (read.indexOf(String(id)) === -1) { read.push(String(id)); localStorage.setItem(CLIENT_READ_MSGS_KEY, JSON.stringify(read)); }
}

// ── js/client/messages/renderClientMessages.js ──────────────────
function renderClientMessages() {
    if (!user) return;
    var msgs = getMessagesForClient(user.email);
    var container = document.getElementById('clientMsgList');
    if (!container) return;

    var readIds = getReadMsgIds();

    if (msgs.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--stone);"><div style="font-size:2.5rem;margin-bottom:12px;"></div><p style="font-weight:500;">No messages yet</p><p style="font-size:.82rem;margin-top:4px;">Promos and announcements from the spa will appear here.</p></div>';
        return;
    }

    var typeMeta = {
        promo: { label: ' Promo', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
        announcement: { label: ' Announcement', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        personal: { label: ' Personal', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' }
    };

    container.innerHTML = msgs.map(function (m) {
        var meta = typeMeta[m.type] || typeMeta.announcement;
        var isRead = readIds.indexOf(String(m.id)) !== -1;
        var sentDate = m.sentAt ? new Date(m.sentAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        var preview = escHtml((m.body || '').replace(/\n/g, ' ').substring(0, 70)) + ((m.body && m.body.length > 70) ? '…' : '');
        return '<div id="msgcard-' + m.id + '" onclick="toggleMsg(\'' + m.id + '\')" '
            + 'style="background:white;border:1px solid ' + (isRead ? 'var(--border)' : meta.border) + ';border-radius:14px;padding:18px 20px;margin-bottom:12px;border-left:4px solid ' + meta.color + ';cursor:pointer;transition:box-shadow .2s,opacity .2s;opacity:' + (isRead ? '0.85' : '1') + ';">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">'
            + '<span style="font-size:.72rem;font-weight:600;background:' + meta.bg + ';color:' + meta.color + ';border:1px solid ' + meta.border + ';padding:2px 10px;border-radius:100px;">' + meta.label + '</span>'
            + '<span id="dot-' + m.id + '" style="display:' + (isRead ? 'none' : 'inline-block') + ';width:8px;height:8px;border-radius:50%;background:#ec4899;flex-shrink:0;"></span>'
            + '<span style="font-size:.7rem;color:var(--stone);margin-left:auto;">' + sentDate + '</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
            + '<div style="font-weight:600;font-size:.95rem;color:var(--ink);">' + escHtml(m.subject) + '</div>'
            + '<svg id="chevron-' + m.id + '" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;color:var(--stone);transition:transform .25s;"><polyline points="6 9 12 15 18 9"/></svg>'
            + '</div>'
            + '<div id="msgpreview-' + m.id + '" style="font-size:.82rem;color:var(--stone);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + preview + '</div>'
            + '<div id="msgbody-' + m.id + '" style="display:none;font-size:.85rem;color:var(--stone);line-height:1.7;white-space:pre-wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">' + escHtml(m.body) + '</div>'
            + '</div>';
    }).join('');

    // Update badge after render
    updateMsgBadge();
}

// ── js/client/messages/toggleMsg.js ─────────────────────────────
function toggleMsg(id) {
    var body = document.getElementById('msgbody-' + id);
    var preview = document.getElementById('msgpreview-' + id);
    var chevron = document.getElementById('chevron-' + id);
    var card = document.getElementById('msgcard-' + id);
    var dot = document.getElementById('dot-' + id);
    if (!body) return;

    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    preview.style.display = isOpen ? 'block' : 'none';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (card) card.style.boxShadow = isOpen ? '' : '0 4px 16px rgba(0,0,0,.07)';

    // Mark as read
    if (!isOpen) {
        markMsgRead(id);
        if (dot) dot.style.display = 'none';
        if (card) card.style.opacity = '1';
    }
}

// ── js/client/messages/updateMsgBadge.js ────────────────────────
function updateMsgBadge() {
    if (!user) return;
    var msgs = getMessagesForClient(user.email);
    var readIds = getReadMsgIds();
    var unread = msgs.filter(function (m) { return readIds.indexOf(String(m.id)) === -1; }).length;
    if (_chatUnreadByClient) unread += 1;
    var badge = document.getElementById('msgBadge');
    if (!badge) return;
    if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// ── js/client/messages/chat.js ───────────────────────────────────
// Two-way chat with the spa, separate from the broadcast list above.
// See shared-data.js for the conversations/{uid} data layer.
var _chatUnsub = null;
var _chatMetaUnsub = null;
var _chatUnreadByClient = false;
var _chatInitialized = false;

function currentUid() {
    return (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser.uid : null;
}

// Starts the lightweight "is there anything unread" listener for the
// sidebar badge — runs once per session regardless of which page is open.
function initChatBadgeListener() {
    var uid = currentUid();
    if (!uid || _chatMetaUnsub) return;
    ensureConversation(uid, user.email, user.name);
    _chatMetaUnsub = listenToConversationMeta(uid, function (meta) {
        _chatUnreadByClient = !!meta.unreadByClient;
        updateMsgBadge();
    });
}


// Starts the full message-thread listener — only while the Messages page
// is actually open, to avoid downloading chat history the user isn't
// looking at.
function initClientChat() {
    var uid = currentUid();
    if (!uid) return;
    if (_chatUnsub) return; // already listening
    ensureConversation(uid, user.email, user.name);
    _chatUnsub = listenToConversation(uid, function (msgs) {
        renderChatThread(msgs);
        markConversationMessagesRead(uid, 'client');
        markConversationRead(uid, 'client');
    });
}

function stopClientChat() {
    if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
}
window.addEventListener('beforeunload', function () {
    stopClientChat();
    if (_chatMetaUnsub) { _chatMetaUnsub(); _chatMetaUnsub = null; }
});

// ── js/client/notifications/bell.js ──────────────────────────────
// Reads notifications/{id} where recipientUid == this client's own Firebase
// Auth uid — the primary identifier (see resolveClientUidByEmail /
// createNotification in shared-data.js, and the matching rule in
// firestore.rules). Mirrors initAdminNotifBell() / initStaffNotifBell().
var CLIENT_NOTIF_META = {
    new_appointment: '📅', appointment_confirmed: '✅', appointment_rescheduled: '🔁',
    appointment_cancelled: '🚫', appointment_completed: '🎉', new_message: '💬'
};
var _clientNotifUnsub = null;
var _clientNotifCache = [];

function initClientNotifBell() {
    if (_clientNotifUnsub) return;
    var uid = currentUid();
    var db = (typeof getDb === 'function') ? getDb() : null;
    console.log('[CLIENT NOTIF] Auth UID:', uid);
    console.log('[CLIENT NOTIF] Auth Email:', user ? user.email : null);
    if (!db || !uid) { showClientNotifError(); return; }
    console.log('[CLIENT NOTIF] Notification listener started');
    _clientNotifUnsub = db.collection('notifications')
        .where('recipientUid', '==', uid)
        .limit(30)
        .onSnapshot(function (snap) {
            var items = [];
            snap.forEach(function (doc) { items.push(Object.assign({ _id: doc.id }, doc.data())); });
            console.log('[CLIENT NOTIF] Notifications received:', items.length);
            items.forEach(function (n) {
                console.log('[CLIENT NOTIF] Notification recipientUid:', n.recipientUid, 'type:', n.type);
            });
            items.sort(function (a, b) {
                var ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
                var tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });
            _clientNotifCache = items;
            renderClientNotifDropdown(items);
        }, function (e) {
            console.warn('[CLIENT NOTIF ERROR] Code:', e.code, 'Message:', e.message);
            showClientNotifError();
        });
}
function stopClientNotifBell() {
    if (_clientNotifUnsub) { _clientNotifUnsub(); _clientNotifUnsub = null; }
}
window.addEventListener('beforeunload', stopClientNotifBell);

function showClientNotifError() {
    var list = document.getElementById('notifList');
    if (list) list.innerHTML = '<div class="notif-empty">Unable to load notifications.</div>';
}

function toggleClientNotifDropdown(e) {
    if (e) e.stopPropagation();
    var dd = document.getElementById('notifDropdown');
    if (!dd) return;
    var willOpen = !dd.classList.contains('open');
    dd.classList.toggle('open', willOpen);
    if (willOpen) markClientNotifsRead(_clientNotifCache);
}
document.addEventListener('click', function (e) {
    var dd = document.getElementById('notifDropdown');
    var wrap = document.getElementById('notifBellBtn');
    if (dd && dd.classList.contains('open') && wrap && !dd.contains(e.target) && e.target !== wrap && !wrap.contains(e.target)) {
        dd.classList.remove('open');
    }
});

// Persists read:true in Firestore for every currently-unread notification
// shown in the dropdown (not just a localStorage "have I seen it" flag).
function markClientNotifsRead(items) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (!db) return;
    var unread = items.filter(function (n) { return !n.read; }).slice(0, 20);
    if (!unread.length) return;
    var batch = db.batch();
    unread.forEach(function (n) { batch.update(db.collection('notifications').doc(n._id), { read: true }); });
    batch.commit().catch(function (e) { console.warn('markClientNotifsRead error:', e); });
}

function clientNotifItemClick(id, section) {
    var db = (typeof getDb === 'function') ? getDb() : null;
    if (db && id) db.collection('notifications').doc(id).update({ read: true }).catch(function () { });
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.remove('open');
    if (typeof showSection === 'function') showSection(section);
}

function clientRelativeTime(ts) {
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

function renderClientNotifDropdown(items) {
    var list = document.getElementById('notifList');
    var badge = document.getElementById('notifBadge');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    list.innerHTML = items.slice(0, 15).map(function (n) {
        var icon = CLIENT_NOTIF_META[n.type] || '🔔';
        var section = n.type === 'new_message' ? 'messages' : 'appointments';
        return '<div class="notif-item' + (!n.read ? ' unread' : '') + '" onclick="clientNotifItemClick(\'' + n._id + '\',\'' + section + '\')" role="button" tabindex="0">'
            + '<span class="notif-item-icon">' + icon + '</span>'
            + '<div class="notif-item-body">'
            + '<div class="notif-item-text"><strong>' + escHtml(n.title || '') + '</strong><br>' + escHtml(n.message || '') + '</div>'
            + '<div class="notif-item-time">' + clientRelativeTime(n.createdAt) + '</div>'
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

function renderChatThread(msgs) {
    var el = document.getElementById('chatThread');
    if (!el) return;
    if (!msgs.length) {
        el.innerHTML = '<div style="margin:auto;text-align:center;color:var(--stone);font-size:.85rem;padding:20px;">'
            + '<div style="font-weight:600;color:var(--ink);margin-bottom:4px;">No messages yet</div>'
            + 'Your conversations with the SPA will appear here.</div>';
        return;
    }
    el.innerHTML = msgs.map(function (m) {
        var mine = m.senderRole === 'client';
        var time = (m.sentAt && typeof m.sentAt.toDate === 'function')
            ? m.sentAt.toDate().toLocaleString('en-PH', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
            : 'Sending…';
        var status = mine ? (' · ' + (m.read ? 'Seen' : 'Sent')) : '';
        return '<div style="align-self:' + (mine ? 'flex-end' : 'flex-start') + ';max-width:78%;">'
            + '<div style="background:' + (mine ? 'var(--fern)' : '#fff') + ';color:' + (mine ? '#fff' : 'var(--ink)')
            + ';border:1px solid ' + (mine ? 'var(--fern)' : 'var(--border)') + ';border-radius:14px;'
            + (mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;')
            + 'padding:9px 13px;font-size:.85rem;line-height:1.45;white-space:pre-wrap;word-break:break-word;">'
            + escHtml(m.text) + '</div>'
            + '<div style="font-size:.68rem;color:var(--stone);margin-top:3px;text-align:' + (mine ? 'right' : 'left') + ';">'
            + time + status + '</div></div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function onChatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendClientChatMessage(); }
}

function sendClientChatMessage() {
    var input = document.getElementById('chatInput');
    var btn = document.getElementById('chatSendBtn');
    if (!input || !user) return;
    var text = input.value;
    if (!text.trim()) return;
    var uid = currentUid();
    if (!uid) { showToast('Please sign in again.'); return; }

    btn.disabled = true;
    sendChatMessage(uid, 'client', user.name, user.email, text, function (ok, err) {
        btn.disabled = false;
        if (ok) { input.value = ''; input.style.height = 'auto'; }
        else { showToast(err || 'Message failed to send. Please try again.'); }
    });
}

// ── js/client/bootstrap/eventListeners.js ───────────────────────
document.getElementById('menuToggle').addEventListener('click', function () { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); });
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }
document.getElementById('logoutBtn').addEventListener('click', function () { spaLogout(); });
document.getElementById('bookModal').addEventListener('click', function (e) { if (e.target === this) closeBookModal(); });
function showToast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 3000); }

// ── js/client/bootstrap/initSync.js ─────────────────────────────
if (typeof initConnectionIndicator === 'function') initConnectionIndicator();
if (typeof syncServicesFromFirestore === 'function') {
    syncServicesFromFirestore(function () {
        renderSvcList();
        renderCatTabs();
        if (typeof listenToServices === 'function') {
            listenToServices(function () { renderSvcList(); renderCatTabs(); });
        }
    });
}
syncUsersFromFirestore(function () {
    syncApptsFromFirestore(function () {
        syncMessagesFromFirestore(function () {
            renderLists();
            renderPopular();
            updateMsgBadge();
            // Client's own Upcoming/History lists use a scoped, email-filtered
            // listener (only their own appointment docs) instead of the full
            // spa-wide collection — faster, and other clients' names/phone
            // numbers never reach this browser. The broader sync above is
            // kept only for slot-availability checks in the booking calendar
            // (getSlotStatus needs to know which dates/times are taken
            // spa-wide, not who booked them).
            if (user && user.email) {
                listenToMyAppts(user.email, function () { renderLists(); renderPopular(); });
            }
            listenToAppts(function () { renderPopular(); });
            listenToStaffList(function () { });
            listenToMessages(function () { updateMsgBadge(); renderClientMessages(); });
            if (typeof initChatBadgeListener === 'function') initChatBadgeListener();
            if (typeof initClientNotifBell === 'function') initClientNotifBell();
        });
    });
});

// ── js/client/navigation/setBnActive.js ─────────────────────────
function setBnActive(el) {
    document.querySelectorAll('.bn-item').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
}

// ── js/client/reviews/state.js ──────────────────────────────────
var RATE_DISMISS_KEY = 'spa_rate_dismissed_' + (user ? user.email.replace(/[^a-z0-9]/gi, '_') : 'guest');
var _ratingStar = 0;

// ── js/client/reviews/getAlreadyRatedApptIds.js ─────────────────
function getAlreadyRatedApptIds() {
    try {
        var fb = (typeof getFeedback === 'function') ? getFeedback() : [];
        if (!fb.length) fb = JSON.parse(localStorage.getItem('spa_feedback') || '[]');
        // Collect apptIds that have already been reviewed
        return fb.filter(function (f) { return f.apptId; }).map(function (f) { return String(f.apptId); });
    } catch (e) { return []; }
}

// ── js/client/reviews/getUnratedDoneAppts.js ────────────────────
function getUnratedDoneAppts() {
    if (!user) return [];
    var dismissed = JSON.parse(localStorage.getItem(RATE_DISMISS_KEY) || '[]');
    var rated = getAlreadyRatedApptIds();
    return getMyAppointments().filter(function (a) {
        return a.status === 'done'
            && dismissed.indexOf(String(a.id)) === -1
            && rated.indexOf(String(a.id)) === -1;
    });
}

// ── js/client/reviews/checkAndShowRatePrompt.js ─────────────────
function checkAndShowRatePrompt() {
    var unrated = getUnratedDoneAppts();
    var banner = document.getElementById('ratePromptBanner');
    if (!banner) return;
    if (unrated.length > 0) {
        banner.classList.add('visible');
        var sub = document.getElementById('ratePromptSub');
        if (sub) sub.textContent = unrated.length === 1
            ? 'You have 1 completed service to review!'
            : 'You have ' + unrated.length + ' completed services to review!';
    } else {
        banner.classList.remove('visible');
    }
}

// ── js/client/reviews/dismissRateBanner.js ──────────────────────
function dismissRateBanner() {
    // Dismiss all currently unrated — snooze until new ones appear
    var unrated = getUnratedDoneAppts();
    var dismissed = JSON.parse(localStorage.getItem(RATE_DISMISS_KEY) || '[]');
    unrated.forEach(function (a) { if (dismissed.indexOf(String(a.id)) === -1) dismissed.push(String(a.id)); });
    localStorage.setItem(RATE_DISMISS_KEY, JSON.stringify(dismissed));
    document.getElementById('ratePromptBanner').classList.remove('visible');
}

// ── js/client/reviews/openRateModal.js ──────────────────────────
function openRateModal(preServiceName) {
    _ratingStar = 0;
    renderRateStars(0);
    document.getElementById('rateStarLabel').textContent = '';
    document.getElementById('rateComment').value = '';

    // Populate appointment selector with done appointments
    var sel = document.getElementById('rateApptSel');
    var unrated = getUnratedDoneAppts();
    var allDone = getMyAppointments().filter(function (a) { return a.status === 'done'; });

    // Prefer unrated; fall back to all done
    var pool = unrated.length > 0 ? unrated : allDone;

    if (pool.length === 0) {
        // No done appts — let user pick a service manually
        sel.innerHTML = getServices().map(function (s) {
            return '<option value="' + escHtml(s.name) + '" data-apptid="">' + escHtml(s.name) + '</option>';
        }).join('');
    } else {
        sel.innerHTML = pool.map(function (a) {
            var d = new Date(a.date + 'T00:00:00');
            var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return '<option value="' + escHtml(a.service) + '" data-apptid="' + a.id + '">'
                + escHtml(a.service) + ' — ' + mo[d.getMonth()] + ' ' + d.getDate()
                + '</option>';
        }).join('');
    }

    // Pre-select by service name if given
    if (preServiceName) {
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === preServiceName) { sel.selectedIndex = i; break; }
        }
    }

    updateRateApptInfo();
    document.getElementById('rateModal').classList.add('open');
}

// ── js/client/reviews/closeRateModal.js ─────────────────────────
function closeRateModal() {
    document.getElementById('rateModal').classList.remove('open');
}

// ── js/client/reviews/updateRateApptInfo.js ─────────────────────
function updateRateApptInfo() {
    var sel = document.getElementById('rateApptSel');
    var opt = sel.options[sel.selectedIndex];
    var info = document.getElementById('rateApptInfo');
    if (!info) return;
    var apptId = opt ? opt.dataset.apptid : '';
    if (apptId) {
        var appt = getMyAppointments().find(function (a) { return String(a.id) === String(apptId); });
        if (appt) {
            var d = new Date(appt.date + 'T00:00:00');
            var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            info.textContent = appt.time + ' · ' + appt.staff + ' · ' + mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
        }
    } else {
        info.textContent = '';
    }
}

// ── js/client/reviews/setRateStar.js ────────────────────────────
function setRateStar(val) {
    _ratingStar = val;
    renderRateStars(val);
    var labels = ['', 'Poor ', 'Fair ', 'Good ', 'Great ', 'Excellent! '];
    document.getElementById('rateStarLabel').textContent = labels[val];
}

// ── js/client/reviews/renderRateStars.js ────────────────────────
function renderRateStars(rating) {
    document.querySelectorAll('.rate-star').forEach(function (btn, i) {
        btn.classList.toggle('active', i < rating);
    });
}

// ── js/client/reviews/submitClientReview.js ─────────────────────
function submitClientReview() {
    if (!_ratingStar) { showToast('Please select a star rating first.'); return; }
    var sel = document.getElementById('rateApptSel');
    var opt = sel.options[sel.selectedIndex];
    var serviceName = opt ? opt.value : '';
    var apptId = opt ? (opt.dataset.apptid || null) : null;
    var comment = document.getElementById('rateComment').value.trim() || null;

    if (!serviceName) { showToast('Please select a service.'); return; }

    var fb = {
        id: Date.now(),
        serviceId: null,
        serviceName: serviceName,
        apptId: apptId ? String(apptId) : null,
        rating: _ratingStar,
        name: user ? user.name : 'Anonymous',
        email: user ? user.email : null,
        comment: comment,
        submittedAt: new Date().toISOString(),
        source: 'registered'
    };

    if (typeof saveFeedback === 'function') {
        saveFeedback(fb);
    } else {
        try {
            var list = JSON.parse(localStorage.getItem('spa_feedback') || '[]');
            list.unshift(fb);
            localStorage.setItem('spa_feedback', JSON.stringify(list));
        } catch (e) { }
    }

    closeRateModal();
    showToast('Review submitted! Thank you ');
    checkAndShowRatePrompt();
    renderMyReviews();
}

// ── js/client/reviews/renderMyReviews.js ────────────────────────
function renderMyReviews() {
    var container = document.getElementById('myReviewsList');
    if (!container || !user) return;

    var allFb = (typeof getFeedback === 'function') ? getFeedback() : [];
    try { if (!allFb.length) allFb = JSON.parse(localStorage.getItem('spa_feedback') || '[]'); } catch (e) { }

    var mine = allFb.filter(function (f) { return f.email === user.email; });

    if (mine.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--stone);">'
            + '<div style="font-size:2.8rem;margin-bottom:12px;">⭐</div>'
            + '<p style="font-weight:500;font-size:.95rem;">No reviews yet</p>'
            + '<p style="font-size:.82rem;margin-top:6px;">After a completed service, you can rate your experience here.</p>'
            + '<button onclick="openRateModal()" style="margin-top:18px;background:linear-gradient(135deg,var(--fern),var(--sage));color:white;border:none;border-radius:10px;padding:10px 22px;font-family:inherit;font-size:.85rem;font-weight:500;cursor:pointer;">Write Your First Review</button>'
            + '</div>';
        return;
    }

    var starLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
    container.innerHTML = mine.map(function (f) {
        var stars = '⭐'.repeat(f.rating || 0);
        var date = f.submittedAt ? new Date(f.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        var ratingColor = f.rating >= 4 ? '#16a34a' : f.rating === 3 ? '#d97706' : '#dc2626';
        var srcBadge = f.source === 'registered'
            ? '<span style="font-size:.68rem;background:#e8f5ee;color:var(--fern);border:1px solid #b6dfc6;padding:2px 8px;border-radius:100px;">Registered</span>'
            : '<span style="font-size:.68rem;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:2px 8px;border-radius:100px;">Walk-in</span>';
        return '<div style="background:white;border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:12px;">'
            + '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:160px;">'
            + '<div style="font-weight:600;font-size:.92rem;color:var(--ink);margin-bottom:4px;">' + escHtml(f.serviceName) + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
            + '<span style="font-size:1.1rem;color:' + ratingColor + ';">' + stars + '</span>'
            + '<span style="font-size:.78rem;font-weight:600;color:' + ratingColor + ';">' + (starLabels[f.rating] || '') + '</span>'
            + srcBadge
            + '</div>'
            + (f.comment ? '<div style="font-size:.83rem;color:var(--stone);line-height:1.6;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">' + escHtml(f.comment) + '</div>' : '')
            + '</div>'
            + '<div style="font-size:.75rem;color:var(--silver);white-space:nowrap;flex-shrink:0;">' + date + '</div>'
            + '</div>'
            + '</div>';
    }).join('');
}

// ── js/client/bootstrap/patchRenderLists.js ─────────────────────
// ── Patch renderLists to also check rate prompt ───────────
var _origRenderLists = renderLists;
renderLists = function () {
    _origRenderLists();
    checkAndShowRatePrompt();
};

// ── js/client/bootstrap/initFeedbackSync.js ─────────────────────
// ── Sync feedback on load too ─────────────────────────────
if (typeof syncFeedbackFromFirestore === 'function') {
    syncFeedbackFromFirestore(function () {
        checkAndShowRatePrompt();
    });
}
