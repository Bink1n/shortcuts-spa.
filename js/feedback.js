// ── feedback.js — Walk-in Feedback Page ─────────────────────────────────────
var selectedRating = 0;
var currentServiceId = null;
var currentServiceName = '';
var STAR_LABELS = ['', 'Poor ', 'Fair ', 'Good ', 'Great ', 'Excellent! '];

(function init() {
    var params = new URLSearchParams(window.location.search);
    var svcParam = params.get('service') || params.get('svc') || '';
    var services = typeof getServices === 'function' ? getServices() : [];
    if (svcParam) {
        var found = services.find(function (s) { return s.id === svcParam || s.name.toLowerCase() === svcParam.toLowerCase(); });
        if (found) { currentServiceId = found.id; currentServiceName = found.name; document.getElementById('serviceNameDisplay').textContent = found.name; var badge = document.getElementById('serviceBadge'); if (found.emoji) badge.querySelector('span').textContent = found.emoji; }
        else { currentServiceName = decodeURIComponent(svcParam); document.getElementById('serviceNameDisplay').textContent = currentServiceName; }
    } else {
        document.getElementById('serviceNameDisplay').textContent = 'Walk-in Service';
        var wrap = document.getElementById('svcSelectWrap'); wrap.style.display = 'flex';
        var sel = document.getElementById('svcSelect');
        services.forEach(function (s) { var opt = document.createElement('option'); opt.value = s.id; opt.textContent = (s.emoji || '') + ' ' + s.name; sel.appendChild(opt); });
        sel.addEventListener('change', function () { var picked = services.find(function (s) { return s.id === sel.value; }); if (picked) { currentServiceId = picked.id; currentServiceName = picked.name; document.getElementById('serviceNameDisplay').textContent = picked.name; loadExistingReviews(); } });
    }
    if (typeof syncFeedbackFromFirestore === 'function') { syncFeedbackFromFirestore(function () { loadExistingReviews(); }); } else { setTimeout(loadExistingReviews, 300); }
})();

var stars = document.querySelectorAll('.star-btn');
var starLabel = document.getElementById('starLabel');
stars.forEach(function (btn, idx) { btn.addEventListener('click', function () { selectedRating = idx + 1; renderStars(selectedRating); starLabel.textContent = STAR_LABELS[selectedRating]; }); });
function renderStars(rating) { stars.forEach(function (btn, i) { btn.classList.toggle('active', i < rating); }); }
stars.forEach(function (btn, idx) { btn.addEventListener('mouseenter', function () { stars.forEach(function (b, i) { b.style.color = i <= idx ? '#fbbf24' : ''; }); starLabel.textContent = STAR_LABELS[idx + 1]; }); });
document.getElementById('starRow').addEventListener('mouseleave', function () { stars.forEach(function (b) { b.style.color = ''; }); renderStars(selectedRating); starLabel.textContent = selectedRating ? STAR_LABELS[selectedRating] : 'Tap a star to rate'; });

document.getElementById('fbGoogleBtn').addEventListener('click', function () {
    if (typeof firebaseReady === 'undefined' || !firebaseReady) { showToast('Google sign-in not available right now.'); return; }
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function (result) { var gUser = result.user; document.getElementById('fbName').value = gUser.displayName || ''; document.getElementById('fbEmail').value = gUser.email || ''; document.getElementById('fbGoogleBtn').style.display = 'none'; showToast('Signed in as ' + gUser.displayName); }).catch(function (err) { showToast('Google sign-in failed: ' + err.message); });
});

