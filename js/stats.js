(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.ElementleStats = api;
})(typeof window !== 'undefined' ? window : null, function () {
    const STATS_KEY = 'elementle-stats';
    const BONUS_ROUNDS = ['bonus1', 'bonus2', 'bonus3'];

    function nonNegativeInteger(value) {
        return Number.isInteger(value) && value >= 0 ? value : 0;
    }

    function defaultStats() {
        return {
            played: 0,
            won: 0,
            currentStreak: 0,
            maxStreak: 0,
            distribution: [0, 0, 0, 0, 0, 0],
            bonuses: {
                bonus1: { correct: 0, completed: 0 },
                bonus2: { correct: 0, completed: 0 },
                bonus3: { correct: 0, completed: 0 }
            },
            recordedBonusDays: {}
        };
    }

    function normalizeStats(stored) {
        const defaults = defaultStats();
        const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
        const bonuses = source.bonuses && typeof source.bonuses === 'object' && !Array.isArray(source.bonuses)
            ? source.bonuses : {};
        const recordedBonusDays = source.recordedBonusDays
            && typeof source.recordedBonusDays === 'object'
            && !Array.isArray(source.recordedBonusDays) ? source.recordedBonusDays : {};

        return {
            played: nonNegativeInteger(source.played),
            won: nonNegativeInteger(source.won),
            currentStreak: nonNegativeInteger(source.currentStreak),
            maxStreak: nonNegativeInteger(source.maxStreak),
            distribution: defaults.distribution.map((_, index) => nonNegativeInteger(source.distribution?.[index])),
            bonuses: Object.fromEntries(BONUS_ROUNDS.map(round => [round, {
                correct: nonNegativeInteger(bonuses[round]?.correct),
                completed: nonNegativeInteger(bonuses[round]?.completed)
            }])),
            recordedBonusDays: Object.fromEntries(
                Object.entries(recordedBonusDays)
                    .filter(([date, rounds]) => typeof date === 'string' && rounds && typeof rounds === 'object' && !Array.isArray(rounds))
                    .map(([date, rounds]) => [date, Object.fromEntries(
                        BONUS_ROUNDS.filter(round => rounds[round] === true).map(round => [round, true])
                    )])
            )
        };
    }

    function load(storage) {
        try {
            return normalizeStats(JSON.parse(storage?.getItem(STATS_KEY)));
        } catch (e) {
            return defaultStats();
        }
    }

    function save(storage, stats) {
        try {
            storage?.setItem(STATS_KEY, JSON.stringify(stats));
            return true;
        } catch (e) {
            return false;
        }
    }

    function recordMain(storage, won, usedAttempts) {
        const stats = load(storage);
        stats.played++;
        if (won) {
            stats.won++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            const bucket = Math.min(Math.max(usedAttempts - 1, 0), stats.distribution.length - 1);
            stats.distribution[bucket]++;
        } else {
            stats.currentStreak = 0;
        }
        save(storage, stats);
        return stats;
    }

    function recordBonus(storage, date, round, correct) {
        if (!BONUS_ROUNDS.includes(round) || typeof date !== 'string' || !date) return load(storage);

        const stats = load(storage);
        if (stats.recordedBonusDays[date]?.[round]) return stats;

        if (!stats.recordedBonusDays[date]) stats.recordedBonusDays[date] = {};
        stats.recordedBonusDays[date][round] = true;
        stats.bonuses[round].completed++;
        stats.bonuses[round].correct += nonNegativeInteger(correct);
        save(storage, stats);
        return stats;
    }

    function getCurrentStreak(storage) {
        return load(storage).currentStreak;
    }

    return { STATS_KEY, defaultStats, normalizeStats, load, save, recordMain, recordBonus, getCurrentStreak };
});
