import Task from './task.js';

export class Scheduler {
  blockingTime = 100;
  sleepTime = 50;
  tasksCount = 0;
  running = false;
  tasks = {
    blocker: new Set(),
    critical: new Set(),
    major: new Set(),
    minor: new Set(),
    trivial: new Set(),
  };

  constructor(options = {}) {
    this.blockingTime = options.blockingTime || this.blockingTime;
    this.sleepTime = options.sleepTime || this.sleepTime;

    this.#start();
  }

  // comparator(task1, task2) {
  //   if (typeof task1 === 'undefined') return -1;
  //   if (typeof task2 === 'undefined') return 1;
  //   if (task1.priority === task2.priority) return 0;
  //   return task1.priority > task2.priority ? 1 : -1;
  // }

  async #start() {
    this.running = true;
    let startTime = Date.now();
    let timeBudget = 0;

    while (true) {
      if (this.tasksCount === 0) {
        this.running = false;
        console.log('break');
        break;
      }
      console.log('------------------------');
      console.log('NEW TICK');
      console.log('------------------------');
      if (Date.now() - startTime >= this.blockingTime) {
        await this.#sleep();
        startTime = Date.now();
      }

      const orderedTasks = [...Object.values(this.tasks)].reduce(( a, c ) => a.concat( [...c] ), []);

      for (const task of orderedTasks) {
        if (timeBudget === 1) continue;

        const {
          iterator,
          priority,
          priorityFactor,
        } = task;

        // console.log(this.tasks);
        // console.log('timeBudget', timeBudget);
        // console.log('priorityFactor', priorityFactor);
        // console.log((timeBudget + priorityFactor) <= 1);
        if (timeBudget + priorityFactor <= 1) {
          const done = this.executeTask(iterator, this.blockingTime * priorityFactor);
          this.tasks[priority].delete(task);
          timeBudget = +(timeBudget + priorityFactor).toFixed(1);
          this.tasks[priority].add(task);

          if (done) {
            console.log('TASK DELETED');
            this.tasks[priority].delete(task);
            this.tasksCount--;
          }
        }

      }

      timeBudget = 0;
    }
  }

  executeTask(task, allowedTime) {
    let startTime = Date.now();

    while (Date.now() - startTime < allowedTime) {
      try {
        const { done } = task.next();
        if (done) return done;
      } catch (e) {
        console.log(e);
      }
    }
  }

  #sleep = async () => {
    await new Promise((res) => {
      setTimeout(res, this.sleepTime);
    });
  }

  addTask(callback, options) {
    const task = new Task(callback, options);
    this.tasks[options.priority].add(task);
    this.tasksCount++;
    if (!this.running) this.#start();
  }
}
