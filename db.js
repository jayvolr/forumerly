const MongoClient = require('mongodb').MongoClient

MongoClient.connect('mongodb://107.170.32.124:27017/forumerly', (err, connection) => {
  if (err) {console.warn('error from db.js'); console.log(err)}
  else {
    module.exports.db = connection
    console.log('Connected to mongodb successfully!!')
    console.log(connection)
  }
})
