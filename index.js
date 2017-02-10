/* global __resourceQuery */
var url = require("url");
var stripAnsi = require("strip-ansi");
var ansiHTML = require("ansi-html");
var Entities = require("html-entities").AllHtmlEntities;
var socket = require("./socket");
var $ = require("jquery");
require("!style-loader!css-loader!./style.css");

var entities = new Entities();

var colors = {
    reset : ["transparent", "transparent"],
    black : "181818",
    red : "E36049",
    green : "B3CB74",
    yellow : "FFD080",
    blue : "7CAFC2",
    magenta : "7FACCA",
    cyan : "C3C2EF",
    lightgrey : "EBE7E3",
    darkgrey : "6D7891"
};
ansiHTML.setColors(colors);

function getCurrentScriptSource() {
    // `document.currentScript` is the most accurate way to find the current script,
    // but is not supported in all browsers.
    if (document.currentScript)
        return document.currentScript.getAttribute("src");
    // Fall back to getting all scripts in the document.
    var scriptElements = document.scripts || [];
    var currentScript = scriptElements[scriptElements.length - 1];
    if (currentScript)
        return currentScript.getAttribute("src");
    // Fail as there was no script to use.
    throw new Error("[WDS-Banner] Failed to get current script source");
}


var urlParts;
if (typeof __resourceQuery === "string" && __resourceQuery) {
    // If this bundle is inlined, use the resource query to get the correct url.
    urlParts = url.parse(__resourceQuery.substr(1));
} else {
    // Else, get the url from the <script> this file was called with.
    var scriptHost = getCurrentScriptSource();
    scriptHost = scriptHost.replace(/\/[^\/]+$/, "");
    urlParts = url.parse((scriptHost ? scriptHost : "/"), false, true);
}


var hot = false;
var currentHash = "";

if ($('#WebPackBanner-header').length == 0) {
    $('body').prepend('<pre id="WebPackBanner-errors"></pre>');
    $('body').prepend('<div id="WebPackBanner-header">' +
        '<div id="WebPackBanner-status"></div>' +
        '<div id="WebPackBanner-okness"></div>' +
        '</div>');
}
var status = $("#WebPackBanner-status");
var okness = $("#WebPackBanner-okness");
var $errors = $("#WebPackBanner-errors");
var header = $("#WebPackBanner-header");


var onSocketMsg = {
    invalid : function () {
        okness.text("");
        status.text("App updated. Recompiling...");
        header.css({
            'border-color' : "#96b5b4"
        });
        $errors.hide();
    },
    hash : function (hash) {
        currentHash = hash;
    },
    "still-ok" : function () {
        okness.text("");
        $errors.hide();
        status.text("App ready.");
        header.css({
            'border-color' : "#A3BE8C"
        });
    },
    ok : function () {
        okness.text("");
        $errors.hide();
        
        status.text("App hot update.");
        header.css({
            'border-color' : "#96b5b4"
        });
        setTimeout(function () {
            status.text("App ready.");
            header.css({
                'border-color' : "#A3BE8C"
            });
        }, 1500);
        
    },
    "content-changed" : function () {
        self.location.reload();
    },
    warnings : function (warnings) {
        okness.text("Warnings while compiling.");
        $errors.hide();
        status.text("App hot update.");
    },
    errors : function (errors) {
        var strippedErrors = errors.map(function (error) {
            return stripAnsi(error);
        });
        status.text("App updated with errors. No reload!");
        okness.text("Errors while compiling.");
        $errors.html("<span style=\"color: #" +
            colors.red +
            "\">Failed to compile.</span><br><br>" +
            ansiHTML(entities.encode(errors[0])));
        header.css({
            'border-color' : "#ebcb8b"
        });
        $errors.show();
    },
    close : function () {
        status.text("");
        okness.text("Disconnected.");
        $errors.html('<span style="color: #' + colors.yellow + ';margin-top:40px;font-size:1em;display: block">Lost' +
            ' connection to' +
            ' webpack-dev-server.<span><span style="color: #' + colors.yellow + ';margin-top:40px;font-size:1em;display: block">' +
            'Please restart the server to reestablish connection...<span>');
        header.css({
            'border-color' : "#ebcb8b"
        });
        $errors.show();
    }
};

var hostname = urlParts.hostname;
var protocol = urlParts.protocol;


//check ipv4 and ipv6 `all hostname`
if (hostname === "0.0.0.0" || hostname === "::") {
    // why do we need this check?
    // hostname n/a for file protocol (example, when using electron, ionic)
    // see: https://github.com/webpack/webpack-dev-server/pull/384
    if (self.location.hostname && !!~self.location.protocol.indexOf("http")) {
        hostname = self.location.hostname;
    }
}

// `hostname` can be empty when the script path is relative. In that case, specifying
// a protocol would result in an invalid URL.
// When https is used in the app, secure websockets are always necessary
// because the browser doesn't accept non-secure websockets.
if (hostname && (self.location.protocol === "https:" || urlParts.hostname === "0.0.0.0")) {
    protocol = self.location.protocol;
}

var socketUrl = url.format({
    protocol : protocol,
    auth : urlParts.auth,
    hostname : hostname,
    port : (urlParts.port === "0") ? self.location.port : urlParts.port,
    pathname : urlParts.path == null || urlParts.path === "/" ? "/sockjs-node" : urlParts.path
});


socket(socketUrl, onSocketMsg);



