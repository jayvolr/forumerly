const express = require('express')
const router = express.Router()
const mongo = require('../db')
const passport = require('passport')
require('../passport')

router
  .post('/signup', passport.authenticate('local-register', {
    successRedirect: '/',
    failureRedirect: '/'
  }))
  .post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/'
  }))
  .get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

module.exports = router
