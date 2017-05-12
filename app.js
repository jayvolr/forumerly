// Start file
const express = require('express')
const bodyParser = require('body-parser')
const session = require('cookie-session')
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
  .use(session({ secret: process.env.session_secret, maxAge: 604800000 }))
  .use(passport.initialize())
  .use(passport.session())
  .use(flash())
  .use((req, res, next) => {

    if (req.isAuthenticated()) {
      app.locals.authenticated = true
      app.locals.user = req.user
    }else {
      app.locals.user = false
      app.locals.authenticated = false
    }

    next()
  })
  // Routing
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

  .listen(process.env.PORT || 3000, () => {
    console.log('Server now listening on port whatever...')
  })
  .on('error', (error) => {
    console.error(error)
  })
