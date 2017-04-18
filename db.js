const MongoClient = require('mongodb').MongoClient

MongoClient.connect('mongodb://localhost:27017/test', (err, connection) => {
  if (err) {console.log(err)}
  else {
    module.exports = connection
    console.log('Connected to mongodb successfully.');
  }
})
