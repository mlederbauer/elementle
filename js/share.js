(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.ElementleShare = api;
})(typeof window !== 'undefined' ? window : null, function () {
    const MAX_ATTEMPTS = 6;
    const SHARE_PROGRESS_KEY = 'elementle-share-progress';
    const GREEN_SQUARE = '🟩';
    const BLACK_SQUARE = '⬛';

    function buildSecretRow(guessedData, selectedData) {
        const distance = Math.abs(guessedData.Period - selectedData.Period)
            + Math.abs(guessedData.Group - selectedData.Group);
        const percentage = Math.max(0, 100 - 4 * distance);
        return Array.from({ length: 5 }, (_, index) =>
            percentage >= (index + 1) * 20 ? GREEN_SQUARE : BLACK_SQUARE
        ).join('');
    }

    function normalizeSecretRow(row) {
        return Array.from(typeof row === 'string' ? row : '')
            .slice(0, 5)
            .map(square => square === GREEN_SQUARE ? GREEN_SQUARE : BLACK_SQUARE)
            .concat(Array(5).fill(BLACK_SQUARE))
            .slice(0, 5)
            .join('');
    }

    function buildBonusProgressLines(progress) {
        const triviaEmoji = {
            recycling_rate: '♻️', price_per_kg: '💰', discovery_year: '📅', abundance_crust: '🪨',
            discoverers: '🧑‍🔬', geochemical_class: '🧪', top_3_producers: '🌍', melting_point: '🌡️',
            boiling_point: '🌡️', density: '🧱', electronegativity_pauling: '⚡', atomic_radius: '📏'
        };
        const neighbors = Number(progress?.bonus1?.guessed) || 0;
        const mass = progress?.bonus2?.won ? 1 : 0;
        const trivia = Array.isArray(progress?.bonus3?.results)
            ? progress.bonus3.results.map((correct, index) =>
                correct ? (triviaEmoji[progress.bonus3.types?.[index]] || '') : '').join('')
            : '';
        return ['🏘️'.repeat(neighbors), '⚖️'.repeat(mass), trivia].filter(Boolean);
    }

    function buildShareText({ dateStr, history, won, secretRows, progress, mode = 'secret' }) {
        const guessHistory = Array.isArray(history) ? history : [];
        const score = won ? `${guessHistory.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
        const rows = mode === 'transparent'
            ? guessHistory.map(colors => (Array.isArray(colors) ? colors : [])
                .map(color => ({ green: '🟩', yellow: '🟨', grey: '⬛' }[color] || '⬛')).join('')).join('\n')
            : guessHistory.map((_, index) => normalizeSecretRow(secretRows?.[index])).join('\n');

        return [
            `Elementle ${dateStr}  ${score}`,
            '',
            rows,
            '',
            ...buildBonusProgressLines(progress),
            '',
            '🧪 Play at: https://elementle.ch'
        ].join('\n');
    }

    function getShareProgress(storage, dateStr) {
        try {
            const stored = JSON.parse(storage.getItem(SHARE_PROGRESS_KEY));
            return stored && stored.date === dateStr ? stored : { date: dateStr };
        } catch (e) {
            return { date: dateStr };
        }
    }

    function saveMainShareState(storage, dateStr, main) {
        const progress = getShareProgress(storage, dateStr);
        progress.main = {
            history: Array.isArray(main.history) ? main.history : [],
            won: !!main.won,
            secretRows: Array.isArray(main.secretRows) ? main.secretRows : []
        };
        storage.setItem(SHARE_PROGRESS_KEY, JSON.stringify(progress));
    }

    function getMainShareState(progress) {
        const main = progress?.main;
        return {
            history: Array.isArray(main?.history) ? main.history : [],
            won: !!main?.won,
            secretRows: Array.isArray(main?.secretRows) ? main.secretRows : []
        };
    }

    function copyTextToClipboard(text) {
        if (root.isSecureContext && root.navigator.clipboard?.writeText) {
            return root.navigator.clipboard.writeText(text);
        }

        const textArea = root.document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        root.document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, textArea.value.length);

        let copied = false;
        try {
            copied = root.document.execCommand('copy');
        } catch (e) { /* copy fallback failed */ }

        root.document.body.removeChild(textArea);
        return copied ? Promise.resolve() : Promise.reject(new Error('Copy command was unsuccessful'));
    }

    function shareResult(mode = 'secret') {
        const storage = root.localStorage;
        const fallbackDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        let dateStr = fallbackDate;
        try {
            dateStr = storage.getItem('elementle-gameDate') || fallbackDate;
        } catch (e) { /* use the current date when storage is unavailable */ }
        const progress = getShareProgress(storage, dateStr);
        const main = getMainShareState(progress);
        const text = buildShareText({
            dateStr,
            history: main.history,
            won: main.won,
            secretRows: main.secretRows,
            progress,
            mode
        });
        copyTextToClipboard(text).then(() => {
            const toast = root.document.getElementById('shareToast');
            toast.style.display = 'block';
            root.setTimeout(() => { toast.style.display = 'none'; }, 2000);
        }).catch(() => {
            root.prompt('Copy this to share:', text);
        });
    }

    function showShareControls() {
        root.document.getElementById('shareControls').classList.add('visible');
    }

    return { buildSecretRow, buildBonusProgressLines, buildShareText, getShareProgress, saveMainShareState, getMainShareState, shareResult, showShareControls };
});
