const express = require('express')
const router = express.Router()

router
  .get('/:app', (req, res) => {
    res.render('about/'+req.params.app)
  })

module.exports = router
