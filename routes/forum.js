// Routes for topic and threads pages
const express = require('express')
const router = express.Router()
const mongo = require('../db')
const ObjectID = require('mongodb').ObjectID
const moment = require('moment-timezone')

moment.tz.setDefault("America/New_York") // All formated times will be in this timezone by default

// Function to capitalize the first letter of a string (used for usernames)
String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Dictionary of topics and their corresponding categories
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

// Middleware requiring the user to be authenticated
function loginRequired(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('info', 'You must be logged in to perform that action.')
    return res.redirect('back')
  }
  next()
}

// Middleware requiring the user to be an administrator
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

// Helper functions

function getCategoryFromTopic(topic) {
  return topics[topic]
}

function topicExists(topic) {
  return Object.keys(topics).includes(topic)
}

function categoryExists(category) {
  return Object.values(topics).includes(category)
}

// Formats dates for each object inside an array (the objects in the array being individual threads)
function formatThreadDates(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).calendar()
    i.formatedLastPostDate = moment(i.lastPostDate).calendar()
    i.relativeLastPostDate = moment(i.lastPostDate).startOf('minute').fromNow()
    i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
    i.posterImg = '/images/profileImages/'+i.posterUsername
  })
  return data
}

function formatRepliesDates(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).calendar()
    i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
    i.posterImg = '/images/profileImages/'+i.posterUsername
  })
  return data
}

