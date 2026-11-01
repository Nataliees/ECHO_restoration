const SAVE_KEY = 'echo_save_three_acts_v3';
const SAVE_VERSION = 3;

function defaultSave() {
    return {version: SAVE_VERSION, level: 0, memory: null, endings: [], introSeen: false, prologueSeen: false, player: null, branchCheckpoint: null, completedEnding: null};
}

export const SaveSystem = {
    save(state) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({...state, version: SAVE_VERSION}));
        } catch (e) {
            console.warn('Сохранение недоступно', e);
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return defaultSave();
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return defaultSave();
            // The four-location prototype used different fragment identities.
            // Reset its incompatible current run but retain achieved endings.
            if (data.version !== SAVE_VERSION) {
                return {...defaultSave(), endings: Array.isArray(data.endings) ? data.endings : []};
            }
            return {
                ...defaultSave(),
                ...data,
                level: Math.max(0, Math.min(2, Number(data.level) || 0)),
                endings: Array.isArray(data.endings) ? data.endings : []
            };
        } catch (e) {
            return defaultSave();
        }
    },

    hasSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            return !!data && data.version === SAVE_VERSION && !!data.memory;
        } catch (e) {
            return false;
        }
    },

    clearProgress() {
        const current = this.load();
        this.save({...defaultSave(), endings: current.endings});
    }
};
