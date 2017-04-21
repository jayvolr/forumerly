const express = require('express')
const router = express.Router()
const mongo = require('../db')
const moment = require('moment-timezone')

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var topics = {
  meta: 'general'
}

function getCategoryFromTopic(topic) {
  return topics[topic]
}

function topicExists(topic) {
  return Object.keys(topics).includes(topic)
}

function parseData(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).startOf('minute').fromNow()
    i.formatedLastPostDate = moment(i.lastPostDate).startOf('minute').fromNow()
  })
  return data
}

router
  .get('/createThread', (req, res) => {
    res.render('newThread', {lcCategory: getCategoryFromTopic(req.query.topic), category: getCategoryFromTopic(req.query.topic).capitalizeFirstLetter(), lcTopic: req.query.topic, topic: req.query.topic.capitalizeFirstLetter()})
  })
  .get('/thread/:id', (req, res) => {
    res.render('thread', {id: req.params.id})
  })
  .post('/createThread', (req, res) => {

    var date = new Date()

    var newThread = {
      posterUsername: req.user.username,
      topic: req.query.topic,
      subject: req.body.subject,
      body: req.body.body,
      creationDate: date,
      lastPostBy: req.user.username,
      lastPostDate: date,
      replies: 0
    }

    mongo.db.collection('threads')
      .insert(newThread, (err, result) => {
        if (err) {console.log(err)}else {
          var category = getCategoryFromTopic(req.query.topic)
          res.redirect('/'+category+'/'+req.query.topic)
        }
      })
  })
  .get('/:category', (req, res) => {
    res.send(req.params.category)
  })
  .get('/:category/:topic', (req, res) => {
    if (topicExists(req.params.topic)) {

      mongo.db.collection('threads')
        .find()
        .toArray((err, result) => {
          if (err) {console.log(err)}else {
            if (result != undefined) {
              var parsedResult = parseData(result)
              res.render('topic', {bool: true, threads: parsedResult, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter()})
            }else {
              res.render('topic', {bool: false, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter()})
            }
          }
        })

    }else {
      res.sendStatus(404)
    }
  })

module.exports = router
