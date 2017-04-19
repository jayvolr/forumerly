const express = require('express')
const router = express.Router()
const mongo = require('./../db')
const authRoutes = require('./auth');

router
  .get('/', (req, res) => {
    res.render('forumerly/home')  
  })
  .use(authRoutes)

module.exports = router
