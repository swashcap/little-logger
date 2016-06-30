'use strict';

class Job {
  constructor() {
    this.error = null;
    this.isDone = false;
    this.isError = false;
    this.isKilled = false;
    this.isRunning = false;
    this.result = null;
    this.runCount = 0;
  }

  // Custom jobs implement this method
  getRunner() {
    throw new Error('Implement getRunner');
  }

  getState() {
    return {
      error: this.error,
      isDone: this.isDone,
      isKilled: this.isKilled,
      isRunning: this.isRunning,
      result: this.result,
    };
  }

  // Do the job
  run() {
    if (this.isRunning) {
      throw new Error('Job already running');
    }

    this.error = null;
    this.isDone = false;
    this.isKilled = false;
    this.isRunning = true;
    this.result = null;
    this.runner = this.getRunner();
    ++this.runCount;

    return new Promise((resolve, reject) => {
      this.runner
        .then(result => {
          this.isDone = true;
          this.result = result;
          // resolve(this.getState());
        })
        .catch(error => {
          this.error = error;
          this.isError = true;
          // reject(this.getState());
        })
        .finally(() => {
          /**
           * Catches Bluebird's cancelled Promise. See `this.runner.isCanceled`
           */
          resolve(this.getState());
        });
    });
  }

  // Force stop the job for whatever reason
  kill() {
    if (!this.isRunning) {
      throw new Error('Job cannot be killed because it is not running');
    } else if (this.isDone) {
      throw new Error('Cannot kill complete job');
    }

    this.isKilled = true;
    this.runner.cancel();
  }
}

module.exports = Job;
