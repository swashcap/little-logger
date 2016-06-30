'use strict';

const Dispatcher = require('./models/dispatcher');
const EchoJob = require('./models/echo-job');
const FilterJob = require('./models/filter-job');

const myJobs = [
  new EchoJob('bananas'),
  new EchoJob('apples'),
  new FilterJob(
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
    { type: 'strawberry'}
  ),
];
const myDis = new Dispatcher();

Promise.all([
  myDis.addJobs(myJobs),
  myDis.createWorker()
])
  .then(([jobIds, workerId]) => {
    return Promise.all([
      myDis.addJobsToWorker(workerId, jobIds),
      Promise.resolve(workerId),
      Promise.resolve(jobIds)
    ]);
  })
  .then(([, workerId, jobIds]) => {
    return Promise.all([
      myDis.runAllWorkerJobs(workerId),
      Promise.resolve(workerId),
      Promise.resolve(jobIds),
    ]);
  })
  .then(([results, workerId, jobIds]) => {
    console.log(results);
    myDis.destroyWorker(workerId);
  })
  .then(res => console.log(res))
  .catch(err => console.error(err));
