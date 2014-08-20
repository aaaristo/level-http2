var http2= require('http2'),
    levelup= require('levelup'),
    _= require('underscore'),
    express= require('./http2expressmock'),
    util= require('./util');

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

    app.post('/data', function (req, res, next)
    {
        var ops, last=-1;

        req.on('data',function (data)
            {
               if (!ops)
                 ops= JSON.parse(data.toString('utf8'));
               else
               for (var i=last+1;i<ops.length;i++)
               {
                   var op= ops[i];

                   if (op.type=='put'&&op.value===undefined)
                   {
                      op.value= data;
                      last= i;
                      break;
                   }
               }
            })
            .on('end',function ()
            {
               db.batch(ops,function (err)
               {
                   if (err)
                     next(err);
                   else
                     res.end();
               });
            });
    });

    app.get('/keys',function (req, res, next)
    {
       db.createKeyStream(toOpts(req.query))
         .on('error',next)
         .pipe(res);
    });

    app.get('/values',function (req, res, next)
    {
       db.createValueStream(toOpts(req.query))
         .on('error',next)
         .pipe(res);
    });

    var server= http2.createServer({ plain: true },app);

    server.db= db;

    return server;
};
