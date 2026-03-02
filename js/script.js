const MAX_ATTEMPTS = 6;
let elements = [];
let elementDataArray = [];
let selectedElement = "";
let attempts = MAX_ATTEMPTS;
let gameOver = false;
let guessHistory = []; // array of color arrays per guess: ('green'|'yellow'|'grey')[]

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    const input = document.getElementById("guessInput");
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            const active = document.querySelector('#autocompleteList li.active');
            if (active) {
                input.value = active.textContent;
                closeAutocomplete();
            }
            checkGuess();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveAutocompleteSelection(1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveAutocompleteSelection(-1);
        } else if (e.key === "Escape") {
            closeAutocomplete();
        }
    });
    input.addEventListener("input", function () {
        filterAutocomplete(this.value);
    });
    document.addEventListener("click", function (e) {
        if (!e.target.closest('.autocomplete-wrapper')) closeAutocomplete();
    });
});

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalizeName(name) {
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// ── Data loading ──────────────────────────────────────────────────────────────

function fetchData() {
    fetch('data/elements_simple.json')
        .then(response => response.json())
        .then(data => {
            elementDataArray = data;
            elements = data.map(item => item.Element);
            populateGrid();
            populateDatalist();
            return fetch('data/daily_element.json');
        })
        .then(response => response.json())
        .then(daily => {
            const now = new Date();
            const todayStr = now.getUTCFullYear() + '-' +
                String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
                String(now.getUTCDate()).padStart(2, '0');
            selectedElement = (daily.date === todayStr && elements.includes(daily.element))
                ? daily.element
                : getDailyElement();
            saveSelectedElementToLocalStorage();
        })
        .catch(() => {
            selectedElement = getDailyElement();
            saveSelectedElementToLocalStorage();
        });
}

function getDailyElement() {
    const startDate = Date.UTC(2024, 0, 1);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dayIndex = Math.floor((todayUtc - startDate) / 86400000);
    // Mulberry32 seeded PRNG: non-sequential but deterministic per day
    let state = (dayIndex + 0x6D2B79F5) | 0;
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    const rand = ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    return elements[Math.floor(rand * elements.length)];
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function populateGrid() {
    const grid = document.getElementById("elementGrid");
    for (let period = 1; period <= 9; period++) {
        for (let group = 1; group <= 18; group++) {
            const element = elementDataArray.find(el => el.Period === period && el.Group === group);
            const rect = document.createElement("div");
            rect.classList.add("rectangle");
            if (!element) {
                rect.style.opacity = 0;
            } else {
                rect.innerHTML = `<span class="rect-num">${element.AtomicNumber}</span><span class="rect-sym">${element.Symbol}</span><span class="rect-name">${element.Element}</span>`;
            }
            grid.appendChild(rect);
        }
    }
}

function populateDatalist() {
    // Sort elements alphabetically once for use in filterAutocomplete()
    elements.sort((a, b) => a.localeCompare(b));
}

function filterAutocomplete(query) {
    const list = document.getElementById('autocompleteList');
    list.innerHTML = '';
    const q = query.trim().toLowerCase();
    if (!q) { closeAutocomplete(); return; }
    const matches = elements
        .filter(name => name.toLowerCase().startsWith(q));
    if (matches.length === 0) { closeAutocomplete(); return; }
    matches.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.setAttribute('role', 'option');
        li.addEventListener('mousedown', function (e) {
            e.preventDefault(); // prevent blur before click
            document.getElementById('guessInput').value = name;
            closeAutocomplete();
            checkGuess();
        });
        list.appendChild(li);
    });
    list.classList.add('open');
}

function closeAutocomplete() {
    const list = document.getElementById('autocompleteList');
    list.classList.remove('open');
    list.innerHTML = '';
}

function moveAutocompleteSelection(dir) {
    const list = document.getElementById('autocompleteList');
    const items = Array.from(list.querySelectorAll('li'));
    if (!items.length) return;
    const active = list.querySelector('li.active');
    let idx = items.indexOf(active);
    if (active) active.classList.remove('active');
    idx = (idx + dir + items.length) % items.length;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
}

// ── Core game logic ───────────────────────────────────────────────────────────

function checkGuess() {
    if (gameOver) return;
    const guessInput = document.getElementById("guessInput");
    const normalizedGuess = normalizeName(guessInput.value);

    if (!normalizedGuess) return;

    if (!elements.includes(normalizedGuess)) {
        displayMessage("Not a valid element name.", "var(--grey)");
        clearGuessInput();
        return;
    }

    if (normalizedGuess === selectedElement) {
        recordGuessColors(normalizedGuess);
        displayMessage("Correct! Well done.", "var(--green)");
        colorCorrectElementGrid();
        const usedAttempts = MAX_ATTEMPTS - attempts + 1;
        endGame(true, usedAttempts);
        return;
    }

    recordGuessColors(normalizedGuess);
    handleIncorrectGuess(normalizedGuess);
    clearGuessInput();
    attempts--;

    const attemptsDisplay = document.getElementById("attempts");
    if (attempts === 0) {
        attemptsDisplay.textContent = `Attempts left: ${attempts}`;
        displayMessage(`Out of attempts! The element was ${selectedElement}.`, "#c0392b");
        endGame(false, MAX_ATTEMPTS);
    } else {
        displayMessage("Try again!", "var(--orange)");
        attemptsDisplay.textContent = `Attempts left: ${attempts}`;
    }
}

