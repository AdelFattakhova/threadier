# THREADIER

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [What is Threadier?](#what-is-threadier)
  - [How it works](#how-it-works)
  - [How to use](#how-to-use)
    - [`addTask(callback, options = {}): Promise<any>`](#addtaskcallback-options---promiseany)
    - [`cancelTask(taskPromise): boolean`](#canceltasktaskpromise-boolean)
    - [`toggleTask(taskPromise): boolean`](#toggletasktaskpromise-boolean)
    - [`pauseTask(taskPromise: Promise<any>, timeout: number)`](#pausetasktaskpromise-promiseany-timeout-number)
  - [Tasks](#tasks)
    - [Getting tasks results](#getting-tasks-results)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## What is Threadier?
With Threadier you can run your heavy tasks with assigned priority and plan their execution. The tasks will be run with the use of preemptive multitasking concept. It means that the scheduler is used in order to manage the tasks execution based on their priority levels and the time given for scheduler to do its work. Your web page will stay interactive while the tasks are running.

## How it works
Scheduler takes in the tasks to run. It runs while there are pending tasks. When all tasks are finished, scheduler stops. It is started again when the new task is added.

One cycle of scheduler is going on for the particular amount of time. This time is 10 ms by default, but may be assigned a different value. The same applies to the time during which scheduler takes pause between cycles releasing the execution time to other instructions in your program. **You should be careful with these values since the interactivity of the user interface relies on it.**

During each cycle, the scheduler takes the first task in a sorted tasks list and allots the time to it based on its priority level. The higher the task level, the bigger portion of scheduler running time is devoted to execution of this task. If the task is not done after execution, it is moved to the tail of the tasks pipeline for next runs. The tail is also sorted. After that scheduler searches for the next task in the list which can be run during the time left.

[Demo can be found here](https://adelfattakhova.github.io/threadier/demo/)

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
`block: number` – (`10` by default) ms, time during which scheduler blocks the main thread

`sleep: number` – (`10` by default) ms, time during which scheduler pauses its cycle

Scheduler instance offers methods to add new tasks and manage the existing ones:

### `addTask(callback, options = {}): Promise<any>`
Adds task to the scheduler. Return Promise which returns task's result if resolved, or an error if rejected.

`callback` – the task itself (a generator function, or another implementation of iterator protocol)

`options` – (optional) task parameters such as:
- `priority: string` – (`'minor'` by default) priority level of the task, determines the speed of task completion
- `inWebWorker: boolean` – (`false` by default) whether the task must be run in a separate thread inside Web Worker or not. If task is requested to run in Web Worker, it's not added into scheduler mechanism and goes right into Web Worker. **Note: the task must return a Promise-like object in order for you to be able to receive the outcome of this task's execution.**
- `paused: boolean` – (`false` by default) whether the task is paused from the beginning

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

Example of a Web Worker task:
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
