import { PRIORITIES_FACTORS } from './const.js';
export default class Task {
    constructor(callback, options) {
        this.priority = 'minor';
        this.inWebWorker = false;
        this.paused = false;
        this.callback = callback;
        this.iterator = options.inWebWorker ? null : callback();
        this.priority = options.priority || this.priority;
        this.priorityFactor = PRIORITIES_FACTORS[this.priority];
        this.inWebWorker = options.inWebWorker || this.inWebWorker;
        this.paused = options.paused || this.paused;
    }
}
;