document.getElementById('fbSubmitBtn').addEventListener('click', submitFeedback);
function submitFeedback() {
    if (!selectedRating) { showToast('Please select a star rating first.'); return; }
    var svcId = currentServiceId; var svcName = currentServiceName;
    if (!svcName) { var sel = document.getElementById('svcSelect'); if (sel && sel.value) { svcId = sel.value; svcName = sel.options[sel.selectedIndex].textContent.replace(/^\S+\s/, ''); } }
    if (!svcName) { showToast('Please select a service before submitting.'); return; }
    var name = document.getElementById('fbName').value.trim() || 'Anonymous';
    var email = document.getElementById('fbEmail').value.trim() || null;
    var comment = document.getElementById('fbComment').value.trim() || null;
    setBusy(true);
    var feedback = { id: Date.now(), serviceId: svcId || null, serviceName: svcName, rating: selectedRating, name: name, email: email, comment: comment, submittedAt: new Date().toISOString(), source: 'walkin' };
    if (typeof saveFeedback === 'function') { saveFeedback(feedback); showSuccess(feedback); }
    else { try { var list = JSON.parse(localStorage.getItem('spa_feedback') || '[]'); list.unshift(feedback); localStorage.setItem('spa_feedback', JSON.stringify(list)); } catch (e) {} showSuccess(feedback); }
}
function showSuccess(feedback) { setBusy(false); document.getElementById('fbForm').style.display = 'none'; var successEl = document.getElementById('fbSuccess'); successEl.style.display = 'block'; document.getElementById('successSvc').textContent = feedback.serviceName; document.getElementById('successStars').textContent = '⭐'.repeat(feedback.rating); loadExistingReviews(); }
function loadExistingReviews() {
    var svcName = currentServiceName;
    if (!svcName) { var sel = document.getElementById('svcSelect'); if (sel && sel.value) { var services = typeof getServices === 'function' ? getServices() : []; var picked = services.find(function(s){ return s.id === sel.value; }); if (picked) svcName = picked.name; } }
    var all = (typeof getFeedback === 'function') ? getFeedback() : [];
    if (!all.length) { try { all = JSON.parse(localStorage.getItem('spa_feedback') || '[]'); } catch(e) {} }
    var filtered = svcName ? all.filter(function(f){ return f.serviceName === svcName; }) : all;
    filtered.sort(function(a,b){ return (b.id||0)-(a.id||0); });
    var wrap = document.getElementById('existingReviewsWrap'); var list = document.getElementById('existingReviewsList');
    if (!wrap || !list) return;
    if (filtered.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    var total = filtered.length; var avg = (filtered.reduce(function(s,f){return s+(f.rating||0);},0)/total).toFixed(1);
    var heading = document.getElementById('reviewsHeading'); var subheading = document.getElementById('reviewsSubheading');
    if (heading) heading.textContent = svcName ? (svcName + ' Reviews') : 'All Reviews';
    if (subheading) subheading.textContent = avg + ' average · ' + total + ' review' + (total!==1?'s':'');
    var starLabels = ['','Poor','Fair','Good','Great','Excellent']; var STAR_FILLED = '⭐';
    list.innerHTML = filtered.slice(0, 8).map(function(f) {
        var name = f.name || 'Anonymous'; var initial = name.charAt(0).toUpperCase();
        var stars = STAR_FILLED.repeat(f.rating||0);
        var date = f.submittedAt ? new Date(f.submittedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '';
        var ratingColor = f.rating>=4 ? '#16a34a' : f.rating===3 ? '#d97706' : '#dc2626';
        return '<div style="padding:14px 0;border-bottom:1px solid var(--mist);display:flex;gap:12px;align-items:flex-start;"><div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--fern),var(--sage));display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:600;color:white;flex-shrink:0;">' + escHtml(initial) + '</div><div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;"><span style="font-weight:600;font-size:.85rem;color:var(--ink);">' + escHtml(name) + '</span><span style="font-size:.9rem;color:' + ratingColor + ';">' + stars + '</span><span style="font-size:.68rem;color:var(--silver);margin-left:auto;">' + date + '</span></div>' + (f.comment ? '<div style="font-size:.8rem;color:var(--stone);line-height:1.6;">"' + escHtml(f.comment) + '"</div>' : '<div style="font-size:.78rem;color:var(--silver);font-style:italic;">' + (starLabels[f.rating]||'') + '</div>') + '</div></div>';
    }).join('');
    if (filtered.length > 8) { list.innerHTML += '<div style="text-align:center;padding-top:10px;"><a href="reviews.html' + (svcName ? '?service='+encodeURIComponent(svcName) : '') + '" style="font-size:.8rem;color:var(--fern);font-weight:500;text-decoration:none;">View all ' + filtered.length + ' reviews →</a></div>'; }
}
function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setBusy(on) { document.getElementById('fbBtnLabel').style.display = on ? 'none' : 'block'; document.getElementById('fbSpin').style.display = on ? 'block' : 'none'; document.getElementById('fbSubmitBtn').disabled = on; }
function showToast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 3500); }
