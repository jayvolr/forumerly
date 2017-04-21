const mongo = require('./db')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const ObjectID = require('mongodb').ObjectID

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, authenticate))

passport.use("local-register", new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, register))

function authenticate(req, email, password, done) {
  mongo.db.collection("users")
    .findOne({ email: email }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (!user || !(password === user.password)) {
        return done(null, false, { message: 'Invalid email or password' })
      }
      return done(null, user)
    })
}

function register(req, email, password, done) {
  mongo.db.collection('users')
    .findOne({ email: email }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (user) {
        console.log('email catch')
        return done(null, false, {message:'Email is already in use'})
      }
      mongo.db.collection('users')
        .findOne({ username: req.body.username }, {collation: {locale: "en", strength: 2}}, (err, user) => {
          if (err) {return done(err)}
          if (user) {
            console.log('username catch')
            return done(null, false, {message:'Username is already in use'})
          }

          var newUser = {
            email: email,
            username: req.body.username,
            password: password
          }

          mongo.db.collection('users')
            .insert(newUser, (err, result) => {
              if (err) {return done(err)}
              return done(null, result.ops[0])
            })
        })
    })
}

passport.serializeUser(function(user, done) {
  done(null, user._id.toHexString())
})

passport.deserializeUser(function(id, done) {
  mongo.db.collection('users')
    .findOne({ _id: new ObjectID.createFromHexString(id) }, (err, user) => {
      done(err, user)
    })
})
