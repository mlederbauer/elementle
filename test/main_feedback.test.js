const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('main feedback and rules do not disclose the secret element name length', () => {
    const script = fs.readFileSync('js/script.js', 'utf8');
    const page = fs.readFileSync('index.html', 'utf8');

    assert.doesNotMatch(script, /appendLengthSign|selectedElement\.length/);
    assert.doesNotMatch(page, /Target name is longer \/ shorter/);
});
