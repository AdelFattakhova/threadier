import { TaskOptions } from './types.js';
import { PRIORITIES_FACTORS } from './const.js';

export default class Task {
  callback: GeneratorFunction;
  iterator: Generator | null;
  priority = 'minor';
  priorityFactor: number;
  inWebWorker = false;
  paused = false;
  resolve: Function;
  reject: Function;

  constructor(callback: GeneratorFunction, options: TaskOptions) {
    this.callback = callback;
    this.iterator = options.inWebWorker ? null : callback();
    this.priority = options.priority || this.priority;
    this.priorityFactor = PRIORITIES_FACTORS[this.priority];
    this.inWebWorker = options.inWebWorker || this.inWebWorker;
    this.paused = options.paused || this.paused;
  }
};
