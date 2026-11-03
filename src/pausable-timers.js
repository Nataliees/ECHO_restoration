// Radio callbacks must stop with the audio clock when Escape opens pause.
export class PausableTimers {
    constructor() { this.tasks = new Set(); this.paused = false; }
    set(callback, delay) {
        const task = { callback, remaining: delay };
        this.tasks.add(task);
        if (!this.paused) this.arm(task);
        return task;
    }
    arm(task) {
        task.due = performance.now() + task.remaining;
        task.id = setTimeout(() => { this.tasks.delete(task); task.callback(); }, task.remaining);
    }
    pause() {
        if (this.paused) return;
        this.paused = true;
        for (const task of this.tasks) {
            clearTimeout(task.id);
            task.remaining = Math.max(0, task.due - performance.now());
        }
    }
    resume() {
        if (!this.paused) return;
        this.paused = false;
        for (const task of this.tasks) this.arm(task);
    }
    clear() {
        for (const task of this.tasks) clearTimeout(task.id);
        this.tasks.clear(); this.paused = false;
    }
}
