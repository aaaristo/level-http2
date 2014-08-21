var http2= require('http2'),
    _= require('underscore'),
    util= require('./util'),
    binary= require('binary-stream'),
    es= require('event-stream');

module.exports= function (base)
{
     var client= {};

     client.put= function (key,value,cb)
     {
         var opts= require('url').parse(base+'data/'+key);
         opts.plain= true;
         opts.method= 'PUT'
         var req = http2.request(opts);

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               cb();
             else
               util.binary(res,null,function (err)
               {
                  cb(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.write(value);
         req.end();
     };

     client.get= function (key,cb)
     {
         var opts= require('url').parse(base+'data/'+key);
         opts.plain= true;
         var req = http2.request(opts);

         req.on('response',function (res)
         {
             if (res.statusCode==404)
               cb(_.extend(new Error('key not found'),{ type: 'NotFoundError' })); 
             else
               util.binary(res,null,function (err)
               {
                  if (res.statusCode==200)
                    cb(err,res.binary);
                  else
                    cb(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.end();
     };

     client.del= function (key,cb)
     {
         var opts= require('url').parse(base+'data/'+key);
         opts.plain= true;
         opts.method= 'DELETE'
         var req = http2.request(opts);

         req.on('response',function (res)
         {
             if (res.statusCode==404)
               cb(_.extend(new Error('key not found'),{ type: 'NotFoundError' })); 
             else
             if (res.statusCode==200)
               cb();
             else
               util.binary(res,null,function (err)
               {
                  cb(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.end();
     };

     client.createReadStream= function (opts)
     {
         var opts= require('url').parse(base+'data');
         opts.plain= true;
         var req = http2.request(opts),
             kv= [],
             s= es.map(function (req,done)
                {
                    req.on('response',function (res)
                    {
                        util.binary(res,null,function (err)
                        {
                           done(err,{ key: req.url.substring(6),
                                    value: res.binary });
                        });
                    });
                });

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               s.end();
             else
               util.binary(res,null,function (err)
               {
                  done(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.on('push',function (preq)
         {
             s.write(preq);
         });

         req.end();

         return s;
     };

     client.createKeyStream= function (opts)
     {
         var opts= require('url').parse(base+'keys');
         opts.plain= true;
         var req = http2.request(opts),
             s= es.through(function (data)
                { 
                   this.push(data.toString('utf8'));
                }).pipe(es.split(util.SEPARATOR));

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               res.pipe(s);
             else
               util.binary(res,null,function (err)
               {
                  s.emit('error',err || new Error(res.binary.toString('utf8')));
               });
         });

         req.end();

         return s;
     };

     client.createValueStream= function (opts)
     {
         var opts= require('url').parse(base+'data');
         opts.plain= true;
         var req = http2.request(opts),
             kv= [],
             s= es.map(function (req,done)
                {
                    req.on('response',function (res)
                    {
                        util.binary(res,null,function (err)
                        {
                           done(err,res.binary);
                        });
                    });
                });

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               s.end();
             else
               util.binary(res,null,function (err)
               {
                  done(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.on('push',function (preq)
         {
             s.write(preq);
         });

         req.end();

         return s;
     };

     client.batch= function (ops,cb)
     {
         var opts= require('url').parse(base+'data');
         opts.plain= true;
         opts.method= 'POST'
         var req = http2.request(opts), bin= binary.serialize();

         bin.pipe(req);

         bin.write(new Buffer(JSON.stringify(_.collect(ops,
         function (op) { return _.pick(op,['type','key']); })),'utf8')); 

         ops.forEach(function (op,idx)
         {
            if (op.value)
              bin.write(op.value);
         });

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               cb();
             else
               util.binary(res,null,function (err)
               {
                  cb(err || new Error(res.binary.toString('utf8')));
               });
         });

         bin.end();
     };

     return client;
};
