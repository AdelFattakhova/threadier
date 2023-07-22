import { Scheduler } from '../lib/scheduler.js';
import { PRIORITIES } from '../lib/const.js';

const COLORS = {
  blocker: '#c81d06',
  critical: '#e98c00',
  major: '#e9e500',
  minor: '#325527',
  trivial: '#b0b0b0',
}
const ITERATIONS = 1e5;

const scheduler = new Scheduler();

const container = document.querySelector('.container');
const interactive = document.querySelector('.interactive');
const block = interactive.querySelector('div');
const button = interactive.querySelector('button');

button.addEventListener('click', () => {
  block.classList.toggle('_filled');
})

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newElement(label) {
  const el = document.createElement('div');
  const progress = document.createElement('div');
  const text = document.createElement('div');
  el.className = 'task';
  progress.className = 'progress';
  text.className = 'text';
  text.innerHTML = `<span>0</span>`;
  el.append(progress);
  el.append(text);

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = label;
    el.append(labelEl);
  }

  container.append(el);

  return { progress, text };
}

function createTask(label) {
  const priority = PRIORITIES[getRandomInt(0, 4)];
  const { progress, text } = newElement(label);
  progress.style.backgroundColor = COLORS[priority];
  progress.style.borderColor = COLORS[priority];
  progress.dataset.color = COLORS[priority]

  return scheduler.addTask(function* () {
    for (let j = 1; j <= ITERATIONS; j++) {
      text.innerHTML = `<span>${j}</span>`;
      progress.style.width = `${j / ITERATIONS * 100}%`;
      yield j;
    }
  }, { priority });
}

const tasks = [];

for (let i = 0; i < 60; i++) {
  let label = '';
  if (i % 8 === 0) label = 'cancelled in 5s';
  if (i === 26) label = 'paused every 3s';
  tasks.push(createTask(label));
}

setTimeout(() => {
  for (let i = 0; i < tasks.length; i++) {
    if (i % 8 === 0) scheduler.cancelTask(tasks[i]);
  }
}, 5000);

tasks[1].then((result) => console.log('result of the second task', result))
  .catch((e) => console.log(e));

setTimeout(() => {
  for (let i = 0; i < 60; i++) {
    let label = '';
    tasks.push(createTask(label));
  }
}, 5000);

setInterval(() => {
  scheduler.toggleTask(tasks[26]);
}, 3000);

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

wwTask.then((result) => console.log('result of a task inside web worker', result))
  .catch((error) => console.log(error));
