import { jest } from '@jest/globals';
import { Scheduler } from '../lib/scheduler.js';

describe('scheduler manages tasks correctly', () => {
  test('adds new task, runs it and return the result', () => {
    const scheduler = new Scheduler();

    const task = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e6; i++) {
        yield i;
      }
    });

    task.then((result) => {
      expect(result).toBe(1e6);
    });
  });

  test('runs tasks according to their priority level', () => {
    const scheduler = new Scheduler();
    const results = [];

    const task1 = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'blocker' });

    const task2 = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'critical' });

    const task3 = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'major' });

    const task4 = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'minor' });

    const task5 = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'trivial' });

    task1.then(() => {
      results.push('blocker');
      expect(results).toStrictEqual(['blocker']);
    });

    task2.then(() => {
      results.push('critical');
      expect(results).toStrictEqual(['blocker', 'critical']);
    });

    task3.then(() => {
      results.push('major');
      expect(results).toStrictEqual(['blocker', 'critical', 'major']);
    });

    task4.then(() => {
      results.push('minor');
      expect(results).toStrictEqual(['blocker', 'critical', 'major', 'minor']);
    });

    task5.then(() => {
      results.push('trivial');
      expect(results).toStrictEqual(['blocker', 'critical', 'major', 'minor', 'trivial']);
    });
  });

  test('cancels task\'s execution', () => {
    const scheduler = new Scheduler();

    const task = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'blocker' });

    scheduler.cancelTask(task);

    setTimeout(() => {
      const t = {};
      Promise.race([task, t])
        .then(v => v === t ? "pending" : "fulfilled")
        .then((status) => expect(status).toBe('pending'));
    }, 0);
  });

  test('pauses task\'s execution', () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');

    const scheduler = new Scheduler();

    const task = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'blocker' });

    scheduler.pauseTask(task, 1000);

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    task.then((result) => expect(result).toBe(1e5));
  });

  test('toggles task\'s execution', () => {
    const scheduler = new Scheduler();

    const task = scheduler.addTask(function* () {
      for (let i = 0; i <= 1e5; i++) {
        yield i;
      }
    }, { priority: 'blocker' });

    expect(scheduler.toggleTask(task)).toBe(true);
    expect(scheduler.toggleTask(task)).toBe(false);

    task.then((result) => expect(result).toBe(1e5));
  });
});
