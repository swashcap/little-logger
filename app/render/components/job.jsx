const classNames = require('classnames');
const React = require('react');

const { Component, PropTypes } = React;

class Job extends Component {
  handleRunClick(event) {
    event.preventDefault();
    this.props.run();
  }
  
  render() {
    const { args, error, running, type } = this.props;

    const className = classNames('job', {
      'is-error': !!error,
      'is-running': running,
    });

    return (
      <div className={className}>
        <ul>
          <li><strong>Type:</strong> {type}</li>
          <li><strong>Data:</strong> <code>{args}</code></li>
          <button
            disabled={running}
            onClick={this.handleRunClick.bind(this)}
            type="button"
          >
            Run
          </button>
        </ul>
      </div>
    )
  }
}

Job.propTypes = {
  args: PropTypes.array.isRequired,
  error: PropTypes.object,
  run: PropTypes.func.isRequired,
  running: PropTypes.bool.isRequired,
  type: PropTypes.string.isRequired,
};

module.exports = Job;
