const express = require('express')
const router = express.Router()
const mongo = require('../db')
const ObjectID = require('mongodb').ObjectID
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

function parseSingleData(data) {
  data.formatedPostDate = moment(data.creationDate).startOf('minute').fromNow()
  data.formatedLastPostDate = moment(data.lastPostDate).startOf('minute').fromNow()
  return data
}

router
  .get('/createThread/:topic', (req, res) => {
    if (topicExists(req.params.topic)) {
      res.render('newThread', {lcCategory: getCategoryFromTopic(req.params.topic), category: getCategoryFromTopic(req.params.topic).capitalizeFirstLetter(), lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter()})
    }else {
      res.sendStatus(404)
    }
  })
  .get('/thread/:id', (req, res) => {
    mongo.db.collection('threads')
      .findOne({_id: new ObjectID.createFromHexString(req.params.id)}, (err, thread) => {
        if(err){console.log(err)}else {
          var thread = parseSingleData(thread)
          thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
          thread.lcCategory = thread.category.toLowerCase()
          thread.lcTopic = thread.topic
          thread.topic = thread.topic.capitalizeFirstLetter()
          res.render('thread', {thread: thread})
        }
      })
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

    //res.send(req.body)

    mongo.db.collection('threads')
      .insert(newThread, (err, result) => {
        if (err) {console.log(err)}else {
          var category = getCategoryFromTopic(req.query.topic)
          res.redirect('/thread/'+result.ops[0]._id)
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
