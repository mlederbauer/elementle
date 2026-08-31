const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildSecretRow,
    buildBonusProgressLines,
    buildShareText
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
