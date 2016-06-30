'use strict';

const async = require('async');
const CancelablePromise = require('../utils/cancelable-promise');
const Job = require('./job');
const isEqual = require('lodash/isEqual');
const pick = require('lodash/pick');

class FilterJob extends Job {
  constructor(arr, value) {
    super(arguments);

    if (!arr || !Array.isArray(arr)) {
      throw new TypeError('Expected argument to be array');
    }
    if (
      !(typeof value === 'boolean') &&
      !(typeof value === 'number') &&
      !(typeof value === 'string') &&
      !(value instanceof Object)
    ) {
      throw new TypeError('Expected value');
    }

    this.arr = arr;
    this.value = value;
  }

  getRunner() {
    return new CancelablePromise((resolve, reject, onCancel) => {
      const compare = this.value instanceof Object ?
        (item) => isEqual(pick(item, Object.keys(this.value)), this.value) :
        (item) => item === this.value;
      let cancelled = false;

      async.filter(
        this.arr,
        (item, cb) => {
          // TODO: Figure out how to return data on cancel
          if (cancelled) {
            cb({ cancelled: true });
          }

          cb(null, compare(item));
        },
        (error, result) => {
          if (error) {
            if (error.cancelled) {
              resolve();
            }

            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      onCancel(() => cancelled = true);
    });
  }
}

module.exports = FilterJob;
