function socket(url, handlers){
  // Check if a socket already exists on window and is still active
  if (window.__wdsBannerSocket__ &&
      (window.__wdsBannerSocket__.readyState === WebSocket.CONNECTING ||
       window.__wdsBannerSocket__.readyState === WebSocket.OPEN)) {
    console.log("[WDS Banner] WebSocket already exists, reusing existing connection");
    return;
  }

  // Initialize retries on window if not exists
  if (typeof window.__wdsBannerRetries__ === 'undefined') {
    window.__wdsBannerRetries__ = 0;
  }

  // Create new WebSocket and store on window
  var sock = new WebSocket(url);
  window.__wdsBannerSocket__ = sock;

  sock.onopen = function (){
    console.log("[WDS Banner] Connected");
    window.__wdsBannerRetries__ = 0;
  }

  sock.onclose = function (){
    console.log("[WDS Banner] Disconnected");
    if (window.__wdsBannerRetries__ === 0)
      handlers.close();

    // Clear the global socket reference
    window.__wdsBannerSocket__ = null;

    // After 10 retries stop trying, to prevent logspam.
    if (window.__wdsBannerRetries__ <= 10){
      // Exponentially increase timeout to reconnect.
      // Respectfully copied from the package `got`.
      var retryInMs = 1000 * Math.pow(2, window.__wdsBannerRetries__) + Math.random() * 100;
      window.__wdsBannerRetries__ += 1;

      setTimeout(function (){
        socket(url, handlers);
      }, retryInMs);
    }
  };

  sock.onerror = function (error){
    console.log("[WDS Banner] WebSocket error:", error);
  };

  sock.onmessage = function (e){
    // This assumes that all data sent via the websocket is JSON.
    var msg = JSON.parse(e.data);
    if (handlers[msg.type])
      handlers[msg.type](msg.data);
  };
}

module.exports = socket;
