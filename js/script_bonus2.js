const MAX_ATTEMPTS = 6;
const CORRECT_THRESHOLD = 1.0; // within 1 u counts as correct

let targetElement = null;
let attemptsLeft = MAX_ATTEMPTS;
let lastDirection = '';
let lastWarmth = '▫️▫️▫️▫️▫️';

document.addEventListener('DOMContentLoaded', main);

async function main() {
    let storedName = localStorage.getItem('selectedElement');

    try {
        const resp = await fetch('../data/daily_element.json');
        const daily = await resp.json();
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
    attemptsLeft--;
    updateAttemptsDisplay();
    updateBonus2ShareProgress(correct, correct || attemptsLeft === 0);
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

    const progress = getShareProgress(dateStr);
    const bonusLines = buildBonusProgressLines(progress);

    return [
        `Elementle ${dateStr}  ${scoreStr}`,
        '',
        rows,
        '',
        ...bonusLines,
        '',
        '🔬 Play at: https://elementle.ch'
    ].join('\n');
}

function getShareDate() {
    const now = new Date();
    const fallbackDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

function getShareProgress(dateStr) {
    return loadShareProgress(dateStr);
}

function buildBonusProgressLines(progress) {
    const lines = ['🧪 Bonus progress'];

    const bonus1 = progress.bonus1;
    if (bonus1 && typeof bonus1.guessed === 'number' && typeof bonus1.total === 'number') {
        const status = bonus1.completed ? '✅' : '🧭';
        lines.push(`${status} Neighbors: ${bonus1.guessed}/${bonus1.total} found (${bonus1.attemptsUsed}/${bonus1.maxAttempts} guesses)`);
    } else {
        lines.push('🧭 Neighbors: not started');
    }

    const bonus2 = progress.bonus2;
    if (bonus2 && typeof bonus2.attemptsUsed === 'number') {
        const status = bonus2.completed ? (bonus2.won ? '✅' : '❌') : '⚖️';
        const warmth = bonus2.lastWarmth || '▫️▫️▫️▫️▫️';
        const hint = bonus2.lastDirection ? ` ${bonus2.lastDirection}` : '';
        lines.push(`${status} Atomic mass: ${bonus2.attemptsUsed}/${bonus2.maxAttempts} guesses${hint} ${warmth}`.trim());
    } else {
        lines.push('⚖️ Atomic mass: not started');
    }

    const bonus3 = progress.bonus3;
    if (bonus3 && Array.isArray(bonus3.questions) && Array.isArray(bonus3.results)) {
        const total = bonus3.total || bonus3.questions.length;
        const answered = bonus3.answered || bonus3.results.filter(r => r !== null).length;
        const score = bonus3.score || 0;
        lines.push(`❓ Quiz: ${score}/${total} (${answered}/${total} answered)`);
        bonus3.questions.forEach((question, i) => {
            const result = bonus3.results[i];
            const icon = result === true ? '✅' : result === false ? '❌' : '⬜';
            lines.push(`${icon} Q${i + 1}: ${question}`);
        });
    } else {
        lines.push('❓ Quiz: not started');
    }

    return lines;
}

function setError(msg) {
    document.getElementById('errorMessage').textContent = msg;
}

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
