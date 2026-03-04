const MAX_ATTEMPTS = 6;
const CORRECT_THRESHOLD = 1.0; // within 1 u counts as correct

let targetElement = null;
let attemptsLeft = MAX_ATTEMPTS;

document.addEventListener('DOMContentLoaded', main);

async function main() {
    const storedName = localStorage.getItem('selectedElement');
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

    addGuessRow(raw, diff, correct);
    attemptsLeft--;
    updateAttemptsDisplay();
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
            <a href="bonuspage_3.html" class="btn-home">Bonus Round 3 →</a>`;
    } else {
        result.innerHTML = `
            <p class="result-lose">The atomic mass of ${targetElement.Element} is <strong>${targetElement.AtomicMass}&thinsp;u</strong>.</p>
            <p class="result-sub">Want to learn a fun fact about today's element?</p>
            <a href="bonuspage_3.html" class="btn-home">Bonus Round 3 →</a>`;
    }

    document.getElementById('shareBtn').style.display = 'inline-block';
}

// ── Share ─────────────────────────────────────────────────────────────────────

function shareResult() {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('shareToast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }).catch(() => {
        prompt('Copy this to share:', text);
    });
}

function buildShareText() {
    const now = new Date();
    const fallbackDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let guessHistory = [];
    let won = false;
    let dateStr = fallbackDate;
    try {
        guessHistory = JSON.parse(localStorage.getItem('elementle-guessHistory')) || [];
        won = JSON.parse(localStorage.getItem('elementle-won')) || false;
        dateStr = localStorage.getItem('elementle-gameDate') || fallbackDate;
    } catch (e) { /* ignore */ }

    const scoreStr = won ? `${guessHistory.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const emojiMap = { green: '🟩', yellow: '🟨', grey: '⬛' };
    const rows = guessHistory.map(colors => colors.map(c => emojiMap[c]).join('')).join('\n');

    return [
        `Elementle ${dateStr}  ${scoreStr}`,
        '',
        rows,
        '',
        '🔬 Play at: https://mlederbauer.github.io/elementle/'
    ].join('\n');
}

function setError(msg) {
    document.getElementById('errorMessage').textContent = msg;
}

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
