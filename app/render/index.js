const hashHistory = require('react-router').hashHistory;
const React = require('react');
const render = require('react-dom').render;
const syncHistoryWithStore = require('react-router-redux').syncHistoryWithStore;

const App = require('./controllers/app');
const configureStore = require('./store/configure-store.js');

const store = configureStore()
const history = syncHistoryWithStore(hashHistory, store)

render(
  React.createElement(App, { store, history }),
  document.getElementById('app')
);
