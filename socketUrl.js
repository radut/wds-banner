/* global __resourceQuery */
var url = require("url");

var DEFAULT_PATH = "/ws";

function getCurrentScriptSource(){
    if (document.currentScript){
        return document.currentScript.getAttribute("src");
    }
    var scripts = document.scripts || [];
    var lastScript = scripts[scripts.length - 1];
    if (lastScript){
        return lastScript.getAttribute("src");
    }
    throw new Error("[WDS Banner] Failed to get current script source");
}

// The dev server address comes from the resource query (`wds-banner?http://host:port/`)
// or, when the bundle is inlined without one, from the location of the current <script>.
function parseServerUrl(){
    if (typeof __resourceQuery === "string" && __resourceQuery){
        return url.parse(__resourceQuery.substr(1));
    }
    var scriptDirectory = getCurrentScriptSource().replace(/\/[^\/]+$/, "");
    return url.parse(scriptDirectory || "/", false, true);
}

function buildSocketUrl(serverUrl, pageLocation){
    var hostname = serverUrl.hostname;
    var protocol = serverUrl.protocol || pageLocation.protocol;
    var isBindToAnyAddress = hostname === "0.0.0.0" || hostname === "::";
    var pageIsHttp = pageLocation.protocol.indexOf("http") === 0;

    // 0.0.0.0 / :: are listen addresses, not something the browser can reach.
    // Location has no hostname under file:// (electron, ionic), so keep it as is there.
    if (isBindToAnyAddress && pageLocation.hostname && pageIsHttp){
        hostname = pageLocation.hostname;
    }
    // Browsers refuse insecure websockets from an https page.
    if (hostname && (pageLocation.protocol === "https:" || isBindToAnyAddress)){
        protocol = pageLocation.protocol;
    }

    var port = serverUrl.port;
    if (!port || port === "0"){
        port = pageLocation.port;
    }

    var pathname = serverUrl.pathname;
    if (!pathname || pathname === "/"){
        pathname = DEFAULT_PATH;
    }

    return url.format({
        protocol: protocol === "https:" ? "wss:" : "ws:",
        slashes: true,
        auth: serverUrl.auth,
        hostname: hostname || pageLocation.hostname || "localhost",
        port: port,
        pathname: pathname
    });
}

function resolveSocketUrl(){
    return buildSocketUrl(parseServerUrl(), window.location);
}

module.exports = resolveSocketUrl;
module.exports.buildSocketUrl = buildSocketUrl;
