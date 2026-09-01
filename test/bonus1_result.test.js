const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('failed neighbors result separates its message from the next-round control', () => {
    const source = fs.readFileSync('js/script_bonus1.js', 'utf8');
    assert.match(source, /class='bonus-result-message'/);
    assert.match(source, /<div id='nextBonusPage'>/);
});
