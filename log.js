var PREFIX = "[WDS Banner]";

module.exports = {
    info: function (message){
        console.info(PREFIX, message);
    },
    warn: function (message){
        console.warn(PREFIX, message);
    },
    error: function (message){
        console.error(PREFIX, message);
    }
};
