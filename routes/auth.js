const express = require('express')
const router = express.Router()
const mongo = require('./../db')

router
  .get('/', (req, res) => {
    res.render('home')
  })

module.exports = router
