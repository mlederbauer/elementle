let quiz = [];
let answered = 0;
let score = 0;

document.addEventListener('DOMContentLoaded', main);

async function main() {
    const now = new Date();
    const todayStr = now.getUTCFullYear() + '-' +
        String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(now.getUTCDate()).padStart(2, '0');

    let storedName = localStorage.getItem('selectedElement');
    const storedDate = localStorage.getItem('selectedElementDate');

    let targetElement = null;

    try {
        const [elemResp, dailyResp] = await Promise.all([
            fetch('../data/elements_simple.json'),
            fetch('../data/daily_element.json'),
        ]);
        const elemData  = await elemResp.json();
        const dailyData = await dailyResp.json();

        // Always use today's element from daily_element.json when dates match
        if (dailyData.date === todayStr && dailyData.element) {
            storedName = dailyData.element;
        } else if (storedDate && storedDate !== todayStr) {
            // localStorage has an explicit stale date — clear it so quiz is not mismatched
            storedName = null;
        }

        if (storedName) {
            targetElement = elemData.find(
                el => el.Element.toLowerCase() === storedName.toLowerCase()
            );
        }
        quiz = dailyData.quiz || [];
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
    answered++;

    if (answered === quiz.length) showResult();
}

function showResult() {
    const result = document.getElementById('result');
    const msgs = [
        'Better luck tomorrow!',
        'One right — keep going!',
        'Two out of three — not bad!',
        'Perfect score! You know your elements.',
    ];
    const colorClass = score === quiz.length ? 'result-win' : score >= 1 ? 'result-mid' : 'result-lose';
    result.innerHTML = `
        <p class="${colorClass}">${score}/${quiz.length} correct — ${msgs[score]}</p>
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

    const bonusScore = `Bonus: ${score}/${quiz.length}`;

    return [
        `Elementle ${dateStr}  ${scoreStr}  ${bonusScore}`,
        '',
        rows,
        '',
        '🔬 Play at: https://mlederbauer.github.io/elementle/'
    ].join('\n');
}

function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
