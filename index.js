var http2= require('http2'),
    fs= require('fs'),
    levelup= require('levelup'),
    argv= require('optimist').argv;

var db= levelup(argv.path || 'data',{ valueEncoding: 'binary' });

var app= require('./lib/http2expressmock')();

var opts= function (query)
    {
        if (query.limit) query.limit= Number(query.limit);

        return query;
    }, 
    binary= function (req,res,next)
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
    },
    handleError= function (err,res,next)
    {
       if (err.type=='NotFoundError') 
         res.status(404).end();
       else
         next(err); 
    };

app.put('/data/:key', binary, function (req, res, next)
{
    db.put(req.params.key, req.binary, function (err, value)
    {
        if (err) return handleError(err,res,next);

        res.end();
    });
});

app.get('/data/:key',function (req, res, next)
{
    db.get(req.params.key,function (err, value)
    {
        if (err) return handleError(err,res,next);

        res.end(value);
    });
});

app.del('/data/:key', binary, function (req, res, next)
{
    db.del(req.params.key, function (err, value)
    {
        if (err) return handleError(err,res,next);

        res.end();
    });
});

app.get('/data',function (req, res, next)
{
   var push= function (kv)
       {
          var p= res.push('/data/'+kv.key);
          p.writeHead('200');
          p.end(kv.value); 
       };

   db.createReadStream(opts(req.query))
     .on('error',next)
     .on('data',push)
     .on('end',res.end);
});

app.post('/data',function (req, res, next)
{
   req.pipe(db.createWriteStream())
      .on('error',next)
      .on('finish',res.end);
});

app.get('/keys',function (req, res, next)
{
   db.createKeyStream(opts(req.query))
     .on('error',next)
     .pipe(res);
});

app.get('/values',function (req, res, next)
{
   db.createValueStream(opts(req.query))
     .on('error',next)
     .pipe(res);
});

http2.createServer({ plain: true },app)
     .listen(argv.port || 8080);
