const Provider = require('react-redux').Provider;
const React = require('react');
const Route = require('react-router').Route;

const App = require('./controllers/app');

module.exports = React.createElement(Route, {
  component: App,
  path: '/'
});
