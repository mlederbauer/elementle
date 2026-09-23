const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadAnalytics(stored = {}, played = 0) {
    const listeners = {};
    const scripts = [];
    const ctx = {
        localStorage: {
            getItem: key => (key in stored ? stored[key] : null),
            setItem: (key, value) => { stored[key] = String(value); }
        },
        ElementleStats: { load: () => ({ played }) },
        document: {
            addEventListener: (name, fn) => { listeners[name] = fn; },
            createElement: tag => ({
                tag, dataset: {},
                addEventListener(name, fn) { this['on' + name] = fn; }
            }),
            head: { appendChild: el => { if (el.tag === 'script') scripts.push(el); } }
        }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync('js/analytics.js', 'utf8'), ctx);
    return { ctx, stored, scripts, ready: () => listeners.DOMContentLoaded?.() };
}

function counting(ctx) {
    const counted = [];
    ctx.goatcounter = { count: opts => counted.push(opts.path) };
    return counted;
}

test('the counting script points at our GoatCounter endpoint', () => {
    const { scripts, ready } = loadAnalytics();
    ready();
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, '//gc.zgo.at/count.js');
    assert.equal(scripts[0].dataset.goatcounter, 'https://elementle.goatcounter.com/count');
});

test('every step is reported against the visitor cohort, giving a joint distribution', () => {
    const { ctx, scripts, ready } = loadAnalytics({}, 12);
    ready();
    const counted = counting(ctx);
    scripts[0].onload();
    ctx.Analytics.trackOnce('main-won');
    ctx.Analytics.trackOnce('bonus-1');
    assert.deepEqual(counted, ['ret-7-30/visit', 'ret-7-30/main-won', 'ret-7-30/bonus-1']);
});

test('play frequency is bucketed, never an identifier', () => {
    const { ctx } = loadAnalytics();
    assert.equal(ctx.Analytics.cohortFor(0), 'new');
    assert.equal(ctx.Analytics.cohortFor(5), 'ret-2-6');
    assert.equal(ctx.Analytics.cohortFor(6), 'ret-7-30');
    assert.equal(ctx.Analytics.cohortFor(200), 'ret-31plus');
});

test('finishing the main game does not move a player into the next cohort mid-day', () => {
    const stored = {};
    let played = 0;
    const first = loadAnalytics(stored, played);
    const counted = counting(first.ctx);
    first.ctx.Analytics.trackOnce('visit');
    played = 1;  // the main game was won and recorded

    const bonusPage = loadAnalytics(stored, played);   // a fresh page load, same day
    bonusPage.ctx.goatcounter = { count: opts => counted.push(opts.path) };
    bonusPage.ctx.Analytics.trackOnce('bonus-1');
    assert.deepEqual(counted, ['new/visit', 'new/bonus-1']);
});

test('a reloaded result screen does not report the step twice', () => {
    const { ctx } = loadAnalytics();
    const counted = counting(ctx);
    ctx.Analytics.trackOnce('bonus-1');
    ctx.Analytics.trackOnce('bonus-1');
    ctx.Analytics.trackOnce('bonus-2');
    assert.deepEqual(counted, ['new/bonus-1', 'new/bonus-2']);
});

test('de-duplication resets on a new day', () => {
    const stored = { 'elementle-analytics-day': JSON.stringify({ date: '2020-01-01', cohort: 'new', steps: { 'main-won': true } }) };
    const { ctx } = loadAnalytics(stored, 3);
    const counted = counting(ctx);
    ctx.Analytics.trackOnce('main-won');
    assert.deepEqual(counted, ['ret-2-6/main-won']);
});

test('a step fired before the counting script loads is retried, not lost', () => {
    const stored = {};
    const first = loadAnalytics(stored);
    first.ctx.Analytics.trackOnce('bonus-1');        // goatcounter not loaded yet

    const second = loadAnalytics(stored);            // next page load, script ready
    const counted = counting(second.ctx);
    second.ctx.Analytics.trackOnce('bonus-1');
    assert.deepEqual(counted, ['new/bonus-1']);
});

test('counting survives a browser that blocks local storage', () => {
    const { ctx } = loadAnalytics();
    const counted = counting(ctx);
    ctx.localStorage.getItem = () => { throw new Error('blocked'); };
    ctx.localStorage.setItem = () => { throw new Error('blocked'); };
    ctx.Analytics.trackOnce('share');
    assert.deepEqual(counted, ['new/share']);
});
