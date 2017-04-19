const express = require('express')
const router = express.Router()
const mongo = require('./../db')

router
  .get('/auth', (req, res) => {
    res.send(req.session)
  })
  .post('/signup', (req, res) => {
    res.send(req.body)
  })

module.exports = router
