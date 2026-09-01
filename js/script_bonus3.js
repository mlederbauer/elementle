let quiz = [];
let answered = 0;
let score = 0;
let questionResults = [];
let selectedAnswers = [];

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

function saveBonus3Progress() {
    if (!window.GameProgress) return;
    GameProgress.save(getGameDate(), 'bonus3', {
        answers: selectedAnswers,
        completed: answered === quiz.length && quiz.length > 0
    });
}

function restoreBonus3Progress() {
    const saved = window.GameProgress?.get(getGameDate(), 'bonus3');
    if (!saved || !Array.isArray(saved.answers) || saved.answers.length !== quiz.length) return;
    if (saved.answers.some((answer, index) => answer !== null && !quiz[index].options.some(option => option.text === answer))) return;
    selectedAnswers = saved.answers;
    questionResults = selectedAnswers.map((answer, index) => answer === null ? null : answer === quiz[index].correct);
    answered = selectedAnswers.filter(answer => answer !== null).length;
    score = questionResults.filter(result => result === true).length;
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

    restoreBonus3Progress();
    renderQuiz();
}

function renderQuiz() {
    const container = document.getElementById('quiz');
    container.innerHTML = '';
    if (selectedAnswers.length !== quiz.length) selectedAnswers = quiz.map(() => null);
    if (questionResults.length !== quiz.length) questionResults = quiz.map(() => null);
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

        if (selectedAnswers[qi] !== null) revealAnswer(grid, selectedAnswers[qi], q);
        block.appendChild(grid);
        container.appendChild(block);
    });
    if (answered === quiz.length) showResult();
}

function revealAnswer(grid, chosen, q) {
    grid.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;

        const isChosen  = btn.dataset.text === chosen;
        const isCorrect = btn.dataset.text === q.correct;
        const elemName  = btn.dataset.element;
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
}

function handleAnswer(qi, chosen, grid, q) {
    if (selectedAnswers[qi] !== null) return;
    revealAnswer(grid, chosen, q);
    selectedAnswers[qi] = chosen;
    if (chosen === q.correct) score++;
    questionResults[qi] = chosen === q.correct;
    answered++;
    updateBonus3ShareProgress();
    saveBonus3Progress();

    if (answered === quiz.length) showResult();
}

function showResult() {
    window.ElementleStats?.recordBonus(localStorage, getGameDate(), 'bonus3', score);
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
        <a href="../index.html?stats=1" class="btn-home">View statistics</a>`;

    ElementleShare.showShareControls(true);
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
        types: quiz.map(q => q.type || null),
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


function showNoElement() {
    document.querySelector('.container').innerHTML = `
        <p style="margin-bottom:16px">No element found — please play the main game first.</p>
        <a href="../index.html" class="btn-home">Go to main game</a>`;
}
