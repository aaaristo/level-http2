exports.SEPARATOR= '\xff';

exports.binary= function (req, res, next)
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
