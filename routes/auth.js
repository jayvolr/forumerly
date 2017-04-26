const express = require('express')
const router = express.Router()
const mongo = require('../db')
const passport = require('passport')
require('../passport')

router
  .post('/signup', passport.authenticate('local-register', {
    successRedirect: '/',
    failureRedirect: '/register',
    failureFlash: true,
    successFlash: 'Account created!'
  }))
  .post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: 'back',
    failureFlash: true
  }))
  .get('/logout', (req, res) => {
    req.logout()
    if(req.header("Referer") === 'http://localhost:3000/other/admins' || req.header("Referer") === 'http://forumerly.jayvolr.com/other/admins') {
      res.redirect('/')
    }else {
      res.redirect('back')
    }
  })

module.exports = router
