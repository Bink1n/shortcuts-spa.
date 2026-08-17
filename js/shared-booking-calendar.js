// ── Shared Booking Availability Calendar ───────────────────────────────────
// Renders a month calendar (color-coded by availability) + a time-slot grid
// into a booking modal. Used by both the client "Book Appointment" modal
// (prefix 'book') and the admin "New Appointment" modal (prefix 'appt').
//
// One appointment per time slot for the whole spa (staff count doesn't
// matter) — a slot is "full" once any client has booked it.
//
// Expects these elements to already exist in the modal HTML:
//   #{prefix}CalWrap   — container where the calendar gets built
//   #{prefix}TimeWrap  — container where the time-slot grid gets built
//   #{prefix}Date      — hidden <input> that stores the chosen YYYY-MM-DD
//   #{prefix}Time      — hidden <input> that stores the chosen time label
//
// Call initBookingAvailability(prefix, defaultDateStr) when the modal opens.

var _bookCalState = {}; // keyed by prefix: { year, month, selectedDate }

function initBookingAvailability(prefix, defaultDateStr) {
    var today = new Date();
    var def = defaultDateStr ? new Date(defaultDateStr + 'T00:00:00') : today;

    _bookCalState[prefix] = {
        year: def.getFullYear(),
        month: def.getMonth(),
        selectedDate: defaultDateStr || null
    };

    _renderBookCalendar(prefix);
    if (defaultDateStr) {
        _selectBookDate(prefix, defaultDateStr);
    } else {
        _renderBookTimeSlots(prefix, null);
    }
}

function _bookCalMonthLabel(year, month) {
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    return MONTHS[month] + ' ' + year;
}

function _bookDateStr(year, month, day) {
    var mm = String(month + 1).padStart(2, '0');
    var dd = String(day).padStart(2, '0');
    return year + '-' + mm + '-' + dd;
}

function _renderBookCalendar(prefix) {
    var wrap = document.getElementById(prefix + 'CalWrap');
    if (!wrap) return;
    var st = _bookCalState[prefix];

    var todayStr = new Date().toISOString().split('T')[0];
    var todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    var isCurrentMonth = (st.year === todayDate.getFullYear() && st.month === todayDate.getMonth());

    wrap.innerHTML = '';

    // Header: prev / label / next
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '‹';
    prevBtn.disabled = isCurrentMonth;
    prevBtn.style.cssText = 'width:30px;height:30px;border-radius:8px;border:1.5px solid var(--border);background:var(--white);cursor:' + (isCurrentMonth ? 'default' : 'pointer') + ';opacity:' + (isCurrentMonth ? '.35' : '1') + ';font-size:1rem;color:var(--ink);';
    prevBtn.addEventListener('click', function () {
        if (isCurrentMonth) return;
        st.month--; if (st.month < 0) { st.month = 11; st.year--; }
        _renderBookCalendar(prefix);
    });

    var label = document.createElement('div');
    label.textContent = _bookCalMonthLabel(st.year, st.month);
    label.style.cssText = 'font-weight:600;font-size:.9rem;color:var(--ink);';

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = '›';
    nextBtn.style.cssText = 'width:30px;height:30px;border-radius:8px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-size:1rem;color:var(--ink);';
    nextBtn.addEventListener('click', function () {
        st.month++; if (st.month > 11) { st.month = 0; st.year++; }
        _renderBookCalendar(prefix);
    });

    header.appendChild(prevBtn); header.appendChild(label); header.appendChild(nextBtn);
    wrap.appendChild(header);

    // Weekday row
    var wdRow = document.createElement('div');
    wdRow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) {
        var el = document.createElement('div');
        el.textContent = d;
        el.style.cssText = 'text-align:center;font-size:.68rem;color:var(--silver);font-weight:600;';
        wdRow.appendChild(el);
    });
    wrap.appendChild(wdRow);

    // Day grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;';

    var firstDay = new Date(st.year, st.month, 1).getDay();
    var daysInMonth = new Date(st.year, st.month + 1, 0).getDate();

    for (var e = 0; e < firstDay; e++) {
        var empty = document.createElement('div');
        grid.appendChild(empty);
    }

    for (var d = 1; d <= daysInMonth; d++) {
        var ds = _bookDateStr(st.year, st.month, d);
        var isPast = ds < todayStr;
        var isSelected = (ds === st.selectedDate);
        var isToday = (ds === todayStr);

        var cell = document.createElement('button');
        cell.type = 'button';
        cell.textContent = d;

        var summary = isPast ? null : getDayAvailabilitySummary(ds);
        var isFull = summary && summary.isFull;

        var bg = 'var(--pearl)', border = 'var(--border)', color = 'var(--ink)', cursor = 'pointer', opacity = '1';
        if (isPast) { bg = 'var(--pearl)'; color = 'var(--silver)'; cursor = 'default'; opacity = '.5'; }
        else if (isFull) { bg = 'var(--red-lt)'; border = 'var(--red)'; color = 'var(--red)'; }
        else { bg = 'var(--white)'; border = 'var(--border)'; color = 'var(--ink)'; }
        if (isSelected) { bg = 'var(--fern)'; border = 'var(--fern)'; color = 'white'; }
        else if (isToday) { border = 'var(--fern)'; }

        cell.style.cssText = 'height:34px;border-radius:8px;border:1.5px solid ' + border + ';background:' + bg + ';color:' + color + ';font-size:.8rem;font-weight:' + (isToday || isSelected ? '700' : '500') + ';cursor:' + cursor + ';opacity:' + opacity + ';transition:transform .1s;';
        cell.disabled = isPast;

        if (!isPast) {
            cell.addEventListener('click', function (dateStr) {
                return function () { _selectBookDate(prefix, dateStr); };
            }(ds));
        }

        grid.appendChild(cell);
    }

    wrap.appendChild(grid);

    // Legend
    var legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:14px;margin-top:10px;font-size:.7rem;color:var(--stone);';
    legend.innerHTML =
        '<span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:9px;height:9px;border-radius:3px;background:var(--white);border:1.5px solid var(--border);display:inline-block;"></span>Open</span>' +
        '<span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:9px;height:9px;border-radius:3px;background:var(--red-lt);border:1.5px solid var(--red);display:inline-block;"></span>Fully booked</span>';
    wrap.appendChild(legend);
}

