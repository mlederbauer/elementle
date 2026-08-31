(function () {
    const STORAGE_KEY = 'elementle-daily-progress-v1';

    function empty(date) {
        return { date, rounds: {} };
    }

    function load(date) {
        if (!date) return empty('');
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (stored && stored.date === date && stored.rounds && typeof stored.rounds === 'object') {
                return stored;
            }
        } catch (e) { /* malformed browser storage starts a fresh daily game */ }
        return empty(date);
    }

    function save(date, round, state) {
        if (!date || !round) return;
        const progress = load(date);
        progress.rounds[round] = state;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Failed to save daily game progress:', e);
        }
    }

    function get(date, round) {
        return load(date).rounds[round] || null;
    }

    window.GameProgress = { get, save };
})();
