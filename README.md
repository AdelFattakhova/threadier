# THREADY
(don't confuse with social network, pun not intended)

## What is Thready?
With Thready you can run your heavy tasks with assigned priority and plan their execution. The tasks will be ran with the use of preemptive multitasking concept. It means that the scheduler is used in order to manage the tasks execution based on their priority levels and the time given for scheduler to do its work. Your web page will stay interactive while the tasks are running.

## How it works
Scheduler takes in the tasks to run. It runs while there are pending tasks. When all tasks are finished, scheduler stops. It is started again when the new task is added.

One cycle of scheduler is going on for the particular amount of time. This time is 10 ms by default, but may be assigned a different value. The same applies to the time during which scheduler takes pause between cycles releasing the execution time to other instructions in your program. **You should be careful with these values since the interactivity of the user interface relies on it.**

During each cycle, the scheduler takes the first task in a sorted tasks list, allots the time to it based on its priority level. The higher the task level, the bigger portion of scheduler running time is devoted to execution of this task. The executed task if not done is moved to the tail of the tasks pipeline for next runs. The tail is also sorted. After that scheduler searches for the next task in the list execution of which can be done during the time left.

[Demo can be found here](./demo)

## How to use
Create a scheduler instance:
```js
const scheduler = new Scheduler();
```

Scheduler parameters can be set during its initialization:
```js
const scheduler = new Scheduler({
  block: 20,
  sleep: 20,
});
```
`block: number` – (default is 10) ms, time during which scheduler blocks the main thread

`sleep: number` – (default is 10) ms, time during which scheduler pauses its cycle

Scheduler instance offers methods to add tasks and cancel the existing ones:

### `addTask(callback, options = {}): Promise<any>`
Adds task to the scheduler.

`callback` – the task itself (a generator function, or another implementation of iterator protocol)

`options` – (optional) task parameters such as:
- `priority: string` – (default is `'minor'`) priority level of the task, determines the speed of task completion
- `inWebWorker: boolean` – (default is `false`) whether the task must be run in a separate thread inside Web Worker or not. If task is requested to run in Web Worker, it's not added into scheduler mechanism and goes right into Web Worker. **Note: the task must return a Promise-like object in order for you to be able to receive the outcome of this task's execution.**
- `paused: boolean` – (default is `false`) whether the task is paused from the beginning

Example:
```js
const task = scheduler.addTask(function* () {
  for (let j = 0; j < 1e6; j++) {
    yield j;
  }
}, { priority: 'blocker' });
```

### `cancelTask(taskPromise): boolean`
Stops the given task's execution and drops it from scheduler.

`taskPromise` – Promise returned by `.addTask()`

```js
scheduler.cancelTask(task);
```

### `toggleTask(taskPromise): boolean`
Pauses the task's execution, or resumes it if the task has already been paused in the moment of method call.

`taskPromise` – Promise returned by `.addTask()`

```js
scheduler.toggleTask(task);
```

### `pauseTask(taskPromise: Promise<any>, timeout: number)`
Pauses the task's execution for a given amount of milliseconds.

`taskPromise` – Promise returned by `.addTask()`
`timeout` – ms, time to pause the task for

```js
scheduler.pauseTask(task, 5000);
```

## Tasks
In order to be pausable, each task that you pass into scheduler must be a generator function, or implement iterator protocol on its own.

Possible task priority levels (from lowest to highest):
- `'trivial'`
- `'minor'` (default)
- `'major'`
- `'critical'`
- `'blocker'`

### Getting tasks results

Task initialization results in a Promise, so standard promise methods such as `.then()` and `.catch()` can be used to get the results of task's execution for further processing. Example:
```js
const task = scheduler.addTask(function* () {
  for (let j = 0; j < 1e6; j++) {
    yield j;
  }
}, { priority: 'blocker' });

task
  .then((result) => console.log(result))
  .catch((error) => console.log(error));
```

Example of a WebWorker task:
```js
const wwTask = scheduler.addTask(() => {
  try {
    let count = 0;
    for (let j = 0; j < 1e7; j++) {
      count++;
    }
    return Promise.resolve(count);
  } catch (e) {
    return Promise.reject(e);
  }
}, { inWebWorker: true });

wwTask
  .then((result) => console.log(result))
  .catch((error) => console.log(error));
```
