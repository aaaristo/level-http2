var http2= require('http2'),
    levelup= require('levelup'),
    _= require('underscore'),
    express= require('./http2expressmock'),
    util= require('./util'),
    AdmZip= require('adm-zip'),
    es= require('event-stream');

module.exports= function (opts)
{
    opts= opts || {};

    var db= levelup(opts.path || 'data',{ valueEncoding: 'binary' });

    var app= express();

    var toOpts= function (query)
        {
            if (query.limit) query.limit= Number(query.limit);

            return query;
        }, 
        handleError= function (err,res,next)
        {
           if (err.type=='NotFoundError') 
             res.status(404).end();
           else
             next(err); 
        };

    app.put('/data/:key', util.binary, function (req, res, next)
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

    app.del('/data/:key', function (req, res, next)
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

       db.createReadStream(toOpts(req.query))
         .on('error',next)
         .on('data',push)
         .on('end',_.bind(res.end,res));
    });

    app.post('/data', util.binary, function (req, res, next)
    {
        var zip= new AdmZip(req.binary),
            ops= [];

        zip.getEntries().forEach(function(e)
        {
           if (e.entryName == 'ops')
           {
               var zops= JSON.parse(e.getData().toString('utf8'));

               zops.forEach(function (zop,idx)
               {
                   var op= ops[idx];
                   ops[idx] = op ? _.extend(op,zop) : zop;
               });
           }
           else
           {
               var idx= +e.entryName.substring(2);

               if (ops[idx])
                 ops[idx].value= e.getData();
               else
                 ops[idx]= { value: e.getData() };
           }
        });

        db.batch(ops,function (err)
        {
           if (err)
             next(err);
           else
             res.end();
        });
    });

    app.get('/keys',function (req, res, next)
    {
       db.createKeyStream(toOpts(req.query))
         .on('error',next)
         .pipe(es.join(util.SEPARATOR))
         .pipe(res);
    });

    app.get('/values',function (req, res, next)
    {
       var seq= 0,
           push= function (value)
           {
              var p= res.push('/values/'+(seq++));
              p.writeHead('200');
              p.end(value); 
           };

       db.createValueStream(toOpts(req.query))
         .on('error',next)
         .on('data',push)
         .on('end',_.bind(res.end,res));
    });

    var server= http2.createServer({ plain: true },app);

    server.db= db;

    return server;
};
