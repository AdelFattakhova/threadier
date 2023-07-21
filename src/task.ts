import { TaskOptions } from './types.js';
import { PRIORITIES_FACTORS } from './const.js';

export default class Task {
  callback: GeneratorFunction;
  cancel: Function;
  iterator: Generator | null;
  priority = 'minor';
  priorityFactor: number;
  inWebWorker = false;
  paused = false;

  constructor(callback: GeneratorFunction, cancel: Function, options: TaskOptions) {
    this.callback = callback;
    this.cancel = cancel;
    this.iterator = options.inWebWorker ? null : callback();
    this.priority = options.priority || this.priority;
    this.priorityFactor = PRIORITIES_FACTORS[this.priority];
    this.inWebWorker = options.inWebWorker || this.inWebWorker;
  }

  toggle(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }
};
