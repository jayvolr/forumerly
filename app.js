const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const authRoutes = require('./routes/auth')
const secrets = require('./secrets')
const passport = require('passport')

express()
  .set('view engine', 'hjs')
  .use(express.static(__dirname + '/public'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: false}))
  .use(session({
    store: new RedisStore(),
    secret: secrets.session_secret,
    resave: false,
    saveUninitialized: false
  }))
  .use(passport.initialize())
  .use(passport.session())
  .get('/', (req, res) => {
    if (req.user) {
      console.warn('should now render the navbar')
      res.render('forumHome', {user: req.user})
    }else {
      console.warn('no req.user')
      res.render('home')
    }
  })
  .use(authRoutes)
  .listen('3000', () => {
    console.log('Server now listening on port 3000...')
  })
  .on('error', (error) => {
    console.error(error)
  })
