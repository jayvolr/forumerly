const MongoClient = require('mongodb').MongoClient

MongoClient.connect('mongodb://localhost:27017/forumerly', (err, connection) => {
  if (err) {console.log(err)}
  else {
    module.exports.db = connection
    console.log('Connected to mongodb successfully.');
  }
})
