// Passport.js logic
const mongo = require('./db')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const ObjectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt-nodejs')
const secrets = require('./secrets')

// Local login/signup (username and password)
passport.use(new LocalStrategy({
  passReqToCallback: true
}, authenticate))

passport.use("local-register", new LocalStrategy({
  passReqToCallback: true
}, register))

// Google OAuth 2.0 strategey
passport.use(new GoogleStrategy({
    clientID: secrets.googleClientID,
    clientSecret: secrets.googleClientSecret,
    callbackURL: "http://forumerly.jayvolr.me/auth/google/callback"
  },
  function (accessToken, refreshToken, profile, done) {
    var date = new Date()
    // Search for user with given google user id
    mongo.db.collection('users')
      .findOne({ oauth_provider: 'google', oauth_id: profile.id }, (err, result) => {
        // If they exist (have signed in before), return that user
        if (result) {
          done(null, result)
        // Else, create the user
        }else {
          var newUser = {
            oauth_provider: 'google',
            oauth_id: profile.id,
            username: profile.displayName,
            lcUsername: profile.displayName.toLowerCase(),
            joinDate: date,
            img: profile.photos[0].value + '0'
          }
          mongo.db.collection('users')
            .insert(newUser, (err, result) => {
              return done(null, result.ops[0])
            })
        }
      })
  }
))

// Called by auth.js via passport when a user attempts to login
function authenticate(req, username, password, done) {
  mongo.db.collection("users")
    .findOne({ lcUsername: username.toLowerCase() }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Invalid username or password.' })
      }
      return done(null, user)
    })
}

// Called by auth.js via passport when a user attempts to create a new account
function register(req, username, password, done) {
  // Password and username validation
  if (password !== req.body.password2) {
    return done(null, false, { message: 'Passwords do not match.' })
  }else if (username.length > 20) {
    return done(null, false, { message: 'Username cannot be longer than twenty characters.' })
  }else if (username.length < 3) {
    return done(null, false, { message: 'Username must be atleast three characters.' })
  }

  var date = new Date()
  // Checks if username is already in use
  mongo.db.collection('users')
    .findOne({ lcUsername: username.toLowerCase() }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (user) {
        console.log('username catch')
        return done(null, false, {message:'Username is already in use.'})
      }
      // Past here will only run if the username was found to be not in use
      var newUser = {
        username: req.body.username,
        lcUsername: req.body.username.toLowerCase(),
        password: bcrypt.hashSync(password),
        joinDate: date,
        img: '/images/profile.png'
      }

      // Insert the new username into the database
      mongo.db.collection('users')
        .insert(newUser, (err, result) => {
          if (err) {return done(err)}
          return done(null, result.ops[0])
        })

    })
}

// Passport serialize and deserialize functions
passport.serializeUser(function(user, done) {
  done(null, user._id.toHexString())
})

passport.deserializeUser(function(id, done) {
  mongo.db.collection('users')
    .findOne({ _id: new ObjectID.createFromHexString(id) }, (err, user) => {
      done(err, user)
    })
})
