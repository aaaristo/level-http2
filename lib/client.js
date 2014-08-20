var http2= require('http2'),
    _= require('underscore'),
    util= require('./util'),
    stream= require('stream'),
    through= require('through');

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
             rs = new stream.Readable({ objectMode: true }),
             receiving= 0,
             error= false,
             done= function (err,data)
             {
                 if (error) return;

                 if (err)
                 {
                   rs.emit('error',err);
                   error= true;
                   return;
                 }
                 else
                 if (data)
                 {
                   receiving--;
                   rs.emit('data',data);
                 }

                 if (receiving==0)
                   rs.emit('end'); 
             };

         rs._read= function (){};

         req.on('response',function (res)
         {
             if (res.statusCode==200)
               done();
             else
               util.binary(res,null,function (err)
               {
                  done(err || new Error(res.binary.toString('utf8')));
               });
         });

         req.on('push',function (preq)
         {
             receiving++;

             preq.on('response',function (pres)
             {
               util.binary(pres,null,function (err)
               {
                  if (pres.statusCode==200)
                    done(err,{ key: preq.url.substring(6), value: pres.binary });
                  else
                    done(err || new Error(pres.binary.toString('utf8')));
               });
             }); 
         });

         req.end();

         return rs;
     };

     client.createKeyStream= function (opts)
     {
         var opts= require('url').parse(base+'keys');
         opts.plain= true;
         var req = http2.request(opts),
             s= through(function (data)
                { 
                   this.push(data.toString('utf8'));
                });

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
         var opts= require('url').parse(base+'keys');
         opts.plain= true;
         var req = http2.request(opts),
             s= through();

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

     client.batch= function (ops,cb)
     {
         var opts= require('url').parse(base+'data');
         opts.plain= true;
         opts.method= 'POST'
         var req = http2.request(opts);

         req.write(JSON.stringify(_.collect(ops,
         function (op) { return _.pick(op,['type','key']); }))); 
         
         _.pluck(ops,'value').forEach(function (value)
         {
            if (value)
              req.write(value);
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

         req.end();
     };

     return client;
};
