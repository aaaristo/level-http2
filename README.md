level-http2
===========

Access a [leveldb](http://leveldb.org/) instance via [HTTP2](https://github.com/molnarg/node-http2)

## Client

```javascript
var levelHTTP2= require('level-http2');

var db= levelHTTP2.client('http://127.0.0.1:8080/');

// db is a normal level-up api
db.put('mykey','myvalue',function (err,value)
{
    db.get('mykey',function (err,value)
    {
        console.log(err, value);
    });
});

```

## Server (embedded)

```javascript
var levelHTTP2= require('level-http2');

levelHTTP2.server().listen(8080);
```

## Server (cli)

```sh
$ level-http2 --path ./data --port 8080
```
