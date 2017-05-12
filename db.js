// MongoDB configuration
const MongoClient = require('mongodb').MongoClient

MongoClient.connect('mongodb://main:shooot47@ds137281.mlab.com:37281/heroku_tdx1p58f', (err, connection) => {
  if (err) {console.warn('error from db.js'); console.log(err)}
  else {
    module.exports.db = connection // So db is availbe everywhere by requiring this file
    console.log('Connected to mongodb successfully.')
  }
})
