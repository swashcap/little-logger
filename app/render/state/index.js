const reactRouterRedux = require('react-router-redux');
const combineReducers = require('redux').combineReducers;

module.exports = combineReducers({
  routing: reactRouterRedux.routerReducer,
});
