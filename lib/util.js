exports.SEPARATOR= '\xff';
exports.OP_END_FLAG= '\xff\xff';
exports.OP_END_FLAG_LENGTH= new Buffer('\xff\xff','utf8').length;

exports.isEndFlag= function (data)
{
    return (data.length==exports.OP_END_FLAG_LENGTH
            &&data.toString('utf8')==exports.OP_END_FLAG);
};

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
