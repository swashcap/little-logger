'use strict';

const CancelablePromise = require('../utils/cancelable-promise');
const Job = require('./job');
const superagent = require('superagent');

class GithubStatusJob extends Job {
  getStatusURL() {
    return 'https://status.github.com/api/last-message.json';
  }

  getRunner() {
    return new CancelablePromise((resolve, reject, onCancel) => {
      const request = superagent.get(this.getStatusURL())
        .end((error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(this.parseResponseBody(response.body));
          }
        });

      onCancel(() => request.abort());
    });
  }

  /**
   * Parse the request's response body.
   *
   * {@link https://status.github.com/api}
   *
   * @param {Object} body
   * @returns {Object} parsed body
   */
  parseResponseBody(body) {
    let status;

    if (body.status === 'good') {
      status = 'All good!';
    } else if (body.status === 'minor') {
      status = 'Minor outage';
    } else if (body.status === 'major') {
      status = 'Major outage';
    } else {
      status = 'Unknown status';
    }

    return {
      date: new Date(body.created_on),
      message: body.body,
      status,
    };
  }
}

module.exports = GithubStatusJob;
