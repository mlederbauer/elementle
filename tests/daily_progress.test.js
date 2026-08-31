import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = path => readFileSync(resolve(root, path), 'utf8');
const elements = [
    { Element: 'Hydrogen', Symbol: 'H', AtomicNumber: 1, AtomicMass: 1.008, Period: 1, Group: 1 },
    { Element: 'Helium', Symbol: 'He', AtomicNumber: 2, AtomicMass: 4.003, Period: 1, Group: 2 },
    { Element: 'Lithium', Symbol: 'Li', AtomicNumber: 3, AtomicMass: 6.94, Period: 2, Group: 1 },
];
const daily = { date: '2026-08-31', element: 'Hydrogen' };

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function boot(page, script, dailyData = daily, previousStorage = {}) {
    const dom = new JSDOM(source(page), {
        url: `https://elementle.test/${page}`,
        runScripts: 'outside-only',
    });
    const { window } = dom;
    Object.entries(previousStorage).forEach(([key, value]) => window.localStorage.setItem(key, value));
    window.fetch = vi.fn(async url => ({
        json: async () => String(url).includes('daily_element') ? dailyData : elements,
    }));
    window.eval(source('js/game_progress.js'));
    window.eval(source(script));
    await tick();
    await tick();
    return dom;
}

const savedStorage = window => Object.fromEntries(
    Array.from({ length: window.localStorage.length }, (_, index) => {
        const key = window.localStorage.key(index);
        return [key, window.localStorage.getItem(key)];
    })
);

describe('date-scoped daily progress', () => {
    it('returns no progress for a different daily date', async () => {
        const dom = await boot('index.html', 'js/script.js');
        dom.window.GameProgress.save('31/08/2026', 'main', { guesses: ['Helium'] });
        expect(dom.window.GameProgress.get('31/08/2026', 'main')).toEqual({ guesses: ['Helium'] });
        expect(dom.window.GameProgress.get('01/09/2026', 'main')).toBeNull();
        dom.window.localStorage.setItem('elementle-daily-progress-v1', '{not json');
        expect(dom.window.GameProgress.get('31/08/2026', 'main')).toBeNull();
    });

    it('saves and restores an active main-game guess', async () => {
        const first = await boot('index.html', 'js/script.js');
        first.window.document.getElementById('guessInput').value = 'Helium';
        first.window.checkGuess();
        expect(first.window.GameProgress.get('31/08/2026', 'main')).toMatchObject({
            guesses: ['Helium'], attempts: 5, completed: false,
        });

        const restored = await boot('index.html', 'js/script.js', daily, savedStorage(first.window));
        expect(restored.window.document.querySelectorAll('.wordDiv')).toHaveLength(1);
        expect(restored.window.document.getElementById('attempts').textContent).toBe('Attempts left: 5');
        expect(restored.window.document.getElementById('guessInput').disabled).toBe(false);
    });

    it('restores bonus round one guesses and revealed neighbors', async () => {
        const first = await boot('bonus/bonuspage_1.html', 'js/script_bonus1.js');
        first.window.document.getElementById('guessInput').value = 'Helium';
        first.window.document.getElementById('guessForm').dispatchEvent(new first.window.Event('submit', { bubbles: true, cancelable: true }));
        expect(first.window.GameProgress.get('31/08/2026', 'bonus1').guesses).toEqual(['Helium']);

        const restored = await boot('bonus/bonuspage_1.html', 'js/script_bonus1.js', daily, savedStorage(first.window));
        expect(restored.window.document.querySelectorAll('#guessTable tbody tr')).toHaveLength(1);
        expect(restored.window.document.getElementById('neighbor-right').classList).toContain('elementBox');
    });

    it('restores a completed atomic-mass round without re-enabling its form', async () => {
        const first = await boot('bonus/bonuspage_2.html', 'js/script_bonus2.js');
        first.window.document.getElementById('guessInput').value = '1';
        first.window.document.getElementById('guessForm').dispatchEvent(new first.window.Event('submit', { bubbles: true, cancelable: true }));
        expect(first.window.GameProgress.get('31/08/2026', 'bonus2')).toMatchObject({ completed: true, won: true });

        const restored = await boot('bonus/bonuspage_2.html', 'js/script_bonus2.js', daily, savedStorage(first.window));
        expect(restored.window.document.querySelectorAll('#guessTable tbody tr')).toHaveLength(1);
        expect(restored.window.document.getElementById('guessForm').style.display).toBe('none');
    });

    it('restores answered trivia options and the completed trivia result', async () => {
        const triviaDaily = {
            ...daily,
            quiz: [{
                question: 'Which is correct?',
                correct: '1',
                options: [
                    { text: '1', element: 'Hydrogen' }, { text: '2', element: 'Helium' },
                    { text: '3', element: 'Lithium' }, { text: '4', element: 'Helium' },
                ],
            }],
        };
        const first = await boot('bonus/bonuspage_3.html', 'js/script_bonus3.js', triviaDaily);
        first.window.document.querySelector('.option-btn').click();
        expect(first.window.GameProgress.get('31/08/2026', 'bonus3')).toMatchObject({ answers: ['1'], completed: true });

        const restored = await boot('bonus/bonuspage_3.html', 'js/script_bonus3.js', triviaDaily, savedStorage(first.window));
        expect(restored.window.document.querySelector('.option-btn').disabled).toBe(true);
        expect(restored.window.document.getElementById('result').textContent).toContain('1/1 correct');
    });
});
