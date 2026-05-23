let quiz = [];
let answered = 0;
let score = 0;
let questionResults = [];

document.addEventListener('DOMContentLoaded', main);

async function main() {
    let storedName = localStorage.getItem('selectedElement');

    let targetElement = null;

    try {
        const [elemResp, dailyResp] = await Promise.all([
            fetch('../data/elements_simple.json'),
            fetch('../data/daily_element.json'),
        ]);
        const elemData  = await elemResp.json();
        const dailyData = await dailyResp.json();

        // Always use daily_element.json as the authoritative source
        if (dailyData.element) {
            storedName = dailyData.element;
            quiz = dailyData.quiz || [];
        } else {
            storedName = null;
        }

        if (storedName) {
            targetElement = elemData.find(
                el => el.Element.toLowerCase() === storedName.toLowerCase()
            );
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }

    if (!targetElement) { showNoElement(); return; }

    document.getElementById('cardNumber').textContent = targetElement.AtomicNumber;
    document.getElementById('cardSymbol').textContent = targetElement.Symbol;
    document.getElementById('cardName').textContent   = targetElement.Element;

    if (quiz.length === 0) {
        document.getElementById('quiz').innerHTML =
            '<p class="no-quiz">Quiz not available yet — check back after the daily update.</p>';
        return;
    }

    renderQuiz();
}

function renderQuiz() {
    const container = document.getElementById('quiz');
    questionResults = quiz.map(() => null);
    updateBonus3ShareProgress();
    quiz.forEach((q, qi) => {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.innerHTML = `<p class="question-text"><span class="q-num">Q${qi + 1}</span>${q.question}</p>`;

        const grid = document.createElement('div');
        grid.className = 'options-grid';

        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="opt-text">${opt.text}</span>`;
            btn.dataset.text    = opt.text;
            btn.dataset.element = opt.element;
            btn.addEventListener('click', () => handleAnswer(qi, opt.text, grid, q));
            grid.appendChild(btn);
        });

        block.appendChild(grid);
        container.appendChild(block);
    });
}

function handleAnswer(qi, chosen, grid, q) {
    // Disable all buttons in this question
    grid.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;

        const isChosen  = btn.dataset.text === chosen;
        const isCorrect = btn.dataset.text === q.correct;
        const elemName  = btn.dataset.element;

        // Add element-name label to every button on reveal
        const label = document.createElement('span');
        label.className = 'opt-element';

        if (isCorrect) {
            btn.classList.add('opt-correct');
            label.textContent = elemName + ' ✓';
        } else {
            btn.classList.add('opt-dim');
            label.textContent = elemName;
            if (isChosen) {
                btn.classList.add('opt-wrong');
                label.textContent = elemName + ' ✗';
            }
        }

        btn.appendChild(label);
    });

    if (chosen === q.correct) score++;
    questionResults[qi] = chosen === q.correct;
    answered++;
    updateBonus3ShareProgress();

    if (answered === quiz.length) showResult();
}

function showResult() {
    const result = document.getElementById('result');
    const partialMsgs = [
        'Better luck tomorrow!',
        'One right — keep going!',
        'Two out of three — not bad!',
        'So close!',
    ];
    const msg = score === quiz.length
        ? 'Perfect score! You know your elements.'
        : (partialMsgs[score] ?? `${score} right — keep going!`);
    const colorClass = score === quiz.length ? 'result-win' : score >= 1 ? 'result-mid' : 'result-lose';
    result.innerHTML = `
        <p class="${colorClass}">${score}/${quiz.length} correct — ${msg}</p>
        <p class="result-sub">Come back tomorrow for a new element.</p>
        <a href="../index.html" class="btn-home">Back to main game</a>`;

    document.getElementById('shareBtn').style.display = 'inline-block';
}

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
    const MAX_ATTEMPTS = 6;
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

function updateBonus3ShareProgress() {
    const dateStr = getShareDate();
    const progress = loadShareProgress(dateStr);
    progress.bonus3 = {
        answered,
        total: quiz.length,
        score,
        completed: answered === quiz.length && quiz.length > 0,
        questions: quiz.map(q => q.question),
        results: questionResults
    };
    saveShareProgress(progress);
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
        const answeredCount = bonus3.answered || bonus3.results.filter(r => r !== null).length;
        const scoreCount = bonus3.score || 0;
        lines.push(`❓ Quiz: ${scoreCount}/${total} (${answeredCount}/${total} answered)`);
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

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
