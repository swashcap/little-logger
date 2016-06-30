'use strict';

const difference = require('lodash/difference');
const EventEmitter = require('events');
const uniqueId = require('lodash/uniqueId');
const Worker = require('./worker');
const zip =  require('lodash/zip');

class Dispatcher extends EventEmitter {
  constructor() {
    super(arguments);

    this.jobQueue = [];
    this.workers = {};
  }

  /**
   * Add jobs to the dispatcher for later reference.
   *
   * @param {Object[]} Collection of Job models
   * @returns {Promise} resolves to newly added jobs' IDs. Order matches the
   * order of the jobs passed in.
   */
  addJobs(jobs) {
    return Promise.all(jobs.map(() => Dispatcher.getUniqueJobId()))
      .then(jobIds => {
        const jobItems = zip(jobIds, jobs).forEach(([id, job]) => {
          // [jobId, workerId, JobModel]
          this.jobQueue.push([id, undefined, job]);
        });

        return jobIds;
      });
  }

  // TODO: implement
  removeJobs(jobIds) {

  }

  /**
   * Create and instantiate a Worker, add it to the internal store
   *
   * @returns {Promise} Resolves to the newly created worker's ID. Rejects if
   * worker initialization failed.
   */
  createWorker() {
    const worker = new Worker();

    return new Promise((resolve, reject) => {
      const onReady = () => {
        Dispatcher.getUniqueWorkerId()
          .then(id => {
            this.workers[id] = worker;
            worker.removeListener(Worker.events.error, onError);
            resolve(id);
          })
          .catch(error => {
            worker.removeListener(Worker.events.error, onError);
            reject(error);
          });
      }
      function onError(error) {
        worker.removeListener(Worker.events.ready, onReady);
        reject(error);
      }

      worker.on(Worker.events.error, onError);
      worker.on(Worker.events.ready, onReady);

      worker.exec('initialize');
    });
  }

  /**
   * Destroy a worker.
   *
   * This removes a worker's jobs from its internal queue and updates the
   * Dispatcher instance.
   *
   * @param {string} workerId
   * @returns {Promise}
   */
   destroyWorker(workerId) {
     // TODO ensure this doesn't throw!
     const worker = this.getWorker(workerId);
     const jobItems = this.jobQueue.filter(j => j[1] === workerId);

     return this.getWorkerJobIds(workerId)
       .then(jobIds => this.removeJobsFromWorker(workerId, jobIds))
       .then(() => {
         return new Promise((resolve, reject) => {
           function onDestroyed() {
             // Should we call `removeJobsToWorker` or just do it?
             jobItems.forEach(jobItem => {
               jobItem.splice(1, 1, undefined);
             });

             // TODO: Remove all worker listeners?
             worker.removeListener(Worker.events.destroyError, onError);
             resolve(workerId);
           }
           function onError(error) {
             // Indeterminent state. Did some jobs get removed?
             worker.removeListener(Worker.events.destroyed, onDestroyed);
             reject(error);
           }

           worker.once(Worker.events.destroyed, onDestroyed)
           worker.once(Worker.events.destroyError, onError)
           worker.exec('destroy');
         });
       });
   }

  /**
   * Retrieve a worker by its ID.
   * @private
   *
   * @throws {Error}
   *
   * @param {string} id
   * @returns {Worker}
   */
  getWorker(id) {
    if (!(id in this.workers)) {
      throw new Error(`ID ${id} not a valid worker ID`);
    }

    return this.workers[id];
  }


