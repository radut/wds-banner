### WebPack Dev Server Inline Banner

Mimics the behaviour of the WDS banner from live bundle from http://app/webpack-dev-server/

This is for development usage only.

This project is inspired from :

https://github.com/webpack/webpack-dev-server - overlay,banner
https://github.com/glenjamin/webpack-hot-middleware
https://www.npmjs.com/package/redbox-react

##### You will get error overlay, and informations about when the page is ready/hot updated


![alt tag](https://raw.githubusercontent.com/radut/wds-banner/master/example.gif)


#### Usage

Within the entry points of webpack add the following :


    require.resolve('wds-banner') + '?' + webpackDevServerPublicPath, // my banner+error overlay
    //or 
    'wds-banner' + '?' + webpackDevServerPublicPath, // my banner+error overlay



where webpackDevServerPublicPath is the public path defined for WDS usually /

With webpack-dev-server 4/5 the banner connects to the `/ws` endpoint of that address. Pass a different path in the query (`'wds-banner?http://localhost:8080/custom-ws'`) if the server uses a custom `client.webSocketURL.pathname`.

Everything the banner does is logged to the browser console with the `[WDS Banner]` prefix: connection attempts, reconnects, recompiles and compile results.

WDS banner can be used with WDS setup for HMR and React hot update 

    require.resolve('webpack-dev-server/client') + '?' + config.devServerPublicPath,
    require.resolve('webpack/hot/dev-server'),
    require.resolve('wds-banner') + '?' + config.devServerPublicPath, // my banner+error overlay


