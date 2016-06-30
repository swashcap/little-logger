'use strict';

const Dispatcher = require('./models/dispatcher');
const EchoJob = require('./models/echo-job');
const FilterJob = require('./models/filter-job');
const GithubStatusJob = require('./models/github-status-job');

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
  .then(res => console.log(res))
  .catch(err => console.error(err));
