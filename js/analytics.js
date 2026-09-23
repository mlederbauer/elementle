// Cookieless counting via GoatCounter: no cookies, no consent banner, nothing personal stored.
// Every event is "<cohort>/<step>", so how often someone plays and how far they get can be read together.
(function () {
    const SITE_CODE = 'elementle';
    const DAY_KEY = 'elementle-analytics-day';

    // Events are paths in GoatCounter (they may not start with "/"), so the name carries everything.
    // Returns false when the counting script has not loaded yet, so the caller can retry later.
    function track(name) {
        if (!window.goatcounter?.count) return false;
        window.goatcounter.count({ path: name, title: name, event: true });
        return true;
    }

    function cohortFor(played) {
        if (played === 0) return 'new';
        if (played < 6) return 'ret-2-6';
        if (played < 30) return 'ret-7-30';
        return 'ret-31plus';
    }

    // The cohort is fixed once per day: finishing the main game increments the played count, and a
    // player must not drift into the next bucket halfway through today's rounds.
    function today() {
        const stored = (() => {
            try { return JSON.parse(localStorage.getItem(DAY_KEY)); } catch (e) { return null; }
        })();
        const date = new Date().toISOString().slice(0, 10);
        if (stored?.date === date) return stored;
        const played = window.ElementleStats?.load(localStorage).played || 0;
        return { date, cohort: cohortFor(played), steps: {} };
    }

    // Result screens re-render when a finished round is reloaded, so each step counts once per day.
    function trackOnce(step) {
        const day = today();
        if (day.steps[step] || !track(`${day.cohort}/${step}`)) return;  // unsent steps retry on the next load
        day.steps[step] = true;
        try { localStorage.setItem(DAY_KEY, JSON.stringify(day)); } catch (e) { /* de-dup is best effort */ }
    }

    window.Analytics = { track, trackOnce, cohortFor };

    document.addEventListener('DOMContentLoaded', () => {
        const tag = document.createElement('script');
        tag.async = true;
        tag.src = '//gc.zgo.at/count.js';
        tag.dataset.goatcounter = `https://${SITE_CODE}.goatcounter.com/count`;
        tag.addEventListener('load', () => trackOnce('visit'));
        document.head.appendChild(tag);
    });
})();
