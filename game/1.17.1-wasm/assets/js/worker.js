importScripts('splits.js');

self.onmessage = async ({ data }) => {
  if (data.type === 'fetch') {
    try {
      const res = await fetchSplitsMulti(data.urls);
      self.postMessage({
        type: 'res',
        res
      });
    } catch (e) {
      self.postMessage({
        type: 'error',
        error: e.message
      });
    }
  }
};