function endGame(won, usedAttempts) {
    gameOver = true;
    disableGuessInput();
    updateStats(won, usedAttempts);
    saveGameResultToLocalStorage(won);
    if (won) showBonusPageIcon();
}

function saveGameResultToLocalStorage(won) {
    try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        localStorage.setItem('elementle-guessHistory', JSON.stringify(guessHistory));
        localStorage.setItem('elementle-won', JSON.stringify(won));
        localStorage.setItem('elementle-gameDate', dateStr);
    } catch (e) { console.error('Failed to save game result:', e); }
}

function recordGuessColors(guess) {
    const selectedArray = Array.from(selectedElement.toUpperCase());
    const guessedArray = Array.from(guess.toUpperCase());
    const greenIndices = getGreenIndices(guessedArray, selectedArray);
    const yellowIndices = getYellowIndices(guessedArray, selectedArray, greenIndices);
    const colors = guessedArray.map((_, i) =>
        greenIndices.includes(i) ? 'green' : yellowIndices.includes(i) ? 'yellow' : 'grey'
    );
    guessHistory.push(colors);
}

function clearGuessInput() {
    document.getElementById("guessInput").value = "";
    closeAutocomplete();
}

function handleIncorrectGuess(guess) {
    const guessedData = getElementData(guess);
    const selectedData = getElementData(selectedElement);
    colorGuessedElementGrid(guessedData);
    displayGuessedWordFeedback(guess, guessedData, selectedData);
}

function getElementData(elementName) {
    return elementDataArray.find(el => el.Element.toLowerCase() === elementName.toLowerCase());
}

function colorGuessedElementGrid(data) {
    const idx = (data.Period - 1) * 18 + data.Group;
    const el = document.querySelector(`#elementGrid .rectangle:nth-child(${idx})`);
    if (el) { el.classList.add("incorrectGuess"); }
}

function colorCorrectElementGrid() {
    const data = getElementData(selectedElement);
    if (!data) return;
    const idx = (data.Period - 1) * 18 + data.Group;
    const el = document.querySelector(`#elementGrid .rectangle:nth-child(${idx})`);
    if (el) {
        el.classList.remove("incorrectGuess");
        el.classList.add("correctGuess");
    }
}

// ── Guess history rendering ───────────────────────────────────────────────────

function displayGuessedWordFeedback(guess, guessedData, selectedData) {
    const container = document.getElementById("guessedWordsContainer");
    container.appendChild(createWordDiv(guess, guessedData, selectedData));
}

function createWordDiv(guess, guessedData, selectedData) {
    const div = document.createElement("div");
    div.classList.add("wordDiv");
    appendColoredLetters(div, guess, selectedElement);
    appendPlaceholders(div, guess);
    appendLengthSign(div, guess);
    appendArrowsOrCheckmarks(div, guessedData, selectedData);
    appendPercentage(div, guessedData, selectedData);
    return div;
}

function appendColoredLetters(parent, guess, selectedElement) {
    const selArr = Array.from(selectedElement.toUpperCase());
    const gueArr = Array.from(guess.toUpperCase());
    const green  = getGreenIndices(gueArr, selArr);
    const yellow = getYellowIndices(gueArr, selArr, green);
    for (let i = 0; i < gueArr.length; i++) {
        const span = document.createElement("span");
        span.classList.add("letterRectangle");
        span.textContent = guess[i];
        if (green.includes(i))  span.classList.add("green");
        else if (yellow.includes(i)) span.classList.add("yellow");
        parent.appendChild(span);
    }
}

function getGreenIndices(gueArr, selArr) {
    const gi = [];
    for (let i = 0; i < gueArr.length; i++)
        if (gueArr[i] === selArr[i]) gi.push(i);
    return gi;
}

function getYellowIndices(gueArr, selArr, greenIndices) {
    const yi = [];
    const matched = new Set(greenIndices);
    for (let i = 0; i < gueArr.length; i++) {
        if (matched.has(i)) continue;
        for (let j = 0; j < selArr.length; j++) {
            if (selArr[j] === gueArr[i] && !matched.has(j)) {
                yi.push(i); matched.add(j); break;
            }
        }
    }
    return yi;
}

