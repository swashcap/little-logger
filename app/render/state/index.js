const reactRouterRedux = require('react-router-redux');
const combineReducers = require('redux').combineReducers;

const jobs = require('../ducks/jobs');

module.exports = combineReducers({
  jobs,
  routing: reactRouterRedux.routerReducer,
});
