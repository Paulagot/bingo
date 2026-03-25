/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Store the timeout reference if you need to cancel it.
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a cancellable timer.
 * Usage:
 *   const t = createCancellableTimer(5000);
 *   await t.promise;   // waits 5 s unless cancelled
 *   t.cancel();        // cancels early (promise resolves immediately)
 */
export const createCancellableTimer = (ms) => {
  let timeoutId;
  let resolveRef;

  const promise = new Promise((resolve) => {
    resolveRef = resolve;
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    resolveRef?.();
  };

  return { promise, cancel };
};