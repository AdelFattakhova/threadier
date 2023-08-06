export default class TasksCollection {
  collection = {
    blocker: new Set(),
    critical: new Set(),
    major: new Set(),
    minor: new Set(),
    trivial: new Set(),
  };
  size = 0;
};