  /**
   * Add jobs to a worker.
   *
   * @param {string} workerId
   * @param {string[]} jobIds
   * @returns {Promise}
   */
  addJobsToWorker(workerId, jobIds) {
    const jobItems = this.jobQueue.filter(j => jobIds.indexOf(j[0]) > -1);
    const localJobIds = jobIds.slice();
    const worker = this.getWorker(workerId);
    const jobQueue = this.jobQueue;

    if (!jobItems.length) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      function onJobAdded(jobId) {
        const jobIdIndex = localJobIds.indexOf(jobId);

        if (jobIdIndex > -1) {
          // TODO: Add queue fetcher
          const job = jobQueue.find(jobItem => jobItem[0] === jobId);

          if (!job) {
            reject(new Error(`Worker added unidentified job ID: ${jobId}`));
          } else {
            job.splice(1, 1, workerId);
            localJobIds.splice(jobIdIndex, 1);

            if (!localJobIds.length) {
              worker.removeListener(Worker.events.jobAddError, onJobAddError);
              worker.removeListener(Worker.events.jobAdded, onJobAdded);
              resolve([]); // TODO: resolve with added jobIds
            }
          }
        }
      }
      function onJobAddError(error) {
        worker.removeListener(Worker.events.jobAdded, onJobAdded);
        reject(error);
      }

      worker.on(Worker.events.jobAdded, onJobAdded);
      worker.on(Worker.events.jobAddError, onJobAddError);

      jobItems.forEach(([id, workerId, job]) => {
        worker.exec('addJob', id, job);
      });
    });
  }

  /**
   * Remove jobs from a wrker
   *
   * @param {string} workerId
   * @param {string} jobIds
   * @returns {Promise} Resolves to removed job IDs, or rejects if there was an
   * error in removal.
   */
  removeJobsFromWorker(workerId, jobIds) {
    const workerJobIds = this.getWorkerJobIds(workerId);
    const worker = this.getWorker(workerId);

    const localJobIds = jobIds.filter(id => workerJobIds.indexOf(id) > -1);

    if (localJobIds.length !== jobIds.length) {
      return Promise.reject(
        `Some job IDs are not registered with worker ${workerId}:
        ${difference(jobIds, localJobIds).toString()}`
      );
    }

    return new Promise((resolve, reject) => {
      const jobQueue = this.jobQueue;

      function onRemoved(jobId) {
        jobIdIndex = localJobIds.indexOf(jobId);

        // TODO: This mutation is repeated in the job adder. Decorate?
        if (jobIdIndex > -1) {
          // TODO: Make a job getter
          // TODO: Error if job can't be found?
          const job = jobQueue.find(j => j[0] === jobId);

          job.splice(1, 1, undefined);
          localJobIds.slice(jobIndex, 1);

          if (!localJobIds.length) {
            worker.removeListener(Worker.events.jobRemoved, onRemoved);
            worker.removeListener(Worker.events.jobRemoveError, onError);
            resolve(jobIds);
          }
        }
      }
      function onError(error) {
        worker.removeListener(Worker.events.jobRemoved, onRemoved);
        reject(error);
      }

      worker.on(Worker.events.jobRemoved, onRemoved);
      worker.once(Worker.events.jobRemoveError, onError);

      jobIds.forEach(id => {
        worker.exec('removeJob', id);
      });
    });
  }

  /**
   * Get a worker's job IDs.
   *
   * @param {string} workerId
   * @returns {Promise} Resolves to a collection of jobIds
   */
  getWorkerJobIds(workerId) {
    return new Promise((resolve, reject) => {
      // TODO: Make a helper for this
      if (!(workerId in this.workers)) {
        reject(new Error(`Worker ${workerId} DNE`));
      }

      resolve(this.jobQueue.reduce((memo, jobItem) => {
        if (jobItem[1] === workerId) {
          return memo.concat(jobItem[0]);
        }

        return memo;
      }, []));
    });
  }

  /**
   * Run all jobs queued to a worker.
   *
   * @param {string} workerId
   * @returns {Promise} Resolves with a WorkerRunResult object. This should
   * always resolve, and jobs' errors are placed in the `error` key.
   */
  runAllWorkerJobs(workerId) {
    // Get the worker's current jobs
    const worker = this.getWorker(workerId);
    const workerJobItems = this.jobQueue.filter(jobItem => {
      return jobItem[1] === workerId;
    });
    const jobIds = workerJobItems.map(jobItem => jobItem[0]);
    const response = {
      done: [],
      error: [],
      killed: [],
    };

    if (!workerJobItems.length) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      function doThings(responseKey, jobId, data) {
        const jobIdIndex = jobIds.indexOf(jobId);

        if (jobIdIndex > -1) {
          response[responseKey].push(data ? [jobId, data] : [jobId]);
          jobIds.splice(jobIdIndex, 1);

          if (!jobIds.length) {
            // TODO: Consider moving to non-dynamic listeners? These might eat
            // up memory
            // TODO: Serialize worker's responses
            worker.removeListener(Worker.events.jobRunDone, onDone);
            worker.removeListener(Worker.events.jobRunError, onError);
            worker.removeListener(Worker.events.jobRunKilled, onKilled);

            resolve(response);
          }
        }
      }

      function onDone(jobId, result) {
        doThings('done', jobId, result);
      }
      function onError(jobId, error) {
        doThings('error', jobId, error);
      }
      function onKilled(jobId) {
        doThings('killed', jobId);
      }

      worker.on(Worker.events.jobRunDone, onDone);
      worker.on(Worker.events.jobRunError, onError);
      worker.on(Worker.events.jobRunKilled, onKilled);

      jobIds.forEach(id => {
        worker.exec('runJob', id);
      });
    });
  }

  /**
   * Get a unique identifier for a worker.
   * @static
   *
   * @returns {Promise} Resolves to unique ID
   */
  static getUniqueWorkerId() {
    return Promise.resolve(uniqueId('worker-'));
  }

  /**
   * Get a unique identifier for a job.
   * @static
   *
   * @returns {Promise} Resolves to unique ID
   */
  static getUniqueJobId() {
    return Promise.resolve(uniqueId('job-'));
  }
}

module.exports = Dispatcher;
