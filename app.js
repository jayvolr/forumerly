const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const authRoutes = require('./routes/auth')
const forumRoutes = require('./routes/forum')
const secrets = require('./secrets')
const passport = require('passport')

var app = express()
app.locals.partials = {navbar: 'partials/navbar', footer: 'partials/footer', head: 'partials/head'}

app
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
    console.log(req.isAuthenticated())
    if (req.user) {
      app.locals.user = req.user
      res.render('forumHome', {user: req.user})
    }else {
      res.render('home')
    }
  })
  .get('/s', (req, res) => {
    res.send(req.user)
  })
  .use(authRoutes)
  .use(forumRoutes)
  .listen('3000', () => {
    console.log('Server now listening on port 3000...')
  })
  .on('error', (error) => {
    console.error(error)
  })
