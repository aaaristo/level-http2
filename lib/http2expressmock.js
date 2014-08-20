var async= require('async'),
    url= require('url'),
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
       resolve= function (req,parts)
       {
          var middleware;

          //console.log(req.method,req.url,req.query);

          routes[req.method].some(function (route)
          {
              var match= route.path.exec(parts.pathname);

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

          return middleware;
       },
       app= function (req, res)
       {
          var parts= url.parse(req.url,true);

          req.query= parts.query;

          var middleware= resolve(req,parts);

          res.status= function (code)
          {
              res.statusCode= code;
              return res;
          };

          if (!middleware)
              res.status(404).end();
          else
              async.forEachSeries(middleware,
              function (fn, next)
              {
                  fn(req, res, next);
              },
              function (err)
              {
                 if (err)
                   res.status(500).end(err+' '+err.stack);
              }); 
       };

   app.get    = _.bind(addRoute,{ method: 'GET' });
   app.post   = _.bind(addRoute,{ method: 'POST' });
   app.put    = _.bind(addRoute,{ method: 'PUT' });
   app.del    = _.bind(addRoute,{ method: 'DELETE' });

   return app;
};
