export default class TasksCollection {
    constructor() {
        this.collection = {
            blocker: new Set(),
            critical: new Set(),
            major: new Set(),
            minor: new Set(),
            trivial: new Set(),
        };
        this.size = 0;
    }
}
;
