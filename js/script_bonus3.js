let quiz = [];
let answered = 0;
let score = 0;
let questionResults = [];

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

    let targetElement = null;

    try {
        const [elemResp, dailyResp] = await Promise.all([
            fetch('../data/elements_simple.json'),
            fetch('../data/daily_element.json'),
        ]);
        const elemData  = await elemResp.json();
        const dailyData = await dailyResp.json();
        syncShareDate(formatDailyDate(dailyData.date) || getTodayShareDate());

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
    copyTextToClipboard(text).then(() => {
        const toast = document.getElementById('shareToast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }).catch(() => {
        prompt('Copy this to share:', text);
    });
}

function copyTextToClipboard(text) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return fallbackCopyTextToClipboard(text)
        ? Promise.resolve()
        : Promise.reject(new Error('Copy command was unsuccessful'));
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch (e) {
        copied = false;
    }

    document.body.removeChild(textArea);
    return copied;
}

function buildShareText() {
    const MAX_ATTEMPTS = 6;
    const fallbackDate = getTodayShareDate();

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
        '🧪 Play at: https://elementle.ch'
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

function getShareProgress(dateStr) {
    return loadShareProgress(dateStr);
}

function buildBonusProgressLines(progress) {
    const lines = [];

    const neighborGuesses = typeof progress?.bonus1?.attemptsUsed === 'number' ? progress.bonus1.attemptsUsed : 0;
    lines.push(neighborGuesses > 0 ? '🏘️'.repeat(neighborGuesses) : '🏘️0');

    const massGuesses = typeof progress?.bonus2?.attemptsUsed === 'number' ? progress.bonus2.attemptsUsed : 0;
    lines.push(massGuesses > 0 ? '⚖️'.repeat(massGuesses) : '⚖️0');

    let quizSummary = '❓';
    if (Array.isArray(progress?.bonus3?.results) && progress.bonus3.results.length > 0) {
        quizSummary = progress.bonus3.results
            .map(result => (result === true ? '✅' : result === false ? '❌' : '❓'))
            .join('');
    }
    lines.push(`Quiz: ${quizSummary}`);

    return lines;
}

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
