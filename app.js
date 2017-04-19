const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const forumerlyRoutes = require('./routes/forumerly')
const aboutRoutes = require('./routes/about');

express()
  .set('view engine', 'hjs')
  .use(express.static(__dirname + '/public'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: false}))
  .use(session({
    store: new RedisStore(),
    secret: 'mertes likes seemingly pointless facts',
    resave: false,
    saveUninitialized: false
  }))
  .get('/', (req, res) => {
    res.render('home')
  })
  .use('/about', aboutRoutes)
  .use('/forumerly', forumerlyRoutes)
  .listen('3000', () => {
    console.log('Server now listening on port 3000...')
  })
  .on('error', (error) => {
    console.log(error)
  })
