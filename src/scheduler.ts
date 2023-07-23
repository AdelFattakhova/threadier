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
  #tasksResults: Map<Promise<any>, Task> = new Map();

  constructor(options?: SchedulerOptions) {
    this.block = options?.block || this.block;
    this.sleep = options?.sleep || this.sleep;
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
          const run = this.#runTask(iterator, this.block * priorityFactor);

          this.#removeTask(task);
          timeBudget = +(timeBudget + priorityFactor).toFixed(1);

          if (run?.done) {
            if (run.value instanceof Error) {
              task.reject(run.value);
            } else {
              task.resolve(run.value);
            }
          } else {
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

  #runTask(task: Generator, allowedTime: number)
    : { value: any, done: boolean } {
      let startTime = Date.now();
      let value: any;

      while (Date.now() - startTime < allowedTime) {
        try {
          const next = task.next();

          if (typeof next.value !== 'undefined') {
            value = next.value;
          }

          if (next.done) return { value, done: next.done };

        } catch (error) {
          return { value: error, done: true };
        }
      }
  }

  #removeTask(task: Task): boolean {
    let wasRemoved = false;

    for (const part in this.#tasksPipe) {
      if (this.#tasksPipe[part].collection[task.priority].delete(task)) {
        wasRemoved = true;
        this.#tasksPipe[part].size--;
      }
    }

    if (this.#tasksPipe.head.size === 0) this.#swapPipe();

    return wasRemoved;
  }

  #keepTask(task: Task) {
    this.#tasksPipe.tail.collection[task.priority].add(task);
    this.#tasksPipe.tail.size++;
  }

  #swapPipe() {
    [this.#tasksPipe.tail, this.#tasksPipe.head] = [this.#tasksPipe.head, this.#tasksPipe.tail];
  }

  async #sleep() {
    await new Promise((res) => {
      setTimeout(res, this.sleep);
    });
  }

  addTask(callback: GeneratorFunction, options?: TaskOptions): Promise<any> {
    const task = new Task(callback, options);

    const resultPromise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    this.#tasksResults.set(resultPromise, task);

    if (options?.inWebWorker) {
      this.#executeInWebWorker(task);
      return resultPromise;
    }

    this.#tasksPipe.head.collection[task.priority].add(task);
    this.#tasksPipe.head.size++;

    if (!this.#running) this.#start();

    return resultPromise;
  }

  cancelTask(taskPromise: Promise<any>): boolean {
    const task = this.#tasksResults.get(taskPromise);

    if (task.inWebWorker) {
      return this.#cancelWebWorkerTask(task);
    }

    return this.#removeTask(task);
  }

  toggleTask(taskPromise: Promise<any>): boolean {
    const task = this.#tasksResults.get(taskPromise);

    task.paused = !task.paused;
    return task.paused;
  }

  pauseTask(taskPromise: Promise<any>, timeout: number) {
    const task = this.#tasksResults.get(taskPromise);

    task.paused = !task.paused;

    setTimeout(() => {
      task.paused = !task.paused;
    }, timeout);
  }

  #executeInWebWorker(task: Task) {
    function getWebWorkerThread() {
      self.addEventListener('message', async (msg) => {
        const task = new Function(`return (${(msg as MessageEvent).data})()`);

        task()
          .then((result: any) => {
            postMessage({result});
          })
          .catch((error: Error) => {
            postMessage({error});
          })
      })
    }

    const taskScript = new Blob(
      [`(${getWebWorkerThread.toString()})()`],
      { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(taskScript));

    worker.addEventListener('message', ({data}) => {
      if (data.error) {
        task.reject(data.error);
      } else {
        task.resolve(data.result);
      }
    })

    worker.postMessage(task.callback.toString());
    this.#webWorkerTasks.set(task, worker);
  }

  #cancelWebWorkerTask(task: Task): boolean {
    this.#webWorkerTasks.get(task).terminate();
    return this.#webWorkerTasks.delete(task);
  }
}
