// Routes for signup and login/logout
const express = require('express')
const router = express.Router()
const mongo = require('../db')
const passport = require('passport')
require('../passport')

router
  // POST signup via passport local strategey
  .post('/signup', passport.authenticate('local-register', {
    successRedirect: '/',
    failureRedirect: '/register',
    failureFlash: true,
    successFlash: 'Account created!'
  }))

  // POST login via passport local strategey
  .post('/login', passport.authenticate('local', {
    successRedirect: 'back',
    failureRedirect: 'back',
    failureFlash: true
  }))

  // Google OAuth routes
  .get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] })) 

  .get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/register' }), (req, res) => {
      res.redirect('/')
  })

  // GET Logout and redirect
  .get('/logout', (req, res) => {
    req.logout()
    // If the previous page is one of these, redirect to home
    if(req.header("Referer") === 'http://localhost:3000/other/admins'
    || req.header("Referer") === 'http://forumerly.jayvolr.com/other/admins'
    || req.header("Referer") === 'http://localhost:3000/settings'
    || req.header("Referer") === 'http://forumerly.jayvolr.com/settings'
    ) {
      res.redirect('/')
    // Else return to the previous page
    }else {
      res.redirect('back')
    }
  })

// Export these routes to be used in app.js
module.exports = router
