// MongoDB configuration
const MongoClient = require('mongodb').MongoClient

MongoClient.connect('mongodb://localhost:27017/forumerly', (err, connection) => {
  if (err) {console.warn('error from db.js'); console.log(err)}
  else {
    module.exports.db = connection // So db is availbe everywhere by requiring this file
    console.log('Connected to mongodb successfully.')
  }
})
