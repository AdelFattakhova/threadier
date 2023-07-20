import { PRIORITIES_FACTORS } from './const.js';

export default class Task {
  priority = 'minor';
  inWebWorker = false;
  paused = false;

  constructor(callback, options = {}) {
    this.callback = callback;
    this.iterator = options.inWebWorker ? null : callback();
    this.priority = options.priority || this.priority;
    this.priorityFactor = PRIORITIES_FACTORS[this.priority];
    this.inWebWorker = options.inWebWorker || this.inWebWorker;
    this.abort = options.abort || (() => {});
  }

  toggle() {
    this.paused = !this.paused;
    return this.paused;
  }
}
