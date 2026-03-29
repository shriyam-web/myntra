// polling-worker.js
let timerId = null;

self.onmessage = (event) => {
  if (event.data.action === 'start') {
    if (timerId) clearInterval(timerId);
    const interval = event.data.interval || 2500;
    timerId = setInterval(() => {
      self.postMessage({ action: 'tick' });
    }, interval);
  } else if (event.data.action === 'stop') {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
};
