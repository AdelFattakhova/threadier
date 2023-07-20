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
  blockingTime = 10;
  sleepTime = 10;

  #running = false;
  #tasksCount = 0;
  #tasksPipe = {
    tasks: [createTasksCollection(), createTasksCollection()],
    sizes: [0, 0]
  };
  #webWorkerTasks = new Map();

  constructor(options = {}) {
    this.blockingTime = options.blockingTime || this.blockingTime;
    this.sleepTime = options.sleepTime || this.sleepTime;

    this.#start();
  }

  async #start() {
    this.#running = true;
    let startTime = Date.now();
    let timeBudget = 0;

    while (true) {
      if (this.#tasksCount === 0) {
        this.#running = false;
        break;
      }

      const orderedTasks = [
        ...[...Object.values(this.#tasksPipe.tasks[0])].reduce(( a, c ) => a.concat([...c]), []),
        ...[...Object.values(this.#tasksPipe.tasks[1])].reduce(( a, c ) => a.concat([...c]), [])
      ];

      for (const task of orderedTasks) {
        if (timeBudget === 1) continue;

        const {
          iterator,
          priority,
          priorityFactor,
        } = task;

        if (timeBudget + priorityFactor <= 1) {
          const done = this.#executeTask(iterator, this.blockingTime * priorityFactor);
          this.#tasksPipe.tasks[0][priority].delete(task);
          this.#tasksPipe.sizes[0]--;
          if (this.#tasksPipe.sizes[0] === 0) this.#swapPipe();
          timeBudget = +(timeBudget + priorityFactor).toFixed(1);

          if (done) {
            this.abortTask(task);
          } else {
            this.#tasksPipe.tasks[1][priority].add(task);
            this.#tasksPipe.sizes[1]++;
          }
        }
      }

      timeBudget = 0;

      if (Date.now() - startTime >= this.blockingTime) {
        await this.#sleep();
        startTime = Date.now();
      }
    }
  }

  #swapPipe() {
    [this.#tasksPipe.tasks[0], this.#tasksPipe.tasks[1]] = [this.#tasksPipe.tasks[1], this.#tasksPipe.tasks[0]];
    [this.#tasksPipe.sizes[0], this.#tasksPipe.sizes[1]] = [this.#tasksPipe.sizes[1], this.#tasksPipe.sizes[0]];
  }

  #executeTask(task, allowedTime) {
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

  #executeInWebWorker(task) {
    function getWebWorkerThread() {
      self.addEventListener('message', async (msg) => {
        const task = new Function(`return (${msg.data})()`);

        task()
          .then((result) => {
            postMessage({result});
          })
          .catch((error) => {
            postMessage({error});
          })
      })
    }

    const taskScript = new Blob(
      [`(${getWebWorkerThread.toString()})()`],
      { type: 'application/javascript' });
    const taskScriptUrl = URL.createObjectURL(taskScript);
    const worker = new Worker(taskScriptUrl);

    worker.addEventListener('message', (e) => {
      console.log(e.data);
      return e.data;
    })

    worker.postMessage(task.callback.toString());
    this.#webWorkerTasks.set(task, worker);
  }

  #sleep = async () => {
    await new Promise((res) => {
      setTimeout(res, this.sleepTime);
    });
  }

  addTask(callback, options) {
    const task = new Task(callback, {
      abort: () => {
        options.inWebWorker
          ? this.abortWebWorkerTask(task)
          : this.abortTask(task);
      },
      ...options
    });

    if (options.inWebWorker) {
      this.#executeInWebWorker(task);
      return task;
    }

    this.#tasksPipe.tasks[0][options.priority].add(task);
    this.#tasksPipe.sizes[0]++;
    this.#tasksCount++;

    if (!this.#running) this.#start();

    return task;
  }

  abortTask(task) {
    this.#tasksPipe.tasks[0][task.priority].delete(task) && this.#tasksPipe.sizes[0]--;
    this.#tasksPipe.tasks[1][task.priority].delete(task) && this.#tasksPipe.sizes[1]--;
    this.#tasksCount--;
  }

  abortWebWorkerTask(task) {
    this.#webWorkerTasks.get(task).terminate();
    this.#webWorkerTasks.delete(task);
  }
}
