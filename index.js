var ansiHTML = require("ansi-html");
var { encode } = require("html-entities");
var $ = require("./web_modules/zepto");
var log = require("./log");
var connect = require("./socket");
var resolveSocketUrl = require("./socketUrl");
require("!style-loader!css-loader!./style.css");

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
    error: "#C9302C",
    warn: "#EC971F",
    ok: "#60be56",
    compiling: "#286090",
    updated: "#31B0D5"
};

// The dev server may send several `ok` messages right after connecting;
// those still count as the initial load rather than a hot update.
var STARTUP_WINDOW_MS = 1500;
var firstOkAt = null;

function isStartingUp(){
    return firstOkAt === null || Date.now() - firstOkAt < STARTUP_WINDOW_MS;
}

if ($("#WDS-Banner-Container").length === 0){
    $("body").prepend(
            '<div id="WDS-Banner-Container">' +
            '<div id="WDS-header"><div id="WDS-status"></div></div>' +
            '<div id="WDS-errors"></div>' +
            "</div>"
    );
}

var $header = $("#WDS-header").hide();
var $status = $("#WDS-status").hide();
var $errors = $("#WDS-errors");

var hideTimer = null;
var statusTimer = null;

function setStatus(text, borderColor){
    $status.text(text);
    $header.css({ "border-color": borderColor });
}

function showBanner(text, borderColor){
    clearTimeout(hideTimer);
    clearTimeout(statusTimer);
    setStatus(text, borderColor);
    $header.show();
    $status.show();
}

function setStatusAfter(text, borderColor, delayMs){
    statusTimer = setTimeout(function (){
        setStatus(text, borderColor);
    }, delayMs);
}

function hideBannerAfter(delayMs){
    hideTimer = setTimeout(function (){
        $header.hide();
        $status.hide();
    }, delayMs);
}

function toHtml(text){
    return ansiHTML(encode(text));
}

// webpack-dev-server 3 sends errors as strings, 4+ sends stats error objects.
function formatError(error){
    if (typeof error === "string"){
        return error;
    }
    var location = [error.moduleName, error.loc].filter(Boolean).join(" ");
    var header = location ? "ERROR in " + location + "\n" : "";
    return header + (error.message || "");
}

function renderErrors(errors){
    var body = errors.map(formatError).map(toHtml).join("\n\n");
    return '<span style="color: #' + colors.red + '">Failed to compile.</span>\n\n' + body;
}

function renderDisconnected(){
    return '<span style="color: #' + colors.yellow + '">' +
            "Lost connection to webpack-dev-server.\n\n" +
            "Please restart the server to reestablish connection..." +
            "</span>";
}

function reloadPage(){
    log.info("Content changed, reloading page");
    window.location.reload();
}

var handlers = {
    invalid: function (){
        log.info("Recompiling");
        $errors.hide();
        showBanner("Recompiling...", borderColors.compiling);
    },
    "still-ok": function (){
        $errors.hide();
        showBanner("App ready.", borderColors.ok);
        hideBannerAfter(3000);
    },
    ok: function (){
        $errors.hide();
        if (isStartingUp()){
            if (firstOkAt === null){
                firstOkAt = Date.now();
            }
            log.info("App ready");
            showBanner("App ready.", borderColors.ok);
            hideBannerAfter(1500);
            return;
        }
        log.info("App hot updated");
        showBanner("App hot updated.", borderColors.updated);
        setStatusAfter("App ready.", borderColors.ok, 1000);
        hideBannerAfter(2500);
    },
    "content-changed": reloadPage,
    "static-changed": reloadPage,
    warnings: function (warnings){
        log.warn("Compiled with " + warnings.length + " warning(s)");
        $errors.hide();
        showBanner("App hot updated with warnings.", borderColors.warn);
    },
    errors: function (errors){
        log.error("Failed to compile with " + errors.length + " error(s)");
        showBanner("Errors while compiling!", borderColors.error);
        $errors.html(renderErrors(errors)).show();
    },
    close: function (){
        showBanner("Disconnected.", borderColors.warn);
        $errors.html(renderDisconnected()).show();
    }
};

var socketUrl;
try {
    socketUrl = resolveSocketUrl();
} catch (error){
    log.error("Banner disabled: " + error.message);
}

if (socketUrl){
    connect(socketUrl, handlers);
}
