const { ipcRenderer } = require('electron');

const ADD_JOB = 'ADD_JOB';

function addJob(job) {
  return {
    job,
    type: ADD_JOB,
  };
}

const REMOVE_JOB = 'REMOVE_JOB';

function removeJob(index) {
  return {
    index,
    type: REMOVE_JOB,
  }
}

const RUN_JOB_START = 'RUN_JOB_START';

/**
 * @todo Use async actions?
 * {@link http://redux.js.org/docs/advanced/AsyncActions.html}
 */
function runJobStart(index) {
  ipcRenderer.send('runJobs', index);

  return {
    index,
    type: RUN_JOB_START,
  };
}

const RUN_JOB_COMPLETE = 'RUN_JOB_COMPLETE';

function jobRunComplete(index, results) {
  return {
    index,
    results,
    type: RUN_JOB_COMPLETE,
  };
}

const RUN_JOB_ERROR = 'RUN_JOB_ERROR';

function jobRunError(index, error) {
  return {
    error,
    index,
    type: RUN_JOB_ERROR,
  };
}

module.exports = function reducer(state = [{
  args: ['bananas'],
  error: null,
  running: false,
  type: 'echo',
}], action) {
  switch (action.type) {
    case ADD_JOB:
      return state.concat(action.job);
    case REMOVE_JOB:
      return state.filter((job, index) => index !== action.index);
    case RUN_JOB_START:
      return state.map((job, index) => {
        if (index === action.index) {
          return Object.assign({}, job, {
            error: null,
            running: true,
          });
        }

        return job;
      });
    case RUN_JOB_COMPLETE:
      return state.map((job, index) => {
        if (index === action.index) {
          return Object.assign({}, job, { running: false });
        }

        return job;
      });
    case RUN_JOB_ERROR:
      return state.map((job, index) => {
        if (index === action.index) {
          return Object.assign({}, job, {
            error: action.error,
            running: false,
          });
        }

        return job;
      });
    default:
      return state;
  }
};

module.exports.addJob = addJob;
module.exports.removeJob = removeJob;
module.exports.runJobStart = runJobStart;
module.exports.jobRunError = jobRunError;
module.exports.jobRunComplete = jobRunComplete;
