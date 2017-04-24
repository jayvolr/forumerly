const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const authRoutes = require('./routes/auth')
const forumRoutes = require('./routes/forum')
const secrets = require('./secrets')
const passport = require('passport')
const moment = require('moment-timezone')
const flash = require('connect-flash')

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
  .use(flash())
  .use((req, res, next) => {
    app.locals.authenticated = req.isAuthenticated()
    next()
  })
  .get('/', (req, res) => {
    if (req.user) {
      app.locals.user = req.user
    }
    res.render('forumHome', {user: req.user, error: req.flash('error'), success: req.flash('success')})
  })
  .get('/register', (req, res) => {
    res.render('register', {message: req.flash('error')})
  })
  .get('/s', (req, res) => {
    res.send(req.user)
  })
  .get('/tz', (req, res) => {
    res.send(moment.tz.guess())
  })
  .get('/flash', function(req, res){
    // Set a flash message by passing the key, followed by the value, to req.flash().
    req.flash('success', 'Flash is back!')
    res.redirect('/')
  })
  .use(authRoutes)
  .use(forumRoutes)
  .listen('3000', () => {
    console.log('Server now listening on port 3000...')
  })
  .on('error', (error) => {
    console.error(error)
  })
