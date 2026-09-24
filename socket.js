var log = require("./log");

var MAX_RETRIES = 10;
var CONNECT_TIMEOUT_MS = 10000;

// Shared across every bundle that includes the banner so a page opens a single connection.
var state = window.__wdsBanner__;
if (!state){
    state = window.__wdsBanner__ = {
        socket: null,
        retries: 0,
        reconnectTimer: null,
        unloading: false
    };
    window.addEventListener("beforeunload", function (){
        state.unloading = true;
    });
}

function isActive(socket){
    return socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN);
}

function connect(url, handlers){
    if (isActive(state.socket)){
        log.info("Reusing existing connection");
        return;
    }
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;

    log.info("Connecting to " + url);
    var socket = new WebSocket(url);
    state.socket = socket;

    var connectTimer = setTimeout(function (){
        if (socket.readyState === WebSocket.CONNECTING){
            log.warn("Connection attempt timed out after " + CONNECT_TIMEOUT_MS + "ms");
            socket.close();
        }
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = function (){
        clearTimeout(connectTimer);
        state.retries = 0;
        log.info("Connected");
    };

    socket.onclose = function (){
        clearTimeout(connectTimer);
        if (state.socket === socket){
            state.socket = null;
        }
        if (state.unloading){
            return;
        }
        if (state.retries === 0){
            log.warn("Disconnected");
            handlers.close();
        }
        scheduleReconnect(url, handlers);
    };

    socket.onerror = function (){
        log.error("WebSocket error on " + url);
    };

    socket.onmessage = function (event){
        var message = parseMessage(event.data);
        if (!message){
            return;
        }
        var handler = handlers[message.type];
        if (handler){
            handler(message.data, message.params);
        }
    };
}

function scheduleReconnect(url, handlers){
    if (state.retries >= MAX_RETRIES){
        log.error("Giving up after " + MAX_RETRIES + " reconnect attempts");
        return;
    }
    var delayMs = 1000 * Math.pow(2, state.retries) + Math.random() * 100;
    state.retries += 1;
    log.info("Reconnecting in " + Math.round(delayMs) + "ms (attempt " + state.retries + "/" + MAX_RETRIES + ")");

    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(function (){
        connect(url, handlers);
    }, delayMs);
}

function parseMessage(data){
    try {
        return JSON.parse(data);
    } catch (error){
        log.warn("Ignoring non-JSON message: " + data);
        return null;
    }
}

module.exports = connect;
