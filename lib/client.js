var http2= require('http2'),
    _= require('underscore'),
    util= require('./util');

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

     return client;
};
