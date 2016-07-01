'use strict';

const { jobRunComplete, jobRunError } = require('../ducks/jobs');
const { ipcRenderer } = require('electron');
const { dispatch } = require('../store/index');

ipcRenderer.on('runJobs:complete', (event, arg) => {
  const { index, result } = JSON.parse(arg);

  dispatch(jobRunComplete(index, result));
});

ipcRenderer.on('runJobs:error', (event, arg) => {
  const { index, error } = JSON.parse(arg);

  dispatch(jobRunError(index, error));
});
