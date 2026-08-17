// ── js/chatbot-widget.js ─────────────────────────────────────────────
// Client / Public FAQ Chatbot (capstone requirement: "Chatbot – answering
// frequently asked questions"). Self-contained: builds its own DOM/CSS
// classes (see .cb-* rules in style.css) so it can be dropped onto any
// page — dashboard-client.html AND the public pages (index.html,
// feedback.html, reviews.html) — without touching that page's own markup
// or scripts.
//
// Data flow (Part 8/9 of the spec): reads the SAME chatbotFAQs collection
// the Admin "Chatbot Management" panel writes to, via listenToActiveFAQs()
// in shared-data.js (a live onSnapshot — Admin edits/disables/deletes
// reach this widget immediately, no redeploy needed). This widget never
// writes to Firestore and never invents its own FAQ data.
//
// Requires shared-data.js (getActiveFAQsCache/listenToActiveFAQs/matchFAQ)
// to already be loaded on the page.
(function () {
    if (document.getElementById('cbFab')) return; // already mounted

    var activeFaqs = (typeof getActiveFAQsCache === 'function') ? getActiveFAQsCache() : [];
    var opened = false;
    var greeted = false;

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Build DOM ────────────────────────────────────────────────────
    var fab = document.createElement('button');
    fab.id = 'cbFab';
    fab.className = 'cb-fab';
    fab.setAttribute('aria-label', 'Open chat assistant');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '</svg>';

    var panel = document.createElement('div');
    panel.id = 'cbPanel';
    panel.className = 'cb-panel';
    panel.innerHTML =
        '<div class="cb-header">' +
        '<div><div class="cb-header-title">💬 Shortcut\'s Spa Chatbot</div>' +
        '<div class="cb-header-sub">Ask about services, hours &amp; bookings</div></div>' +
        '<button class="cb-close" id="cbCloseBtn" aria-label="Close chat">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="cb-body" id="cbBody"></div>' +
        '<div class="cb-quickwrap" id="cbQuickWrap">' +
        '<div class="cb-suggestions" id="cbSuggestions"></div>' +
        '<button class="cb-quick-toggle" id="cbQuickToggle" type="button">' +
        '<span>💡 Quick Questions</span>' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<polyline points="18 15 12 9 6 15"/></svg>' +
        '</button>' +
        '</div>' +
        '<div class="cb-input-row">' +
        '<input type="text" class="cb-input" id="cbInput" placeholder="Type your question..." autocomplete="off" />' +
        '<button class="cb-send" id="cbSendBtn" aria-label="Send">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
        '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var body = document.getElementById('cbBody');
    var input = document.getElementById('cbInput');
    var suggestionsEl = document.getElementById('cbSuggestions');
    var quickWrap = document.getElementById('cbQuickWrap');
    var quickToggle = document.getElementById('cbQuickToggle');
    var quickOpen = false;

    function addMsg(text, who, isFallback) {
        var div = document.createElement('div');
        div.className = 'cb-msg ' + who + (isFallback ? ' fallback' : '');
        div.innerHTML = esc(text);
        body.appendChild(div);
        // Scroll after the browser has actually painted the new message —
        // scrolling in the same tick can under-measure scrollHeight (e.g.
        // before fonts/layout settle) and leave the message looking cut off.
        requestAnimationFrame(function () {
            body.scrollTop = body.scrollHeight;
        });
        return div;
    }

    function renderSuggestions() {
        var top = activeFaqs.slice(0, 3);
        suggestionsEl.innerHTML = '';
        quickWrap.style.display = top.length ? 'block' : 'none';
        top.forEach(function (f) {
            var chip = document.createElement('button');
            chip.className = 'cb-chip';
            chip.type = 'button';
            chip.textContent = f.question;
            chip.onclick = function () {
                closeQuick();
                handleUserMessage(f.question);
            };
            suggestionsEl.appendChild(chip);
        });
    }

    function openQuick() {
        suggestionsEl.classList.add('open');
        quickToggle.classList.add('open');
        quickOpen = true;
    }

    function closeQuick() {
        suggestionsEl.classList.remove('open');
        quickToggle.classList.remove('open');
        quickOpen = false;
    }

    // "Contact Us" fallback action (Part 6): on the logged-in client
    // dashboard this jumps straight to the Messages section; on public
    // pages (no Messages inbox without an account) it points the visitor
    // to sign in first, rather than a dead link.
    function goToContact() {
        if (typeof showSection === 'function' && document.getElementById('section-messages')) {
            showSection('messages');
            closePanel();
        } else {
            window.location.href = (location.pathname.indexOf('/pages/') !== -1 ? '../index.html' : 'index.html');
        }
    }

    function handleUserMessage(text) {
        text = (text || '').trim();
        if (!text) return;
        addMsg(text, 'user');
        input.value = '';
        closeQuick();

        var match = (typeof matchFAQ === 'function') ? matchFAQ(text, activeFaqs) : null;
        if (match) {
            addMsg(match.answer, 'bot');
        } else {
            var fb = addMsg("I'm sorry, I don't have an answer for that yet. Please contact Shortcut's Spa through the Messages section for assistance.", 'bot', true);
            var btn = document.createElement('button');
            btn.className = 'cb-contact-btn';
            btn.type = 'button';
            btn.textContent = 'Contact Us';
            btn.onclick = goToContact;
            fb.appendChild(document.createElement('br'));
            fb.appendChild(btn);
        }
    }

    function openPanel() {
        panel.classList.add('open');
        opened = true;
        if (!greeted) {
            addMsg('Hello! 👋 How can I help you today?', 'bot');
            greeted = true;
            renderSuggestions();
        }
        setTimeout(function () { input.focus(); }, 150);
    }

    function closePanel() {
        panel.classList.remove('open');
        opened = false;
    }

    fab.addEventListener('click', function () { opened ? closePanel() : openPanel(); });
    document.getElementById('cbCloseBtn').addEventListener('click', closePanel);
    document.getElementById('cbSendBtn').addEventListener('click', function () { handleUserMessage(input.value); });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); handleUserMessage(input.value); }
    });
    quickToggle.addEventListener('click', function () { quickOpen ? closeQuick() : openQuick(); });
    document.addEventListener('click', function (e) {
        if (quickOpen && !quickWrap.contains(e.target)) closeQuick();
    });

    // Live sync with Admin's Chatbot Management panel (Part 8/9) — any
    // add/edit/disable/delete from Admin updates activeFaqs immediately,
    // no page reload needed.
    if (typeof listenToActiveFAQs === 'function') {
        listenToActiveFAQs(function (list) {
            activeFaqs = list || [];
            if (opened) renderSuggestions();
        });
    }
})();
