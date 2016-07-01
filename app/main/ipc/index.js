'use strict';

const Dispatcher = require('../models/dispatcher');
const ipcMain = require('electron').ipcMain;

/**
 * {@link http://electron.atom.io/docs/api/ipc-main/}
 */
ipcMain.on('runJobs', (event, index) => {
  const myJobs = [{
    args: ['I love bananas.', 1000],
    type: 'echo',
  }, {
    type: 'githubStatus',
  }, {
    args: [
      [{
        name: 'Ralph',
        type: 'orange',
      }, {
        name: 'Barbara',
        type: 'strawberry',
      }, {
        name: 'Eddy',
        type: 'passionfruit',
      }, {
        name: 'Pat',
        type: 'strawberry',
      }],
      { type: 'strawberry' },
    ],
    type: 'filter'
  }];
  const myDis = new Dispatcher();

  myDis.runJobs(myJobs)
    .then(result => {
      event.sender.send('runJobs:complete', JSON.stringify({
        index,
        result,
      }));
    })
    .catch(error => {
      // TODO: Errors must be serialzed. Native `Error` is iffy.
      event.sender.send('runJobs:error', JSON.stringify({
        error,
        index,
      }));
    });
});
