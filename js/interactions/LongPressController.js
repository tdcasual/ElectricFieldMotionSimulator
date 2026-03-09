function createGlobalTimerInvoker(name) {
    return (...args) => {
        const timerFn = globalThis?.[name];
        if (typeof timerFn !== 'function') {
            throw new TypeError(`${name} is not available`);
        }
        return timerFn.call(globalThis, ...args);
    };
}

export class LongPressController {
    constructor({ setTimeoutRef, clearTimeoutRef } = {}) {
        this.setTimeoutRef = typeof setTimeoutRef === 'function'
            ? setTimeoutRef
            : createGlobalTimerInvoker('setTimeout');
        this.clearTimeoutRef = typeof clearTimeoutRef === 'function'
            ? clearTimeoutRef
            : createGlobalTimerInvoker('clearTimeout');
        this.timerId = null;
    }

    start(callback, delayMs) {
        this.clear();
        this.timerId = this.setTimeoutRef(() => {
            this.timerId = null;
            callback?.();
        }, delayMs);
        return this.timerId;
    }

    clear() {
        if (this.timerId == null) return;
        this.clearTimeoutRef(this.timerId);
        this.timerId = null;
    }
}
