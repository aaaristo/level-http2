#!/usr/local/bin/node

var argv= require('optimist').argv
    server= require('../lib/server');

server(argv).listen(argv.port || 8080, function ()
{
   console.log('listening on '+(argv.port || 8080));
});
