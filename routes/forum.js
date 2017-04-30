const express = require('express')
const router = express.Router()
const mongo = require('../db')
const ObjectID = require('mongodb').ObjectID
const moment = require('moment-timezone')

moment.tz.setDefault("America/New_York")

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var topics = {
  'meta': 'general',
  'discussion': 'general',
  'off-topic': 'general',
  'att': 'technology',
  'webdev': 'technology',
  'programming': 'technology',
  'entertainment': 'other',
  'sports': 'other',
  'admins': 'other'
}


function loginRequired(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('info', 'You must be logged in to perform that action.')
    return res.redirect('back')
  }
  next()
}

function adminRequired(req, res, next) {
  if (req.isAuthenticated()) {
    if (!req.user.admin) {
      req.flash('error', 'Only site administrators are permitted to visit that page.')
      return res.redirect('back')
    }
    next()
  }else {
    req.flash('error', 'Only site administrators are permitted to visit that page.')
    return res.redirect('back')
  }
}

function getCategoryFromTopic(topic) {
  return topics[topic]
}

function topicExists(topic) {
  return Object.keys(topics).includes(topic)
}

function categoryExists(category) {
  return Object.values(topics).includes(category)
}

function parseData(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).calendar()
    i.formatedLastPostDate = moment(i.lastPostDate).calendar()
    i.relativeLastPostDate = moment(i.lastPostDate).startOf('minute').fromNow()
    i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
  })
  return data
}

function parseSingleData(data) {
  data.formatedPostDate = moment(data.creationDate).calendar()
  data.formatedLastPostDate = moment(data.lastPostDate).calendar()
  data.relativePostDate = moment(data.creationDate).startOf('minute').fromNow()
  data.relativeLastPostDate = moment(data.lastPostDate).startOf('minute').fromNow()
  data.posterImg = '/images/profileImages/'+data.posterUsername
  if (data.replies) {
    data.replies.forEach((i) => {
      i.posterImg = '/images/profileImages/'+i.posterUsername
      i.formatedPostDate = moment(i.creationDate).calendar()
      i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
    })
  }
  return data
}



router
  .get('/createThread/admins', loginRequired, adminRequired, (req, res) => {
    res.render('newThread', {lcCategory: 'other', category: 'Other', lcTopic: 'admins', topic: 'Admins'})
  })
  .get('/createThread/:topic', loginRequired, (req, res) => {
    if (topicExists(req.params.topic)) {
      res.render('newThread', {lcCategory: getCategoryFromTopic(req.params.topic), category: getCategoryFromTopic(req.params.topic).capitalizeFirstLetter(), lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), message: req.flash('info')})
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
            res.render('createReply', {thread: thread, message: req.flash('info')})
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
      posterImg: req.user.img,
      parentThreadID: new ObjectID.createFromHexString(req.params.id),
      message: req.body.message,
      creationDate: date
    }

    if (req.user.admin) {
      newReply.posterIsAdmin = true
    }else {
      newReply.posterIsAdmin = false
    }

    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, result) => {
        //res.send(result)
        newReply.parentThreadSubject = result.subject
        mongo.db.collection('replies')
          .insert(newReply, (err, result) => {
            if(err){console.log(err)}else {
              res.redirect('/thread/'+req.params.id)
            }
          })
      })

    mongo.db.collection('threads')
      .updateOne({ _id: new ObjectID.createFromHexString(req.params.id) },{
        $set: { 'lastPostBy': req.user.username, 'lastPostDate': date, 'lastPosterIsAdmin': newReply.posterIsAdmin },
        $inc: { 'numReplies': 1 }
      }, (err, result) => {
        if (err){console.log(err)}
      })



  })
  .get('/thread/:id', (req, res) => {
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, thread) => {
        if(err){console.log(err); res.sendStatus(500)}else if(!!thread) {
          var thread = thread
          mongo.db.collection('replies')
            .find({ parentThreadID: new ObjectID.createFromHexString(req.params.id) })
            .sort({'lastPostDate': -1})
            .toArray((err, result) => {
              if(err){console.log(err)}else {
                thread.replies = result
                thread = parseSingleData(thread)
                thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
                thread.lcCategory = thread.category.toLowerCase()
                thread.lcTopic = thread.topic
                thread.topic = thread.topic.capitalizeFirstLetter()
                if (thread.subject.length > 18) {
                  thread.browserTitle = thread.subject.slice(0, 15) + '...'
                }else {
                  thread.browserTitle = thread.subject
                }
                //res.send(thread)
                res.render('thread', {thread: thread, message: req.flash('info')})
              }
            })
        }else {
          res.status(404).send('thread not found')
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

    if (req.user.admin) {
      newThread.posterIsAdmin = true
      newThread.lastPosterIsAdmin = true
    }else {
      newThread.posterIsAdmin = false
      newThread.lastPosterIsAdmin = false
    }

    mongo.db.collection('threads')
      .insert(newThread, (err, result) => {
        if (err) {console.log(err)}else {
          var category = getCategoryFromTopic(req.query.topic)
          res.redirect('/thread/'+result.ops[0]._id)
        }
      })
  })
  .get('/general', (req, res) => {
    res.render('general')
  })
  .get('/technology', (req, res) => {
    res.render('tech')
  })
  .get('/other', (req, res) => {
    res.render('other', {error: req.flash('error')})
  })
  .get('/other/admins', adminRequired, (req, res) => {
    mongo.db.collection('threads')
      .find({topic: 'admins'})
      .sort({'lastPostDate': -1})
      .toArray((err, result) => {
        if (err) {console.log(err)}else {
          if (result.length > 0) {
            var parsedResult = parseData(result)
            res.render('topic', {bool: true, threads: parsedResult, lcTopic: 'admins', topic: 'Admins', lcCategory: 'other', category: 'Other'})
          }else {
            res.render('topic', {bool: false, lcTopic: 'admins', topic: 'Admins', lcCategory: 'other', category: 'Other'})
          }
        }
      })
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
              res.render('topic', {bool: true, threads: parsedResult, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter(), message: req.flash('info')})
            }else {
              res.render('topic', {bool: false, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter(), message: req.flash('info')})
            }
          }
        })

    }else {
      res.sendStatus(404)
    }
  })

module.exports = router
