import Task from './task.js';

function createTasksCollection() {
  return {
    blocker: new Set(),
    critical: new Set(),
    major: new Set(),
    minor: new Set(),
    trivial: new Set(),
  };
}

export class Scheduler {
  blockingTime = 200;
  sleepTime = 50;
  tasksCount = 0;
  running = false;
  tasksPipe = {
    tasks: [createTasksCollection(), createTasksCollection()],
    sizes: [0, 0]
  };

  constructor(options = {}) {
    this.blockingTime = options.blockingTime || this.blockingTime;
    this.sleepTime = options.sleepTime || this.sleepTime;

    this.#start();
  }

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

      console.log(this.tasksPipe.tasks[0]);
      console.log(this.tasksPipe.tasks[1]);
      const orderedTasks = [
        ...[...Object.values(this.tasksPipe.tasks[0])].reduce(( a, c ) => a.concat([...c]), []),
        ...[...Object.values(this.tasksPipe.tasks[1])].reduce(( a, c ) => a.concat([...c]), [])
      ];

      for (const task of orderedTasks) {
        if (timeBudget === 1) continue;

        const {
          iterator,
          priority,
          priorityFactor,
        } = task;

        if (timeBudget + priorityFactor <= 1) {
          const done = this.executeTask(iterator, this.blockingTime * priorityFactor);
          this.tasksPipe.tasks[0][priority].delete(task);
          this.tasksPipe.sizes[0]--;
          if (this.tasksPipe.sizes[0] === 0) this.swapPipe();
          timeBudget = +(timeBudget + priorityFactor).toFixed(1);

          if (done) {
            console.log('TASK DELETED');
            this.tasksPipe.tasks[0][priority].delete(task) && this.tasksPipe.sizes[0]--;
            this.tasksPipe.tasks[1][priority].delete(task) && this.tasksPipe.sizes[1]--;
            this.tasksCount--;
          } else {
            this.tasksPipe.tasks[1][priority].add(task);
            this.tasksPipe.sizes[1]++;
          }
        }

      }

      timeBudget = 0;
    }
  }

  swapPipe() {
    [this.tasksPipe.tasks[0], this.tasksPipe.tasks[1]] = [this.tasksPipe.tasks[1], this.tasksPipe.tasks[0]];
    [this.tasksPipe.sizes[0], this.tasksPipe.sizes[1]] = [this.tasksPipe.sizes[1], this.tasksPipe.sizes[0]];
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
    this.tasksPipe.tasks[0][options.priority].add(task);
    this.tasksPipe.sizes[0]++;
    this.tasksCount++;
    if (!this.running) this.#start();
  }
}
