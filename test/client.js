var lhttp2= require('..'),
    _= require('underscore'),
    async= require('async');

var should= require('chai').should(),
    assert= require('chai').assert;

describe('client',function ()
{
       var client= lhttp2.client('http://localhost:8080/');

       before(function (done)
       {
           var server= lhttp2.server();
           server.db.createKeyStream()
                    .on('data',function (key)
                    {
                         server.db.del(key);
                    })
                    .on('end',function ()
                    { 
                       server.listen(8080,done);
                    });
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

       var expected= [{ type: 'put', key: 'andrea', value: new Buffer(_.range(1024).join('andrea'),'utf8') },
                      { type: 'put', key: 'nico', value: new Buffer('nico','utf8') }];

console.log(expected);

       it('can read all the data', function (done)
       {
          client.batch(expected,
          function (err)
          {
              if (err) return done(err);

              var exp= expected.slice();
            
              client.createReadStream()
                    .on('error',done)
                    .on('data',function (data)
                     {
                        console.log(data);
                      //   _.omit(exp.shift(),['type']).should.eql(data)
                     })
                    .on('end',done);
          });
       });

       it('can read all keys', function (done)
       {
              var exp= expected.slice();

              client.createKeyStream()
                    .on('error',done)
                    .on('data',function (data)
                     {
                         exp.shift().key.should.eql(data)
                     })
                    .on('end',done);
       });

       it('can read all values', function (done)
       {
              var exp= expected.slice();

              client.createValueStream()
                    .on('error',done)
                    .on('data',function (data)
                     {
                         try
                         {
                           exp.shift().value.should.eql(data)
                         }
                         catch (ex)
                         {
                           done(ex);
                           process.exit(1);
                         }
                     })
                    .on('end',done);
       });
});
