'use strict';

const cloneDeep = require('lodash/cloneDeep');
const EchoJob = require('./echo-job');
const EventEmitter = require('events');
const FilterJob = require('./filter-job');
const GithubStatusJob = require('./github-status-job');
const isPromise = require('../utils/is-promise');

/**
 * Worker
 * @module
 *
 * @property {boolean} destroyed
 * @property {boolean} ready
 * @property {Object} jobQueue
 */
class Worker extends EventEmitter {
  constructor() {
    super(arguments);

    this.destroyed = false;
    this.ready = false;
    this.jobQueue = {};
  }

  /**
   * Is a job's ID in the internal queue?
   * @private
   *
   * @returns {boolean}
   */
  idInJobQueue(id) {
    return Object.keys(this.jobQueue).indexOf(id) > -1;
  }

  /**
   * Do the action of _adding_ the job.
   * @private
   *
   * This can be extended for custom behavior.
   */
  doAddJob(id, job) {
    this.jobQueue[id] = job;
  }

  /**
   * The the action of _removing_ the job.
   * @private
   *
   * Like `doAddJob`, can be extend.
   */
  doRemoveJob(id) {
    delete this.jobQueue[id];
  }

  /**
   * Helper for emitting errors and getting a rejected Promise.
   * @private
   *
   * @param {Error} error
   * @param {string} [eventName=Worker.events.error]
   * @returns {Promise}
   */
  emitAndReject(error, eventName = Worker.events.error) {
    this.emit(eventName, error);
    return Promise.reject(error);
  }

  /**
   * Get a job by its ID.
   * @private
   *
   * @param {string} id
   * @returns {Promise} Resolves to a Job
   */
  getJob(id) {
    if (!this.idInJobQueue(id)) {
      return Promise.reject(new Error(`ID ${id} not in job queue`));
    }

    return Promise.resolve(this.jobQueue[id]);
  }

  /**
   * Initialize the worker.
   * @private
   *
   * @returns {Promise}
   */
  initialize() {
    this.ready = true;

    this.emit(Worker.events.ready)

    // Do setup
    return Promise.resolve();
  }

  /**
   * Destroy the worker.
   * @private
   *
   * @todo Implement a `force` param to override job checking.
   *
   * @returns {Promise}
   */
  destroy() {
    if (!this.ready) {
      return this.emitAndReject(
        new Error('Cannot destroy worker: not yet ready'),
        Worker.events.destroyError
      );
    }

    const jobIds = Object.keys(this.jobQueue);

    // TODO: Implement custom `all` jobs to maximize flexibility
    const runningJobIds = jobIds.reduce((memo, jobId) => {
      return this.jobQueue[jobId].isRunning ? memo.concat(jobId) : memo
    }, []);

    // Don't stop if jobs are running. We'll need to kill them.
    if (runningJobIds.length) {
      return Promise.reject(new Error(
        `Can't destroy worker: running jobs in queue: ${runningJobIds.toString()}`
      ));
    }

    return Promise.all(jobIds.map(id => this.removeJob(id)))
      .then(() => {
        this.destroyed = true;
        this.ready = false;
        this.emit(Worker.events.destroyed);
      });
  }

  /**
   * Add a job to the worker's internal queue.
   * @private
   *
   * An external `id` must be provided. Whatever controls the worker should use
   * this to keep track of the job.
   *
   * @todo Make the worker turn a serialized job definition into the actual job
   * model.
   *
   * @param {string} id Job ID to run
   * @param {Object} job Definition of job
   * @param {Array} job.args Arguments to pass to the job constructor
   * @param {string} job.type Used for job class instantiation
   * @returns {Promise}
   */
  addJob(id, job) {
    let error;

    if (!this.ready) {
      error = new Error('Can\'t add job to uninitialized worker');
    } else if (this.destroyed) {
      error = new Error('Can\'t add job to destroyed worker');
    } else if (!id) {
      error = new Error('id required');
    } else if (!job || !(job instanceof Object)) {
      error = new Error('job required');
    } else if (this.idInJobQueue(id)) {
      error = new Error(`ID ${id} already in job queue`);
    } else if (Object.keys(Worker.jobTypes).indexOf(job.type) < 0) {
      error = new Error(`Unknown job type: ${job.type}`);
    } else if (job.args && !Array.isArray(job.args)) {
      // Args _must_ be an array if passed
      // TODO: Make it an array if not?
      error = new Error('Args must be array');
    }

    if (error) {
      return this.emitAndReject(error, Worker.events.jobAddError)
    }

    const args = job.args;
    const type = job.type;
    const JobModel = Worker.jobTypes[type];
    const add = (id, job) => {
      // A sequential queue could override this method
      this.doAddJob(id, job);
      this.emit(Worker.events.jobAdded, id);

      return id;
    }

    if ('factory' in JobModel) {
      // TODO: What if `factory` throws?
      const factoryResponse = JobModel.factory(args);

      return isPromise(factoryResponse) ?
        factoryResponse.then(job => add(id, job)) :
        Promise.resolve(add(id, factoryResponse));
    }

    try {
      const job = args ? new JobModel(...args) : new JobModel();
      return Promise.resolve(add(id, job));
    } catch (error) {
      this.emit(Worker.events.jobAddError, error);
      return Promise.reject(error);
    }
  }