// Formats all the dates inside of a single object (the object being a single thread)
function formatSingleObject(data) {
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

// Returns an escaped regex
function fuzzyText(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
}

router
  // Search for threads/replies via search box on nav bar
  .get('/search', (req, res) => {
    var fuzzyQuery = new RegExp(fuzzyText(req.query.query), 'gi')
    mongo.db.collection('threads')
      .find({ $or: [{ body: fuzzyQuery }, { subject: fuzzyQuery }, { posterUsername: fuzzyQuery }] })
      .toArray((err, matchingThreads) => {
        matchingThreads = formatThreadDates(matchingThreads)
        mongo.db.collection('replies')
          .find({ $or: [{ message: fuzzyQuery }, { posterUsername: fuzzyQuery }] })
          .toArray((err, matchingReplies) => {
            matchingReplies = formatRepliesDates(matchingReplies)
            // res.send(matchingThreads.concat(matchingReplies))
            res.render('search', {query: req.query.query, numResults: matchingThreads.length + matchingReplies.length, threads: matchingThreads, replies: matchingReplies})
          })
      })
  })

  // GET createThread page for the "Admins" topic specifically
  .get('/createThread/admins', loginRequired, adminRequired, (req, res) => {
    res.render('newThread', {lcCategory: 'other', category: 'Other', lcTopic: 'admins', topic: 'Admins'})
  })

  // GET createThread page for the specified topic
  .get('/createThread/:topic', loginRequired, (req, res) => {
    // Render the page only if the topic exists
    if (topicExists(req.params.topic)) {
      res.render('newThread', {lcCategory: getCategoryFromTopic(req.params.topic), category: getCategoryFromTopic(req.params.topic).capitalizeFirstLetter(), lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), message: req.flash('info')})
    }else {
      res.sendStatus(404)
    }
  })

  // GET createThread page for the specified thread via id
  .get('/createReply/:id', loginRequired, (req, res) => {
    // Find the thread in the database
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, thread) => {
        if(err){console.log(err)}else {
          // If it exists format some of its data and render the reply page
          if (thread !== undefined) {
            thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
            thread.lcCategory = thread.category.toLowerCase()
            thread.lcTopic = thread.topic
            thread.topic = thread.topic.capitalizeFirstLetter()
            res.render('createReply', {thread: thread, message: req.flash('info')})
          // If it doesn't exist send 404 status
          }else {
            res.sendStatus(404)
          }
        }
      })
  })

  // POST new reply to specified thread id
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

    // Make sure the thread exists in the database
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, result) => {
        newReply.parentThreadSubject = result.subject
        // Add reply to database and redirect to thread
        mongo.db.collection('replies')
          .insert(newReply, (err, result) => {
            if(err){console.log(err)}else {
              res.redirect('/thread/'+req.params.id)
            }
          })
      })

    // Update the dates and numReplies of the thread
    mongo.db.collection('threads')
      .updateOne({ _id: new ObjectID.createFromHexString(req.params.id) },{
        $set: { 'lastPostBy': req.user.username, 'lastPostDate': date, 'lastPosterIsAdmin': newReply.posterIsAdmin },
        $inc: { 'numReplies': 1 }
      }, (err, result) => {
        if (err){console.log(err)}
      })

  })

  // GET thread by id
  .get('/thread/:id', (req, res) => {
    // Find the thread
    mongo.db.collection('threads')
      .findOne({ _id: new ObjectID.createFromHexString(req.params.id) }, (err, thread) => {
        if(err){console.log(err); res.sendStatus(500)}else if(!!thread) { // If thread is found
          var thread = thread
          // Find the thread's replies
          mongo.db.collection('replies')
            .find({ parentThreadID: new ObjectID.createFromHexString(req.params.id) })
            .sort({'lastPostDate': -1})
            .toArray((err, result) => {
              if(err){console.log(err)}else {
                // Date formatting and adition information
                thread.replies = result
                thread = formatSingleObject(thread)
                thread.category = getCategoryFromTopic(thread.topic).capitalizeFirstLetter()
                thread.lcCategory = thread.category.toLowerCase()
                thread.lcTopic = thread.topic
                thread.topic = thread.topic.capitalizeFirstLetter()
                if (thread.subject.length > 18) {
                  thread.browserTitle = thread.subject.slice(0, 15) + '...'
                }else {
                  thread.browserTitle = thread.subject
                }
                // Render thread
                // res.send(thread)
                res.render('thread', {thread: thread, message: req.flash('info')})
              }
            })
        }else { // If thread is not found, send 404 status
          res.status(404).send('thread not found')
        }
      })
  })

  // POST new thread
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

    // Add thread to database
    mongo.db.collection('threads')
      .insert(newThread, (err, result) => {
        if (err) {console.log(err)}else {
          var category = getCategoryFromTopic(req.query.topic)
          res.redirect('/thread/'+result.ops[0]._id)
        }
      })
  })

  // Category routes
  .get('/general', (req, res) => {
    res.render('general')
  })
  .get('/technology', (req, res) => {
    res.render('tech')
  })
  .get('/other', (req, res) => {
    res.render('other', {error: req.flash('error')})
  })

  // Route specifically for the Admins topic
  .get('/other/admins', adminRequired, (req, res) => {
    mongo.db.collection('threads')
      .find({topic: 'admins'})
      .sort({'lastPostDate': -1})
      .toArray((err, result) => {
        if (err) {console.log(err)}else {
          if (result.length > 0) {
            var parsedResult = formatThreadDates(result)
            res.render('topic', {bool: true, threads: parsedResult, lcTopic: 'admins', topic: 'Admins', lcCategory: 'other', category: 'Other'})
          }else {
            res.render('topic', {bool: false, lcTopic: 'admins', topic: 'Admins', lcCategory: 'other', category: 'Other'})
          }
        }
      })
  })

  // Topic page for the specified category and topic
  .get('/:category/:topic', (req, res) => {
    // Make sure topic exists
    if (topicExists(req.params.topic)) {
      mongo.db.collection('threads')
        .find({topic: req.params.topic})
        // Sort by lastPostDate
        .sort({'lastPostDate': -1})
        .toArray((err, result) => {
          if (err) {console.log(err)}else {
            // Render topic
            if (result.length > 0) {
              var parsedResult = formatThreadDates(result)
              res.render('topic', {bool: true, threads: parsedResult, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter(), message: req.flash('info')})
            }else {
              res.render('topic', {bool: false, lcTopic: req.params.topic, topic: req.params.topic.capitalizeFirstLetter(), lcCategory: req.params.category,category: req.params.category.capitalizeFirstLetter(), message: req.flash('info')})
            }
          }
        })
    // If topic does NOT exist, send 404
    }else {
      res.sendStatus(404)
    }
  })

// Export these routes to be used in app.js
module.exports = router
