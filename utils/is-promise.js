'use strict';

const Bluebird = require('bluebird');

/**
 * Is promise
 *
 * @returns {boolean}
 */
module.exports = function isPromise(item) {
  if (
    item instanceof Promise ||
    item instanceof Bluebird ||
    ('then' in item && 'catch' in item)
  ) {
    return true;
  }

  return false;
};