  /**
   * Remove a job by ID.
   * @private
   *
   * @param {string} id Job ID to run
   * @returns {Promise}
   */
  removeJob(id) {
    if (!this.ready || this.destroyed) {
      return this.emitAndReject(
        new Error('Worker not initialized'),
        Worker.events.jobRemoveError
      );
    }

    return this.getJob(id)
      .then(job => {
        if (job.isRunning) {
          throw new Error(`Can't remove running job ${id}`);
        }

        this.doRemoveJob(id);
        this.emit(Worker.events.jobRemoved, id);

        return job;
      })
      .catch(error => {
        // TODO: Add job ID to error?
        this.emit(Worker.events.jobRemoveError, error);
      });
  }


  /**
   * Run a job by ID.
   * @private
   *
   * @param {string} id Job ID to run
   * @returns {Promise}
   */
  runJob(id) {
    if (!this.ready || this.destroyed) {
      return this.emitAndReject(
        new Error('Worker not initialized'),
        Worker.events.jobRunError // TODO: use diffent error
      );
    }

    return this.getJob(id)
      .then(job => job.run())
      .then(jobState => {
        if (jobState.isKilled) {
          this.emit(Worker.events.jobRunKilled, id);
        } else {
          // Clone so whatever is controlling worker doesn't alter the worker's
          // result ref
          this.emit(Worker.events.jobRunDone, id, cloneDeep(jobState.result));
        }

        return jobState;
      })
      .catch(jobState => {
        this.emit(Worker.events.jobRunError, id, jobState.error);

        return jobState;
      });
  }

  /**
   * Run all of worker's jobs.
   * @private
   *
   * @private
   * @returns {Promise}
   */
  runAllJobs() {
    return Promise.all(Object.keys(this.jobQueue).map(this.runJob.bind(this)));
  }

  /**
   * Execute an internal worker command.
   *
   * This is the public-facing method for interacting with a worker instance.
   * All private methods should be referenced here.
   *
   * @todo Figure out how sub-classed workers will extend this method to add
   * new functionality. Maybe:
   *
   * ```js
   * class MyWorker extends Worker {
   *   myCustomMethod() {
   *     // ...
   *   }
   *   exec(command, ...args) {
   *     if (command === 'myCustomMethod') {
   *       this.myCustomMethod(...args);
   *     } else
   *       super.exec(command, ...args);
   *     }
   *   }
   * }
   * ```
   *
   * @todo Document emitted events
   *
   * @param {string} command Command to execute.
   * @param {...(string|Object)} ?
   */
  exec(command, ...args) {
    switch (command) {
      case 'addJob':
        this.addJob(...args);
        break;
      case 'destroy':
        this.destroy();
        break;
      case 'initialize':
        this.initialize();
      case 'removeJob':
        this.removeJob(...args);
        break;
      case 'runAllJobs':
        this.runAllJobs();
        break;
      case 'runJob':
        this.runJob(...args);
        break;
      default:
        this.emit(Worker.events.error, new Error(`Command ${command} DNE`));
    }
  }
}

/**
 * Worker events.
 *
 * @const {Object}
 */
Worker.events = {
  destroyed: 'destroyed',
  destroyError: 'destroy:error',
  error: 'error',
  jobAddError: 'job:add:error',
  jobAdded: 'job:added',
  jobRemoved: 'job:removed',
  jobRemoveError: 'job:remove:error',
  jobRunDone: 'job:run:done',
  jobRunError: 'job:run:error',
  jobRunKilled: 'job:run:killed',
  ready: 'ready',
};

/**
 * Job types.
 *
 * Hash of 'type' strings to job classes. Add new job types here.
 *
 * @const {Object}
 */
Worker.jobTypes = {
  echo: EchoJob,
  filter: FilterJob,
  githubStatus: GithubStatusJob,
};

module.exports = Worker;
