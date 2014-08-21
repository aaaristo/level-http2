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

       it('can read all the data', function (done)
       {
          client.batch(expected,
          function (err)
          {
              if (err) return done(err);

              var exp= _.collect(expected,function (e)
                       {
                          return _.omit(e,['type']);
                       }),
                  kv= [];
            
              client.createReadStream()
                    .on('error',console.log)
                    .on('data',function (data)
                     {
                         kv.push(data);
                     })
                    .on('end',function ()
                    {
                        exp.should.eql(kv);
                        done();
                    });
          });
       });

       it('can read all keys', function (done)
       {
              var exp= _.pluck(expected,'key'), keys= [];

              client.createKeyStream()
                    .on('error',console.log)
                    .on('data',function (data)
                     {
                        keys.push(data); 
                     })
                    .on('end',function ()
                    {
                        exp.should.eql(keys);
                        done();
                    });
       });

       it('can read all values', function (done)
       {
              var exp= _.pluck(expected,'value'), values= [];

              client.createValueStream()
                    .on('error',done)
                    .on('data',function (data)
                     {
                         values.push(data);
                     })
                    .on('end',function ()
                    {
                        exp.should.eql(values);
                        done();
                    });
       });
});
