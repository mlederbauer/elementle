const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {
    buildSecretRow,
    buildBonusProgressLines,
    buildShareText,
    getShareProgress,
    saveMainShareState,
    getMainShareState,
    getCurrentStreak
} = require('../js/share.js');

const dateStr = '31/08/2026';
const history = [
    ['green', 'yellow', 'grey'],
    ['grey', 'green']
];

function shareText(overrides = {}) {
    return buildShareText({
        dateStr,
        history,
        won: true,
        secretRows: ['🟩🟩⬛⬛⬛', '🟩⬛⬛⬛⬛'],
        progress: {},
        ...overrides
    });
}

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); }
    };
}

function createShareWindow(overrides = {}) {
    const storage = createStorage();
    const toast = { style: {} };
    const calls = { appended: 0, removed: 0, timeouts: [], prompts: [] };
    const window = {
        localStorage: storage,
        navigator: {},
        isSecureContext: true,
        document: {
            getElementById(id) {
                assert.equal(id, 'shareToast');
                return toast;
            },
            createElement() {
                return {
                    style: {},
                    setAttribute() {},
                    select() {},
                    setSelectionRange() {}
                };
            },
            body: {
                appendChild() { calls.appended += 1; },
                removeChild() { calls.removed += 1; }
            },
            execCommand() { return false; }
        },
        setTimeout(callback, delay) { calls.timeouts.push({ callback, delay }); },
        prompt(...args) { calls.prompts.push(args); },
        ...overrides
    };
    const context = vm.createContext({ window });
    vm.runInContext(fs.readFileSync('js/share.js', 'utf8'), context);
    return { api: window.ElementleShare, storage, toast, calls };
}

function saveShareState(api, storage) {
    storage.setItem('elementle-gameDate', dateStr);
    api.saveMainShareState(storage, dateStr, {
        history,
        won: true,
        secretRows: ['🟩🟩⬛⬛⬛', '🟩⬛⬛⬛⬛']
    });
}

test('secret rows use the on-screen green thresholds and always contain five squares', () => {
    const selected = { Period: 1, Group: 1 };

    assert.equal(buildSecretRow({ Period: 1, Group: 1 }, selected), '🟩🟩🟩🟩🟩');
    assert.equal(buildSecretRow({ Period: 1, Group: 6 }, selected), '🟩🟩🟩🟩⬛');
    assert.equal(buildSecretRow({ Period: 1, Group: 11 }, selected), '🟩🟩🟩⬛⬛');
    assert.equal(buildSecretRow({ Period: 1, Group: 16 }, selected), '🟩🟩⬛⬛⬛');
    assert.equal(buildSecretRow({ Period: 1, Group: 21 }, selected), '🟩⬛⬛⬛⬛');
    assert.equal(buildSecretRow({ Period: 1, Group: 22 }, selected), '⬛⬛⬛⬛⬛');
});

test('default share text hides letter feedback and normalizes each row to five green or black squares', () => {
    const text = shareText({ secretRows: ['🟩🟨', '🟩'] });

    assert.match(text, /Elementle 31\/08\/2026  2\/6/);
    assert.match(text, /🟩⬛⬛⬛⬛\n🟩⬛⬛⬛⬛/);
    assert.doesNotMatch(text, /🟨/);
    assert.doesNotMatch(text, /🟩🟨⬛/);
});

test('default sharing provides fixed black rows when persisted secret rows are unavailable', () => {
    const text = shareText({ secretRows: undefined });

    assert.match(text, /⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛/);
});

test('transparent sharing retains existing detailed letter rows', () => {
    const text = shareText({ mode: 'transparent' });

    assert.match(text, /🟩🟨⬛\n⬛🟩/);
});

test('lost and empty games retain their score semantics', () => {
    assert.match(shareText({ won: false }), /Elementle 31\/08\/2026  X\/6/);
    assert.match(shareText({ history: [], won: true, secretRows: [] }), /Elementle 31\/08\/2026  0\/6/);
});

test('share text includes a current streak flame and safely defaults invalid values', () => {
    assert.match(shareText({ streak: 4 }), /🔥 4/);
    assert.match(shareText({ streak: -1 }), /🔥 0/);
    assert.match(shareText({ streak: 1.5 }), /🔥 0/);
});

test('current streak reads browser-local stats and tolerates malformed data', () => {
    const storage = createStorage({ 'elementle-stats': JSON.stringify({ currentStreak: 6 }) });
    assert.equal(getCurrentStreak(storage), 6);

    storage.setItem('elementle-stats', '{bad json');
    assert.equal(getCurrentStreak(storage), 0);
});

