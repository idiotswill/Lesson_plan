// Retained path for older installations. The active runner is src/python.js.
// Python now runs through the bounded local launcher, not a remote CDN/worker.
self.postMessage({type:'error',message:'Update the whole game folder and restart the local launcher.'});
