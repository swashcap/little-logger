const { applyMiddleware, createStore } = require('redux');
const createLogger = require('redux-logger');
const rootReducer = require('../state/index');
const thunk = require('redux-thunk').default;

module.exports = function configureStore(preloadedState) {
  const store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(thunk, createLogger({ collapsed: true }))
  );

  // Just copy redux's example
  if (module.hot) {
    module.hot.accept('../state/index', () => {
      const nextRootReducer = require('../state/index');
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
};
