const { connect } = require('react-redux');
const identity = require('lodash/identity');
const React = require('react');

const { Component, PropTypes } = React;

const Job = require('../components/job');
const { runJobStart } = require('../ducks/jobs');

class App extends React.Component {
  renderJobs() {
    const { runJobStart } = this.props;

    return React.createElement(
      'div',
      { className: 'jobs' },
      this.props.jobs.map((job, index) => React.createElement(
        Job,
        Object.assign({}, job, {
          key: index,
          run: runJobStart.bind(null, index),
        })
      ))
    );
  }

  render() {
    return React.createElement(
      'header',
      undefined,
      React.createElement(
        'h1',
        undefined,
        'Little Logger'
      ),
      this.renderJobs()
    );
  }
};

App.propTypes = {
  jobs: PropTypes.arrayOf(PropTypes.object),
  runJobStart: PropTypes.func.isRequired,
}

module.exports = connect(identity, { runJobStart })(App);
