import { PRIORITIES_FACTORS } from './const.js';
export default class Task {
    constructor(callback, options) {
        this.priority = 'minor';
        this.inWebWorker = false;
        this.paused = false;
        this.callback = callback;
        this.iterator = (options === null || options === void 0 ? void 0 : options.inWebWorker) ? null : callback();
        this.priority = (options === null || options === void 0 ? void 0 : options.priority) || this.priority;
        this.priorityFactor = PRIORITIES_FACTORS[this.priority];
        this.inWebWorker = (options === null || options === void 0 ? void 0 : options.inWebWorker) || this.inWebWorker;
        this.paused = (options === null || options === void 0 ? void 0 : options.paused) || this.paused;
    }
}
;
