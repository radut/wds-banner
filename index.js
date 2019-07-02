/* global __resourceQuery */
var url = require("url");
var stripAnsi = require("strip-ansi");
var ansiHTML = require("ansi-html");
var Entities = require("html-entities").AllHtmlEntities;
var socket = require("./socket");
var $ = require("./web_modules/zepto");
// var $ = require("zepto");
// var $ = require("./web_modules/jquery");
require("!style-loader!css-loader!./style.css");

var entities = new Entities();

var colors = {
    reset: ["transparent", "transparent"],
    black: "181818",
    red: "E36049",
    green: "B3CB74",
    yellow: "FFD080",
    blue: "7CAFC2",
    magenta: "7FACCA",
    cyan: "C3C2EF",
    lightgrey: "EBE7E3",
    darkgrey: "6D7891"
};
ansiHTML.setColors(colors);

var borderColors = {
    error: '#C9302C',
    warn: '#EC971F',
    ok: '#60be56',
    compiling: '#286090',
    updated: '#31B0D5'
};

function getCurrentScriptSource(){
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
if (typeof __resourceQuery === "string" && __resourceQuery){
    // If this bundle is inlined, use the resource query to get the correct url.
    urlParts = url.parse(__resourceQuery.substr(1));
} else {
    // Else, get the url from the <script> this file was called with.
    var scriptHost = getCurrentScriptSource();
    scriptHost = scriptHost.replace(/\/[^\/]+$/, "");
    urlParts = url.parse((scriptHost ? scriptHost : "/"), false, true);
}


var hot = false;
var appLoaded = false;

if ($('#WDS-Banner-Container').length == 0){
    $('body').prepend('<div id="WDS-Banner-Container"/>');
    $('#WDS-Banner-Container')//
            .html('<div id="WDS-header">' +
                    '<div id="WDS-status"/>' +
                    '</div>' +
                    '<div id="WDS-errors"/>'
            );
}

var status = $("#WDS-status");
var $errors = $("#WDS-errors");
var header = $("#WDS-header");

header.hide();
status.hide();

//log-level,hot,hash

function appHotUpdated(){
    status.text("App hot updated.");
    header.css({
        'border-color': borderColors.updated
    });

}

function appReady(){
    status.text("App ready.");
    header.css({
        'border-color': borderColors.ok
    });
}

function appCompiling(){
    status.text("Recompiling...");
    header.css({
        'border-color': borderColors.compiling
    });
}

var onSocketMsg = {
    invalid: function (){
        fadeIn();
        appCompiling();
        $errors.hide();
    },
    hash: function (hash){
        currentHash = hash;

    },
    "still-ok": function (){
        fadeIn();
        $errors.hide();
        appReady();
        fadeOut(3000);
    },
    ok: function (){
        if (appLoaded === true){
            fadeIn();
            $errors.hide();
            appHotUpdated();
            setTimeout(function (){
                appReady()
            }, 1000);
            fadeOut(2500);
        } else {
            fadeIn();
            appReady();
            setTimeout(function (){
                appLoaded = true;
            }, 1500);
            fadeOut(1500);
        }
    },
    "content-changed": function (){
        self.location.reload();
    },
    warnings: function (warnings){
        fadeIn();
        $errors.hide();
        status.text("App hot updated with warnings.");
        header.css({
            'border-color': borderColors.warn
        });
    },
    errors: function (errors){
        fadeIn();
        status.text("Errors while compiling!");
        $errors.html("<span style=\"color: #" +
                colors.red +
                "\">Failed to compile.</span><br><br>" +
                ansiHTML(entities.encode(errors[0])));
        header.css({
            'border-color': borderColors.error
        });
        $errors.show();
    },
    close: function (){
        fadeIn();
        status.text("Disconnected.");
        $errors.html('<span style="color: #' + colors.yellow + ';margin-top:40px;font-size:1em;display: block">Lost' +
                ' connection to' +
                ' webpack-dev-server.<span><span style="color: #' + colors.yellow + ';margin-top:40px;font-size:1em;display: block">' +
                'Please restart the server to reestablish connection...<span>');
        header.css({
            'border-color': borderColors.warn
        });
        $errors.show();
    }
};

var fadeOutTimeout = null;

function fadeOut(time){
    fadeOutTimeout = setTimeout(function (){
        header.hide();
        status.hide();
    }, time);
}

function fadeIn(){
    if (fadeOutTimeout != null){
        clearTimeout(fadeOutTimeout);
        // header.stop();
        // status.stop();
        fadeOutTimeout = null;
    }

    header.show();
    status.show();
}


var hostname = urlParts.hostname;
var protocol = urlParts.protocol;


//check ipv4 and ipv6 `all hostname`
if (hostname === "0.0.0.0" || hostname === "::"){
    // why do we need this check?
    // hostname n/a for file protocol (example, when using electron, ionic)
    // see: https://github.com/webpack/webpack-dev-server/pull/384
    if (self.location.hostname && !!~self.location.protocol.indexOf("http")){
        hostname = self.location.hostname;
    }
}

// `hostname` can be empty when the script path is relative. In that case, specifying
// a protocol would result in an invalid URL.
// When https is used in the app, secure websockets are always necessary
// because the browser doesn't accept non-secure websockets.
if (hostname && (self.location.protocol === "https:" || urlParts.hostname === "0.0.0.0")){
    protocol = self.location.protocol;
}

var socketUrl = url.format({
    protocol: hostname === '' ? '' : protocol,
    auth: urlParts.auth,
    hostname: hostname,
    port: (urlParts.port === "0") ? self.location.port : urlParts.port,
    pathname: urlParts.path == null || urlParts.path === "/" ? "/sockjs-node" : urlParts.path
});


socket(socketUrl, onSocketMsg);



