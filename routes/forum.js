const express = require('express')
const router = express.Router()
const mongo = require('../db')
const ObjectID = require('mongodb').ObjectID
const moment = require('moment-timezone')

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var topics = {
  'meta': 'general',
  'discussion': 'general',
  'off-topic': 'general',
  'att': 'technology',
  'webdev': 'technology',
  'programming': 'technology'
}

function loginRequired(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

function getCategoryFromTopic(topic) {
  return topics[topic]
}

function topicExists(topic) {
  return Object.keys(topics).includes(topic)
}

function parseData(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).tz('America/New_York').calendar()
    i.formatedLastPostDate = moment(i.lastPostDate).tz('America/New_York').calendar()
    i.relativeLastPostDate = moment(i.lastPostDate).startOf('minute').fromNow()
    i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
  })
  return data
}

function parseSingleData(data) {
  data.formatedPostDate = moment(data.creationDate).tz('America/New_York').calendar()
  data.formatedLastPostDate = moment(data.lastPostDate).tz('America/New_York').calendar()
  data.relativePostDate = moment(data.creationDate).startOf('minute').fromNow()
  data.relativeLastPostDate = moment(data.lastPostDate).startOf('minute').fromNow()
  if (data.replies) {
    data.replies.forEach((i) => {
      i.formatedPostDate = moment(i.creationDate).tz('America/New_York').calendar()
      i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
    })
  }
  return data
}

router
  .get('/createThread/:topic', loginRequired, (req, res) => {
    if (topicExists(req.params.topic)) {
      res.render('newThread', {lcCategory: getCategoryFromTopic(req.params.topic), category: getCategoryFromTopic(req.params.topic).capitalizeFirstLetter(), lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter()})
    }else {
      res.sendStatus(404)
    }
  })
  .get('/createReply/:id', loginRequired, (req, res) => {
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, thread) => {
        if(err){console.log(err)}else {
          if (thread !== undefined) {
            thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
            thread.lcCategory = thread.category.toLowerCase()
            thread.lcTopic = thread.topic
            thread.topic = thread.topic.capitalizeFirstLetter()
            res.render('createReply', {thread: thread})
          }else {
            res.sendStatus(404)
          }
        }
      })
  })
  .post('/createReply/:id', loginRequired, (req, res) => {
    var date = new Date()

    var newReply = {
      posterUsername: req.user.username,
      parentThread: req.params.id,
      message: req.body.message,
      creationDate: date
    }

    mongo.db.collection('threads')
      .updateOne({
        _id: new ObjectID.createFromHexString(req.params.id)
      },
      {
        $set: {
          'lastPostBy': req.user.username,
          'lastPostDate': date
        },
        $inc: {'numReplies': 1},
        $addToSet: {'replies': newReply}
      }, (err, result) => {
        if (err){console.log(err)}else {
          res.redirect('/thread/'+req.params.id)
        }
      })

  })
  .get('/thread/:id', (req, res) => {
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, thread) => {
        if(err){console.log(err); res.sendStatus(500)}else {
          var thread = parseSingleData(thread)
          thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
          thread.lcCategory = thread.category.toLowerCase()
          thread.lcTopic = thread.topic
          thread.topic = thread.topic.capitalizeFirstLetter()
          if (thread.subject.length > 18) {
            thread.browserTitle = thread.subject.slice(0, 15) + '...'
          }else {
            thread.browserTitle = thread.subject
          }
          res.render('thread', {thread: thread})
        }
      })
  })
  .post('/createThread', loginRequired, (req, res) => {

    var date = new Date()

    var newThread = {
      posterUsername: req.user.username,
      topic: req.query.topic,
      subject: req.body.subject,
      body: req.body.body,
      creationDate: date,
      lastPostBy: req.user.username,
      lastPostDate: date,
      numReplies: 0,
      replies: []
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
    res.send('ill make this page later')
  })
  .get('/:category/:topic', (req, res) => {
    if (topicExists(req.params.topic)) {

      mongo.db.collection('threads')
        .find({topic: req.params.topic})
        .sort({'lastPostDate': -1})
        .toArray((err, result) => {
          if (err) {console.log(err)}else {
            if (result.length > 0) {
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
