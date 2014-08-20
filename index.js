var http2= require('http2'),
    fs= require('fs'),
    levelup= require('levelup'),
    argv= require('optimist').argv;

var db= levelup(argv.path || 'data',{ valueEncoding: 'binary' });

var options = {
  key: fs.readFileSync(argv.key || './crts/localhost.key'),
  cert: fs.readFileSync(argv.cert || './crts/localhost.crt')
};

var app= require('./lib/http2expressmock')();

var binary= function (req,res,next)
{   
    var chunks= [];
    req.on('data', function(chunk){ chunks.push(chunk); });
    req.on('end', function ()
    {  
       try
       {  
          req.binary= Buffer.concat(chunks);
          next();
       }
       catch (ex)
       {  
          next(ex);
       }
    });
};

app.get('/data/:key',function (req, res, next)
{
    db.get(req.params.key,function (err, value)
    {
        if (err) return next(err);

        res.end(value);
    });
});

app.put('/data/:key', binary, function (req, res, next)
{
    db.put(req.params.key, req.binary, function (err, value)
    {
        if (err) return next(err);

        res.end();
    });
});

http2.createServer(options,app)
     .listen(argv.port || 8080);
