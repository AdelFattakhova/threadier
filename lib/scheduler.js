var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Scheduler_instances, _Scheduler_running, _Scheduler_tasksPipe, _Scheduler_webWorkerTasks, _Scheduler_start, _Scheduler_removeTask, _Scheduler_keepTask, _Scheduler_swapPipe, _Scheduler_executeTask, _Scheduler_executeInWebWorker, _Scheduler_sleep, _Scheduler_cancelWebWorkerTask;
import Task from './task.js';
import TasksCollection from './tasksCollection.js';
export class Scheduler {
    constructor(options) {
        _Scheduler_instances.add(this);
        this.block = 10;
        this.sleep = 10;
        _Scheduler_running.set(this, false);
        _Scheduler_tasksPipe.set(this, {
            head: new TasksCollection(),
            tail: new TasksCollection(),
        });
        _Scheduler_webWorkerTasks.set(this, new Map());
        this.block = (options === null || options === void 0 ? void 0 : options.block) || this.block;
        this.sleep = (options === null || options === void 0 ? void 0 : options.sleep) || this.sleep;
        __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_start).call(this);
    }
    addTask(callback, options) {
        const task = new Task(callback, () => options.inWebWorker
            ? __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_cancelWebWorkerTask).call(this, task)
            : this.cancelTask(task), options);
        if (options.inWebWorker) {
            __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_executeInWebWorker).call(this, task);
            return task;
        }
        __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head.collection[options.priority].add(task);
        __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head.size++;
        if (!__classPrivateFieldGet(this, _Scheduler_running, "f"))
            __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_start).call(this);
        return task;
    }
    cancelTask(task) {
        if (task.inWebWorker) {
            __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_cancelWebWorkerTask).call(this, task);
            return;
        }
        __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_removeTask).call(this, task);
    }
}
_Scheduler_running = new WeakMap(), _Scheduler_tasksPipe = new WeakMap(), _Scheduler_webWorkerTasks = new WeakMap(), _Scheduler_instances = new WeakSet(), _Scheduler_start = async function _Scheduler_start() {
    __classPrivateFieldSet(this, _Scheduler_running, true, "f");
    let startTime = Date.now();
    let timeBudget = 0;
    while (true) {
        const orderedTasks = [
            ...[...Object.values(__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head.collection)].reduce((a, c) => a.concat([...c]), []),
            ...[...Object.values(__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").tail.collection)].reduce((a, c) => a.concat([...c]), [])
        ];
        if (orderedTasks.length === 0) {
            __classPrivateFieldSet(this, _Scheduler_running, false, "f");
            break;
        }
        for (const task of orderedTasks) {
            if (timeBudget === 1)
                continue;
            const { iterator, priorityFactor, paused } = task;
            if (paused) {
                __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_removeTask).call(this, task);
                __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_keepTask).call(this, task);
            }
            if (timeBudget + priorityFactor <= 1 && !paused) {
                const done = __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_executeTask).call(this, iterator, this.block * priorityFactor);
                __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_removeTask).call(this, task);
                timeBudget = +(timeBudget + priorityFactor).toFixed(1);
                if (!done) {
                    __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_keepTask).call(this, task);
                }
            }
        }
        timeBudget = 0;
        if (Date.now() - startTime >= this.block) {
            await __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_sleep).call(this);
            startTime = Date.now();
        }
    }
}, _Scheduler_removeTask = function _Scheduler_removeTask(task) {
    for (const part in __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f")) {
        if (__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f")[part].collection[task.priority].delete(task)) {
            __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f")[part].size--;
        }
    }
    if (__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head.size === 0)
        __classPrivateFieldGet(this, _Scheduler_instances, "m", _Scheduler_swapPipe).call(this);
}, _Scheduler_keepTask = function _Scheduler_keepTask(task) {
    __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").tail.collection[task.priority].add(task);
    __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").tail.size++;
}, _Scheduler_swapPipe = function _Scheduler_swapPipe() {
    [__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").tail, __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head] = [__classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").head, __classPrivateFieldGet(this, _Scheduler_tasksPipe, "f").tail];
}, _Scheduler_executeTask = function _Scheduler_executeTask(task, allowedTime) {
    let startTime = Date.now();
    while (Date.now() - startTime < allowedTime) {
        try {
            const { done } = task.next();
            if (done)
                return done;
        }
        catch (e) {
            console.log(e);
        }
    }
}, _Scheduler_executeInWebWorker = function _Scheduler_executeInWebWorker(task) {
    function getWebWorkerThread() {
        self.addEventListener('message', async (msg) => {
            const task = new Function(`return (${msg.data})()`);
            task()
                .then((result) => {
                postMessage({ result }, '');
            })
                .catch((error) => {
                postMessage({ error }, '');
            });
        });
    }
    const taskScript = new Blob([`(${getWebWorkerThread.toString()})()`], { type: 'application/javascript' });
    const taskScriptUrl = URL.createObjectURL(taskScript);
    const worker = new Worker(taskScriptUrl);
    worker.addEventListener('message', (e) => {
        return e.data;
    });
    worker.postMessage(task.callback.toString());
    __classPrivateFieldGet(this, _Scheduler_webWorkerTasks, "f").set(task, worker);
}, _Scheduler_sleep = async function _Scheduler_sleep() {
    await new Promise((res) => {
        setTimeout(res, this.sleep);
    });
}, _Scheduler_cancelWebWorkerTask = function _Scheduler_cancelWebWorkerTask(task) {
    __classPrivateFieldGet(this, _Scheduler_webWorkerTasks, "f").get(task).terminate();
    __classPrivateFieldGet(this, _Scheduler_webWorkerTasks, "f").delete(task);
};
