const express = require('express')
const router = express.Router()
const mongo = require('./../db')

router
  .get('/', (req, res) => {
    res.send(req.session)
    //res.render('home')
  })
  .get('/init', (req, res) => {
    req.session.initialized = true
    res.send('session initialized...')
  })

module.exports = router
