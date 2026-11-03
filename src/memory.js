import { fragments, storyRequirements } from './story.js';

const LEGACY_FRAGMENT_MAP = {
    childhood: 'child_drawing',
    work: 'evacuation_records'
};

export class Memory {
    constructor() {
        this.fragments = new Set();
        this.notesRead = new Set();
        this.events = new Set();
        this.moralChoice = null;
    }

    addFragment(id) {
        const normalized = LEGACY_FRAGMENT_MAP[id] || id;
        if (!fragments[normalized] || this.fragments.has(normalized)) return false;
        this.fragments.add(normalized);
        return true;
    }

    hasFragment(id) {
        if (id === 'moral_choice') return !!this.moralChoice;
        if (id === 'radio_echo') return this.events.has('radio_echo');
        const normalized = LEGACY_FRAGMENT_MAP[id] || id;
        return this.fragments.has(normalized);
    }

    getFragment(id) {
        return fragments[LEGACY_FRAGMENT_MAP[id] || id];
    }

    getAllFragments() {
        return fragments;
    }

    markNoteRead(id) {
        this.notesRead.add(id);
    }

    hasNote(id) {
        return this.notesRead.has(id);
    }

    markEvent(id) {
        const first = !this.events.has(id);
        this.events.add(id);
        return first;
    }

    hasEvent(id) {
        return this.events.has(id);
    }

    canRestoreEvacuationEvidence() {
        return storyRequirements.evidenceNotes.every(id => this.notesRead.has(id));
    }

    allFragmentsRecovered() {
        return storyRequirements.recoveredFragments.every(id => this.fragments.has(id));
    }

    chooseResponsibility(choice) {
        if (!['accept','justify'].includes(choice) || !this.canRestoreEvacuationEvidence()) return false;
        this.moralChoice = choice;
        return true;
    }

    getAvailableEndings() {
        if (!this.allFragmentsRecovered()) return [];
        if (this.moralChoice === 'accept') return ['accept','restart'];
        if (this.moralChoice === 'justify') return ['rewrite','restart'];
        return [];
    }

    serialize() {
        return {
            moralChoice: this.moralChoice,
            fragments: Array.from(this.fragments),
            notesRead: Array.from(this.notesRead),
            events: Array.from(this.events)
        };
    }

    save() { return this.serialize(); }

    load(data) {
        this.fragments.clear();
        this.notesRead.clear();
        this.events.clear();
        this.moralChoice = ['accept','justify'].includes(data?.moralChoice) ? data.moralChoice : null;
        if (!data) return;
        (data.fragments || []).forEach(f => {
            const id = LEGACY_FRAGMENT_MAP[f] || f;
            if (fragments[id]) this.fragments.add(id);
        });
        (data.notesRead || []).forEach(n => this.notesRead.add(n));
        (data.events || []).forEach(e => this.events.add(e));
    }
}
