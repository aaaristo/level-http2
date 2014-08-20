var async= require('async'),
    pathToRegexp = require('path-to-regexp'),
    _= require('underscore');

module.exports= function ()
{
   var routes= { GET: [], POST: [], PUT: [], DELETE: [] },
       addRoute= function ()
       {
          var args= Array.prototype.slice.call(arguments),
              path= args.shift(),
              keys= [],
              re= pathToRegexp(path,keys),
              middleware= args;

          routes[this.method].push({ path: re,
                                     keys: keys,
                               middleware: middleware });
       },
       resolve= function (req)
       {
          var middleware;

          console.log(req.method,req.url);

          routes[req.method].some(function (route)
          {
              var match= route.path.exec(req.url);

              if (match)
              {
                req.params= {};

                route.keys.forEach(function (key,i)
                {
                    req.params[key.name]= match[i+1];                     
                });

                middleware= route.middleware;

                return true;
              }
          });

          return middleware || [];
       },
       app= function (req, res)
       {
          var middleware= resolve(req);

          async.forEachSeries(middleware,
          function (fn, next)
          {
              fn(req, res, next);
          },
          function (err)
          {
             if (err)
              res.end(err+' '+err.stack);
          }); 
       };

   app.get    = _.bind(addRoute,{ method: 'GET' });
   app.post   = _.bind(addRoute,{ method: 'POST' });
   app.put    = _.bind(addRoute,{ method: 'PUT' });
   app.delete = _.bind(addRoute,{ method: 'DELETE' });

   return app;
};
