import { Scheduler } from '../lib/scheduler.js';
import { PRIORITIES } from '../lib/const.js';

const scheduler = new Scheduler();

const container = document.querySelector('.container');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newElement() {
  const el = document.createElement('div');
  const progress = document.createElement('div');
  const text = document.createElement('div');
  el.className = 'task';
  progress.className = 'progress';
  text.className = 'text';
  text.innerHTML = `<span>0</span>`;
  el.append(progress);
  el.append(text);
  container.append(el);

  return { progress, text };
}

const COLORS = {
  blocker: '#c81d06',
  critical: '#e98c00',
  major: '#e9e500',
  minor: '#325527',
  trivial: '#b0b0b0',
}

const iterations = 1e6;

for (let i = 0; i < 16; i++) {
  const priority = PRIORITIES[getRandomInt(0, 4)];
  const { progress, text } = newElement();
  progress.style.backgroundColor = COLORS[priority];
  progress.style.borderColor = COLORS[priority];
  progress.dataset.color = COLORS[priority]

  scheduler.addTask(function* () {
    for (let j = 1; j <= iterations; j++) {
      text.innerHTML = `<span>${j}</span>`;
      progress.style.width = `${j / iterations * 100}%`
      yield j;
    }
  }, { priority });
}

const interactive = document.querySelector('.interactive');
const block = interactive.querySelector('div');
const button = interactive.querySelector('button');

button.addEventListener('click', () => {
  block.classList.toggle('_filled');
})
