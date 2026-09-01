const MAX_ATTEMPTS = 4;
const CORRECT_THRESHOLD = 1.0; // within 1 u counts as correct

let targetElement = null;
let attemptsLeft = MAX_ATTEMPTS;
let lastDirection = '';
let lastWarmth = '▫️▫️▫️▫️▫️';
let massGuesses = [];

function formatDailyDate(isoDate) {
    if (typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts;
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
}

function getTodayShareDate() {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getGameDate() {
    return localStorage.getItem('elementle-gameDate') || getTodayShareDate();
}

function saveBonus2Progress(completed = false, won = false) {
    if (!window.GameProgress) return;
    GameProgress.save(getGameDate(), 'bonus2', {
        guesses: massGuesses,
        attemptsLeft,
        completed: !!completed,
        won: !!won
    });
}

function restoreBonus2Progress() {
    const saved = window.GameProgress?.get(getGameDate(), 'bonus2');
    if (!saved || !Array.isArray(saved.guesses) || saved.guesses.some(guess => typeof guess !== 'number' || !Number.isFinite(guess))) return;

    saved.guesses.forEach(guess => {
        const diff = Math.abs(guess - targetElement.AtomicMass);
        const correct = diff <= CORRECT_THRESHOLD;
        const warmCount = [100, 50, 20, 10, 3].filter(t => diff < t).length;
        lastWarmth = '🔥'.repeat(warmCount) + '▫️'.repeat(5 - warmCount);
        lastDirection = correct ? '✓ correct' : (guess < targetElement.AtomicMass ? '↑ too low' : '↓ too high');
        massGuesses.push(guess);
        addGuessRow(guess, diff, correct);
    });
    attemptsLeft = Math.max(0, MAX_ATTEMPTS - massGuesses.length);
    updateAttemptsDisplay();
    if (saved.completed) endGame(saved.won, true);
}

function syncShareDate(dateStr) {
    if (!dateStr) return;
    localStorage.setItem('elementle-gameDate', dateStr);
    try {
        const stored = JSON.parse(localStorage.getItem('elementle-share-progress'));
        if (!stored || stored.date !== dateStr) {
            localStorage.setItem('elementle-share-progress', JSON.stringify({ date: dateStr }));
        }
    } catch (e) {
        localStorage.setItem('elementle-share-progress', JSON.stringify({ date: dateStr }));
    }
}

document.addEventListener('DOMContentLoaded', main);

async function main() {
    let storedName = localStorage.getItem('selectedElement');

    try {
        const resp = await fetch('../data/daily_element.json');
        const daily = await resp.json();
        syncShareDate(formatDailyDate(daily.date) || getTodayShareDate());
        if (daily.element) {
            storedName = daily.element;
        } else {
            storedName = null;
        }
    } catch (e) {
        console.error('Failed to fetch daily element:', e);
    }

    if (!storedName) { showNoElement(); return; }

    try {
        const resp = await fetch('../data/elements_simple.json');
        const data = await resp.json();
        targetElement = data.find(el => el.Element.toLowerCase() === storedName.toLowerCase());
    } catch (e) {
        console.error('Failed to load element data:', e);
        return;
    }

    if (!targetElement) { showNoElement(); return; }

    renderElementCard();
    restoreBonus2Progress();
    document.getElementById('guessForm').addEventListener('submit', handleGuess);
}

function renderElementCard() {
    document.getElementById('cardNumber').textContent = targetElement.AtomicNumber;
    document.getElementById('cardSymbol').textContent = targetElement.Symbol;
    document.getElementById('cardName').textContent   = targetElement.Element;
    // mass stays "? u" until game ends
}

function handleGuess(e) {
    e.preventDefault();
    const input = document.getElementById('guessInput');
    const raw   = parseFloat(input.value);

    if (isNaN(raw) || raw <= 0) {
        setError('Please enter a valid positive number.');
        return;
    }
    setError('');

    const diff    = Math.abs(raw - targetElement.AtomicMass);
    const correct = diff <= CORRECT_THRESHOLD;
    const warmCount = [100, 50, 20, 10, 3].filter(t => diff < t).length;
    lastWarmth = '🔥'.repeat(warmCount) + '▫️'.repeat(5 - warmCount);
    lastDirection = correct ? '✓ correct' : (raw < targetElement.AtomicMass ? '↑ too low' : '↓ too high');

    addGuessRow(raw, diff, correct);
    massGuesses.push(raw);
    attemptsLeft--;
    updateAttemptsDisplay();
    const completed = correct || attemptsLeft === 0;
    updateBonus2ShareProgress(correct, completed);
    saveBonus2Progress(completed, correct);
    input.value = '';

    if (correct)              endGame(true);
    else if (attemptsLeft === 0) endGame(false);
}

function addGuessRow(guess, diff, correct) {
    const tbody = document.querySelector('#guessTable tbody');
    const row   = tbody.insertRow();

    // Guess value
    row.insertCell(0).textContent = Number.isInteger(guess) ? guess.toFixed(1) : String(guess);

    // Direction
    const tdDir = row.insertCell(1);
    if (correct) {
        tdDir.textContent = '✓ correct';
        tdDir.className   = 'dir-correct';
    } else if (guess < targetElement.AtomicMass) {
        tdDir.textContent = '↑ too low';
        tdDir.className   = 'dir-low';
    } else {
        tdDir.textContent = '↓ too high';
        tdDir.className   = 'dir-high';
    }

    // Warmth boxes — 5 boxes, each lights up when diff < its threshold
    const tdWarm = row.insertCell(2);
    tdWarm.classList.add('warmth-cell');
    [100, 50, 20, 10, 3].forEach(t => {
        const box = document.createElement('span');
        box.classList.add('warmth-box');
        if (diff < t) box.classList.add('hot');
        tdWarm.appendChild(box);
    });
}

function updateAttemptsDisplay() {
    document.getElementById('attemptsLeft').textContent = `Attempts left: ${attemptsLeft}`;
}

function endGame(won) {
    window.ElementleStats?.recordBonus(localStorage, getGameDate(), 'bonus2', won ? 1 : 0);
    document.getElementById('guessForm').style.display = 'none';

    // Reveal the atomic mass on the card
    const massEl = document.getElementById('cardMass');
    massEl.textContent = `${targetElement.AtomicMass} u`;
    massEl.classList.add('revealed');

    const result = document.getElementById('result');
    if (won) {
        result.innerHTML = `
            <p class="result-win">Correct! The atomic mass of ${targetElement.Element} is <strong>${targetElement.AtomicMass}&thinsp;u</strong>.</p>
            <p class="result-sub">One more round to go!</p>
            <a href="bonuspage_3.html" class="btn-home">Next round</a>`;
    } else {
        result.innerHTML = `
            <p class="result-lose">The atomic mass of ${targetElement.Element} is <strong>${targetElement.AtomicMass}&thinsp;u</strong>.</p>
            <p class="result-sub">Want to learn a fun fact about today's element?</p>
            <a href="bonuspage_3.html" class="btn-home">Next round</a>`;
    }

    ElementleShare.showShareControls();
}

function updateBonus2ShareProgress(won, completed) {
    const dateStr = getShareDate();
    const progress = loadShareProgress(dateStr);
    progress.bonus2 = {
        attemptsUsed: MAX_ATTEMPTS - attemptsLeft,
        maxAttempts: MAX_ATTEMPTS,
        won: !!won,
        completed: !!completed,
        lastDirection,
        lastWarmth
    };
    saveShareProgress(progress);
}

// ── Share ─────────────────────────────────────────────────────────────────────

function getShareDate() {
    const fallbackDate = getTodayShareDate();
    return localStorage.getItem('elementle-gameDate') || fallbackDate;
}

function loadShareProgress(dateStr) {
    try {
        const stored = JSON.parse(localStorage.getItem('elementle-share-progress'));
        if (!stored || stored.date !== dateStr) return { date: dateStr };
        return stored;
    } catch (e) {
        return { date: dateStr };
    }
}

function saveShareProgress(progress) {
    localStorage.setItem('elementle-share-progress', JSON.stringify(progress));
}


function setError(msg) {
    document.getElementById('errorMessage').textContent = msg;
}

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
