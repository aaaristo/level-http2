var lhttp2= require('..');

var should= require('chai').should(),
    assert= require('chai').assert;

describe('client',function ()
{
       var client= lhttp2.client('http://localhost:8080/');

       before(function (done)
       {
  
           lhttp2.server().listen(8080,done);
       });

       it('can put a kv',function (done)
       {
          client.put('andrea',new Buffer('andrea','utf8'),done);
       });

       it('can read the kv',function (done)
       {
          client.get('andrea',function (err,value)
          {
              'andrea'.should.equal(value.toString('utf8'));
              done(err);
          });
       });

       it('can delete the kv',function (done)
       {
          client.del('andrea',done);
       });

       it('reports not found keys',function (done)
       {
          client.get('andrea',function (err,value)
          {
              should.exist(err);
              'NotFoundError'.should.equal(err.type);
              done();
          });
       });
});
