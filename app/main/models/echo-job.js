'use strict';

const Job = require('./job');
const CancelablePromise = require('../utils/cancelable-promise');

class EchoJob extends Job {
  constructor(message) {
    super(arguments);

    if (!message) {
      throw new Error('message is required');
    }

    this.message = message;
  }

  getRunner() {
    return new CancelablePromise((resolve, reject, onCancel) => {
      const timer = setTimeout(() => {
        resolve(this.message);
      }, 1000);

      onCancel(() => {
        clearTimeout(timer)
      });
    });
  }
}

module.exports = EchoJob;
