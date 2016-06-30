'use strict';

const Bluebird = require('bluebird');

/** {@link http://bluebirdjs.com/docs/api/promise.config.html} */
Bluebird.config({
  cancellation: true,
});

module.exports = Bluebird;
