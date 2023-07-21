import { SchedulerOptions, TaskOptions } from './types.js';
import Task from './task.js';
import TasksCollection from './tasksCollection.js';

export class Scheduler {
  block = 10;
  sleep = 10;

  #running = false;
  #tasksPipe = {
    head: new TasksCollection(),
    tail: new TasksCollection(),
  };
  #webWorkerTasks: Map<Task, Worker> = new Map();

  constructor(options: SchedulerOptions) {
    this.block = options?.block || this.block;
    this.sleep = options?.sleep || this.sleep;

    this.#start();
  }

  async #start() {
    this.#running = true;
    let startTime = Date.now();
    let timeBudget = 0;

    while (true) {
      const orderedTasks = [
        ...[...Object.values(this.#tasksPipe.head.collection)].reduce(( a, c ) => a.concat([...c]), []),
        ...[...Object.values(this.#tasksPipe.tail.collection)].reduce(( a, c ) => a.concat([...c]), [])
      ];

      if (orderedTasks.length === 0) {
        this.#running = false;
        break;
      }

      for (const task of orderedTasks) {
        if (timeBudget === 1) continue;

        const { iterator, priorityFactor, paused } = task;

        if (paused) {
          this.#removeTask(task);
          this.#keepTask(task);
        }

        if (timeBudget + priorityFactor <= 1 && !paused) {
          const done = this.#executeTask(iterator, this.block * priorityFactor);
          this.#removeTask(task);
          timeBudget = +(timeBudget + priorityFactor).toFixed(1);

          if (!done) {
            this.#keepTask(task);
          }
        }
      }

      timeBudget = 0;

      if (Date.now() - startTime >= this.block) {
        await this.#sleep();
        startTime = Date.now();
      }
    }
  }

  #removeTask(task: Task) {
    for (const part in this.#tasksPipe) {
      if (this.#tasksPipe[part].collection[task.priority].delete(task)) {
        this.#tasksPipe[part].size--;
      }
    }
    if (this.#tasksPipe.head.size === 0) this.#swapPipe();
  }

  #keepTask(task: Task) {
    this.#tasksPipe.tail.collection[task.priority].add(task);
    this.#tasksPipe.tail.size++;
  }

  #swapPipe() {
    [this.#tasksPipe.tail, this.#tasksPipe.head] = [this.#tasksPipe.head, this.#tasksPipe.tail];
  }

  #executeTask(task: Generator, allowedTime: number) {
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

  #executeInWebWorker(task: Task) {
    function getWebWorkerThread() {
      self.addEventListener('message', async (msg) => {
        const task = new Function(`return (${msg.data})()`);

        task()
          .then((result: any) => {
            postMessage({result}, '');
          })
          .catch((error: Error) => {
            postMessage({error}, '');
          })
      })
    }

    const taskScript = new Blob(
      [`(${getWebWorkerThread.toString()})()`],
      { type: 'application/javascript' });
    const taskScriptUrl = URL.createObjectURL(taskScript);
    const worker = new Worker(taskScriptUrl);

    worker.addEventListener('message', (e) => {
      return e.data;
    })

    worker.postMessage(task.callback.toString());
    this.#webWorkerTasks.set(task, worker);
  }

  async #sleep() {
    await new Promise((res) => {
      setTimeout(res, this.sleep);
    });
  }

  addTask(callback: GeneratorFunction, options: TaskOptions): Task {
    const task = new Task(callback,
      () => options.inWebWorker
        ? this.#cancelWebWorkerTask(task)
        : this.cancelTask(task),
      options
    );

    if (options.inWebWorker) {
      this.#executeInWebWorker(task);
      return task;
    }

    this.#tasksPipe.head.collection[options.priority].add(task);
    this.#tasksPipe.head.size++;

    if (!this.#running) this.#start();

    return task;
  }

  cancelTask(task: Task) {
    if (task.inWebWorker) {
      this.#cancelWebWorkerTask(task);
      return;
    }

    this.#removeTask(task);
  }

  #cancelWebWorkerTask(task: Task) {
    this.#webWorkerTasks.get(task).terminate();
    this.#webWorkerTasks.delete(task);
  }
}
