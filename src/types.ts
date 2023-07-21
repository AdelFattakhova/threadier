import { PRIORITIES } from './const';

export type TaskOptions = {
  priority: typeof PRIORITIES[number],
  inWebWorker: boolean
};

export type SchedulerOptions = {
  block: number,
  sleep: number
};