test('bonus progress emojis are preserved in both modes', () => {
    const progress = {
        bonus1: { guessed: 2 },
        bonus2: { won: true },
        bonus3: {
            types: ['density', 'discovery_year', 'melting_point'],
            results: [true, false, true]
        }
    };

    assert.deepEqual(buildBonusProgressLines(progress), ['🏘️🏘️', '⚖️', '🧱🌡️']);
    assert.match(shareText({ progress }), /🏘️🏘️\n⚖️\n🧱🌡️/);
    assert.match(shareText({ progress, mode: 'transparent' }), /🏘️🏘️\n⚖️\n🧱🌡️/);
});

test('main share state is available only for the date it was saved', () => {
    const storage = createStorage();
    saveMainShareState(storage, '30/08/2026', {
        history,
        won: true,
        secretRows: ['🟩🟩⬛⬛⬛', '🟩⬛⬛⬛⬛']
    });

    assert.deepEqual(getMainShareState(getShareProgress(storage, '30/08/2026')), {
        history,
        won: true,
        secretRows: ['🟩🟩⬛⬛⬛', '🟩⬛⬛⬛⬛']
    });
    assert.deepEqual(getMainShareState(getShareProgress(storage, '31/08/2026')), {
        history: [],
        won: false,
        secretRows: []
    });
});

test('share result opens the native share sheet with the generated text when available', async () => {
    const shared = [];
    const copied = [];
    const { api, storage, toast, calls } = createShareWindow({
        navigator: {
            share(data) {
                shared.push(data);
                return Promise.resolve();
            },
            clipboard: {
                writeText(text) {
                    copied.push(text);
                    return Promise.resolve();
                }
            }
        }
    });
    saveShareState(api, storage);

    await api.shareResult();

    assert.equal(shared.length, 1);
    assert.equal(shared[0].text, shareText());
    assert.deepEqual(copied, []);
    assert.equal(toast.style.display, undefined);
    assert.deepEqual(calls.prompts, []);
});

test('cancelling the native share sheet does not show copied feedback', async () => {
    const { api, storage, toast, calls } = createShareWindow({
        navigator: {
            share() {
                return Promise.reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
            }
        }
    });
    saveShareState(api, storage);

    await api.shareResult();

    assert.equal(toast.style.display, undefined);
    assert.deepEqual(calls.prompts, []);
    assert.deepEqual(calls.timeouts, []);
});

test('share result keeps clipboard copying and copied feedback when native sharing is unavailable', async () => {
    const copied = [];
    const { api, storage, toast, calls } = createShareWindow({
        navigator: {
            clipboard: {
                writeText(text) {
                    copied.push(text);
                    return Promise.resolve();
                }
            }
        }
    });
    saveShareState(api, storage);

    await api.shareResult();

    assert.deepEqual(copied, [shareText()]);
    assert.equal(toast.style.display, 'block');
    assert.deepEqual(calls.timeouts.map(({ delay }) => delay), [2000]);
    assert.deepEqual(calls.prompts, []);
});

test('share result keeps the prompt fallback when clipboard copying fails', async () => {
    const { api, storage, calls } = createShareWindow({ isSecureContext: false });
    saveShareState(api, storage);

    await api.shareResult();

    assert.equal(calls.appended, 1);
    assert.equal(calls.removed, 1);
    assert.deepEqual(calls.prompts, [['Copy this to share:', shareText()]]);
});

test('Bonus Round 3 saves trivia progress when initializing and answering', () => {
    const storage = createStorage();
    storage.setItem('elementle-gameDate', dateStr);
    const context = vm.createContext({
        console,
        localStorage: storage,
        window: { GameProgress: { get() { return null; }, save() {} } },
        document: { addEventListener() {} }
    });
    vm.runInContext(fs.readFileSync('js/script_bonus3.js', 'utf8'), context);
    const progress = vm.runInContext(`
        quiz = [
            { question: 'Q1', type: 'density', correct: 'yes', options: [] },
            { question: 'Q2', type: 'melting_point', correct: 'no', options: [] }
        ];
        answered = 2;
        score = 1;
        questionResults = [true, false];
        updateBonus3ShareProgress();
        JSON.parse(localStorage.getItem('elementle-share-progress')).bonus3;
    `, context);

    assert.deepEqual(JSON.parse(JSON.stringify(progress)), {
        answered: 2,
        total: 2,
        score: 1,
        completed: true,
        questions: ['Q1', 'Q2'],
        types: ['density', 'melting_point'],
        results: [true, false]
    });
});