function _selectBookDate(prefix, dateStr) {
    var st = _bookCalState[prefix];
    st.selectedDate = dateStr;
    var d = new Date(dateStr + 'T00:00:00');
    st.year = d.getFullYear(); st.month = d.getMonth();

    var dateInput = document.getElementById(prefix + 'Date');
    if (dateInput) dateInput.value = dateStr;

    _renderBookCalendar(prefix);
    _renderBookTimeSlots(prefix, dateStr);
}

function _renderBookTimeSlots(prefix, dateStr) {
    var wrap = document.getElementById(prefix + 'TimeWrap');
    if (!wrap) return;
    var timeInput = document.getElementById(prefix + 'Time');

    wrap.innerHTML = '';

    if (!dateStr) {
        var hint = document.createElement('div');
        hint.textContent = 'Pick a date above to see available times.';
        hint.style.cssText = 'font-size:.78rem;color:var(--silver);font-style:italic;';
        wrap.appendChild(hint);
        if (timeInput) timeInput.value = '';
        return;
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;';

    var slots = getAllTimeSlots();
    var firstAvailable = null;
    var selectedStillValid = false;

    slots.forEach(function (t) {
        var status = getSlotStatus(dateStr, t);
        var isFull = status === 'full';
        if (!isFull && !firstAvailable) firstAvailable = t;
        if (!isFull && timeInput && timeInput.value === t) selectedStillValid = true;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = t;
        var isSelected = timeInput && timeInput.value === t && !isFull;

        var bg = isSelected ? 'var(--fern)' : (isFull ? 'var(--pearl)' : 'var(--white)');
        var border = isSelected ? 'var(--fern)' : (isFull ? 'var(--border)' : 'var(--border)');
        var color = isSelected ? 'white' : (isFull ? 'var(--silver)' : 'var(--ink)');

        btn.style.cssText = 'padding:8px 6px;border-radius:8px;border:1.5px solid ' + border + ';background:' + bg + ';color:' + color + ';font-size:.75rem;font-weight:' + (isSelected ? '700' : '500') + ';cursor:' + (isFull ? 'default' : 'pointer') + ';text-decoration:' + (isFull ? 'line-through' : 'none') + ';opacity:' + (isFull ? '.6' : '1') + ';';
        btn.disabled = isFull;

        if (!isFull) {
            btn.addEventListener('click', function (time) {
                return function () {
                    if (timeInput) timeInput.value = time;
                    _renderBookTimeSlots(prefix, dateStr);
                };
            }(t));
        }

        grid.appendChild(btn);
    });

    wrap.appendChild(grid);

    // Auto-pick the first open slot if nothing valid is currently selected.
    if (timeInput && !selectedStillValid) {
        timeInput.value = firstAvailable || '';
        if (firstAvailable) {
            // re-render once more so the auto-picked slot shows as selected
            _renderBookTimeSlots(prefix, dateStr);
            return;
        }
    }

    if (!firstAvailable) {
        var full = document.createElement('div');
        full.textContent = 'No open times on this date — try another day.';
        full.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:8px;';
        wrap.appendChild(full);
    }
}
