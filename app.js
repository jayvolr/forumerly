// Start file

console.log('HELLO')

const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const secrets = require('./secrets')
const passport = require('passport')
const moment = require('moment-timezone')
const flash = require('connect-flash')

var app = express()

// Global partials values for the view engine (to avoid having to define the path for each request)
app.locals.partials = {navbar: 'partials/navbar', footer: 'partials/footer', head: 'partials/head'}

// App setup
app
  .set('view engine', 'hjs')
  .use(express.static(__dirname + '/public'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: false}))

  // Sessions and passport setup
  .use(session({
    store: new RedisStore(),
    secret: secrets.session_secret, // So the secret isn't shown in the public repository
    resave: false,
    saveUninitialized: false
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(flash())

  // Whenever any page is loaded, set global user variable to be accessed by the view engine
  .use((req, res, next) => {
    if (req.user) {
      app.locals.user = req.user
    }
    app.locals.authenticated = req.isAuthenticated()
    next()
  })

  .get('/', (req, res) => {
    res.render('forumHome', {user: req.user, error: req.flash('error'), success: req.flash('success')})
  })
  .get('/register', (req, res) => {
    res.render('register', {message: req.flash('error')})
  })

  // External routing
  .use(require('./routes/user'))
  .use(require('./routes/auth'))
  .use(require('./routes/forum'))

  .listen('3000', () => {
    console.log('Server now listening on port 3000...')
  })
  .on('error', (error) => {
    console.error(error)
  })
