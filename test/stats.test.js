const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const stats = require('../js/stats.js');

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); }
    };
}

test('normalizes older main-game statistics without losing their values', () => {
    const storage = createStorage({
        'elementle-stats': JSON.stringify({
            played: 7,
            won: 5,
            currentStreak: 3,
            maxStreak: 4,
            distribution: [1, 2, 1, 1, 0, 0]
        })
    });

    assert.deepEqual(stats.load(storage), {
        played: 7,
        won: 5,
        currentStreak: 3,
        maxStreak: 4,
        distribution: [1, 2, 1, 1, 0, 0],
        bonuses: {
            bonus1: { correct: 0, completed: 0 },
            bonus2: { correct: 0, completed: 0 },
            bonus3: { correct: 0, completed: 0 }
        },
        recordedBonusDays: {}
    });
});

test('records main wins, losses, streaks, and guess distribution locally', () => {
    const storage = createStorage();

    stats.recordMain(storage, true, 2);
    stats.recordMain(storage, true, 6);
    const afterLoss = stats.recordMain(storage, false, 6);

    assert.deepEqual(afterLoss.distribution, [0, 1, 0, 0, 0, 1]);
    assert.equal(afterLoss.played, 3);
    assert.equal(afterLoss.won, 2);
    assert.equal(afterLoss.currentStreak, 0);
    assert.equal(afterLoss.maxStreak, 2);
});

test('records each completed bonus round only once for a date', () => {
    const storage = createStorage();

    stats.recordBonus(storage, '01/09/2026', 'bonus1', 3);
    stats.recordBonus(storage, '01/09/2026', 'bonus1', 3);
    stats.recordBonus(storage, '01/09/2026', 'bonus2', 1);
    stats.recordBonus(storage, '02/09/2026', 'bonus1', 2);

    const loaded = stats.load(storage);
    assert.deepEqual(loaded.bonuses, {
        bonus1: { correct: 5, completed: 2 },
        bonus2: { correct: 1, completed: 1 },
        bonus3: { correct: 0, completed: 0 }
    });
});

test('ignores invalid bonus round and result values', () => {
    const storage = createStorage();

    stats.recordBonus(storage, '01/09/2026', 'unknown', 4);
    stats.recordBonus(storage, '', 'bonus1', 4);
    stats.recordBonus(storage, '01/09/2026', 'bonus3', -1);

    assert.deepEqual(stats.load(storage).bonuses, {
        bonus1: { correct: 0, completed: 0 },
        bonus2: { correct: 0, completed: 0 },
        bonus3: { correct: 0, completed: 1 }
    });
});

function createElement() {
    const classes = new Set();
    return {
        textContent: '',
        innerHTML: '',
        style: {},
        children: [],
        classList: {
            add(...names) { names.forEach(name => classes.add(name)); },
            contains(name) { return classes.has(name); }
        },
        appendChild(child) { this.children.push(child); return child; },
        append(...children) { children.forEach(child => this.appendChild(child)); }
    };
}

function createMainGameContext(storage, savedProgress) {
    const elements = Object.fromEntries([
        'guessInput', 'guessButton', 'statPlayed', 'statWinPct', 'statStreak',
        'statMaxStreak', 'statsBars', 'bonusStats', 'statsModal', 'attempts'
    ].map(id => [id, createElement()]));
    const context = vm.createContext({
        console,
        localStorage: storage,
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || (elements[id] = createElement()); },
            createElement
        },
        window: {
            ElementleStats: stats,
            GameProgress: { get() { return savedProgress || null; }, save() {} }
        },
        ElementleShare: { showShareControls() {} }
    });
    vm.runInContext(fs.readFileSync('js/script.js', 'utf8'), context);
    vm.runInContext(`
        disableGuessInput = () => {};
        saveGameResultToLocalStorage = () => {};
        showBonusPageIcon = () => {};
        saveMainProgress = () => {};
        displayMessage = () => {};
    `, context);
    return { context, elements };
}

test('a new main-game completion opens the modal and renders bonus totals', () => {
    const storage = createStorage();
    stats.recordBonus(storage, '01/09/2026', 'bonus1', 2);
    const { context, elements } = createMainGameContext(storage);

    vm.runInContext('endGame(true, 2);', context);

    assert.equal(elements.statsModal.classList.contains('open'), true);
    assert.equal(elements.statPlayed.textContent, 1);
    assert.equal(elements.statStreak.textContent, 1);
    assert.equal(elements.statsBars.children.length, 6);
    assert.equal(elements.bonusStats.children.length, 3);
    assert.equal(elements.bonusStats.children[0].children[1].textContent, '2 correct · 1 completed');
});

test('restoring a completed main game neither records statistics nor opens the modal', () => {
    const storage = createStorage();
    const { context, elements } = createMainGameContext(storage, {
        guesses: [], attempts: 6, completed: true, won: true
    });

    vm.runInContext("restoreMainProgress('01/09/2026');", context);

    assert.equal(stats.load(storage).played, 0);
    assert.equal(elements.statsModal.classList.contains('open'), false);
});
