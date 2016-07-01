const hashHistory = require('react-router').hashHistory;
const Provider = require('react-redux').Provider;
const Router = require('react-router').Router;
const React = require('react');
const render = require('react-dom').render;
const syncHistoryWithStore = require('react-router-redux').syncHistoryWithStore;

const App = require('./controllers/app');
const store = require('./store/index');
const routes = require('./routes');

// Add background listeners
// TODO: Make a boot sequence
const backgroundListeners = require('./background-listeners/jobs');

const history = syncHistoryWithStore(hashHistory, store)

render(
  React.createElement(Provider, { store },
    React.createElement(Router, { history, routes })
  ),
  document.getElementById('app')
);

module.exports = {
  store,
};