function appendPlaceholders(parent, guess) {
    for (let i = 0; i < 14 - guess.length; i++) {
        const span = document.createElement("span");
        span.classList.add("letterRectangle", "transparentPlaceholder");
        parent.appendChild(span);
    }
}

function appendLengthSign(parent, guess) {
    const span = document.createElement("span");
    span.classList.add("sign");
    if (selectedElement.length > guess.length)      span.textContent = "\u2795";
    else if (selectedElement.length < guess.length) span.textContent = "\u2796";
    else                                             span.textContent = "🟰";
    parent.appendChild(span);
}

function appendArrowsOrCheckmarks(parent, gueData, selData) {
    appendPeriodIndicator(parent, gueData.Period, selData.Period);
    appendGroupIndicator(parent, gueData.Group, selData.Group);
}

function appendPeriodIndicator(parent, gP, sP) {
    const span = document.createElement("span");
    span.textContent = gP > sP ? "\u2191" : gP < sP ? "\u2193" : "\u2713";
    parent.appendChild(span);
}

function appendGroupIndicator(parent, gG, sG) {
    const span = document.createElement("span");
    span.textContent = gG > sG ? "\u2190" : gG < sG ? "\u2192" : "\u2713";
    parent.appendChild(span);
}

function appendPercentage(parent, gueData, selData) {
    const dist = Math.abs(gueData.Period - selData.Period) + Math.abs(gueData.Group - selData.Group);
    const pct  = Math.max(0, 100 - 4 * dist);
    for (let i = 1; i <= 5; i++) {
        const box = document.createElement("span");
        box.classList.add("percentageBox");
        if (pct >= i * 20)           box.classList.add("greenBox");
        else if (pct >= (i-1)*20+10) box.classList.add("yellowBox");
        parent.appendChild(box);
    }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function displayMessage(text, color) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.style.color = color;
}

function disableGuessInput() {
    document.getElementById("guessInput").disabled = true;
    document.getElementById("guessButton").disabled = true;
}

function showBonusPageIcon() {
    const inputContainer = document.getElementById('inputContainer');
    const bonusBlock = document.createElement('div');
    bonusBlock.classList.add('bonus-link');
    bonusBlock.textContent = 'Bonus Round →';
    bonusBlock.addEventListener('click', () => { window.location.href = 'bonus/bonuspage_1.html'; });
    inputContainer.innerHTML = '';
    inputContainer.appendChild(bonusBlock);
    document.getElementById('guessButton').style.display = 'none';
}

function saveSelectedElementToLocalStorage() {
    try { localStorage.setItem('selectedElement', selectedElement); }
    catch (e) { console.error('Failed to save to localStorage:', e); }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS_KEY = 'elementle-stats';

function loadStats() {
    try {
        const stored = JSON.parse(localStorage.getItem(STATS_KEY));
        if (!stored) return defaultStats();
        if (!Array.isArray(stored.distribution)) stored.distribution = [0,0,0,0,0,0];
        return stored;
    } catch { return defaultStats(); }
}

function defaultStats() {
    return { played: 0, won: 0, currentStreak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] };
}

function updateStats(won, usedAttempts) {
    const stats = loadStats();
    stats.played++;
    if (won) {
        stats.won++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
        const bucketIdx = Math.min(usedAttempts - 1, 5);
        stats.distribution[bucketIdx]++;
    } else {
        stats.currentStreak = 0;
    }
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function openStats() {
    const stats = loadStats();
    document.getElementById('statPlayed').textContent  = stats.played;
    document.getElementById('statWinPct').textContent  = stats.played
        ? Math.round((stats.won / stats.played) * 100) : 0;
    document.getElementById('statStreak').textContent    = stats.currentStreak;
    document.getElementById('statMaxStreak').textContent = stats.maxStreak;

    const maxVal = Math.max(1, ...stats.distribution);
    const barsDiv = document.getElementById('statsBars');
    barsDiv.innerHTML = '';
    const lastGuess = gameOver && guessHistory.length > 0 ? guessHistory.length : -1;

    stats.distribution.forEach((count, i) => {
        const row = document.createElement('div');
        row.classList.add('dist-row');
        row.innerHTML = `<span class="dist-num">${i + 1}</span>`;
        const wrap = document.createElement('div');
        wrap.classList.add('dist-bar-wrap');
        const bar = document.createElement('div');
        bar.classList.add('dist-bar');
        if (i + 1 === lastGuess) bar.classList.add('highlight');
        bar.style.width = `${Math.max(6, Math.round((count / maxVal) * 100))}%`;
        bar.textContent = count;
        wrap.appendChild(bar);
        row.appendChild(wrap);
        barsDiv.appendChild(row);
    });

    document.getElementById('statsModal').classList.add('open');
}

function closeStats() {
    document.getElementById('statsModal').classList.remove('open');
}

function closeStatsOnOverlay(e) {
    if (e.target === document.getElementById('statsModal')) closeStats();
}
