const express = require('express')
const router = express.Router()
const mongo = require('../db')
const moment = require('moment-timezone')
const fs = require('fs')

moment.tz.setDefault("America/New_York")

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
  if (data.replies) {
    data.replies.forEach((i) => {
      i.formatedPostDate = moment(i.creationDate).calendar()
      i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
    })
  }
  return data
}


router
  .get('/user/:username', (req, res) => {
    var profile = {}
    mongo.db.collection('users')
      .findOne({lcUsername: req.params.username.toLowerCase()}, (err, result) => {
        if (result) {
          //console.log('found user')
          profile = result
          profile.joinDate = moment(result.joinDate).format('l')
          mongo.db.collection('threads')
            .find({posterUsername: profile.username})
            .sort({'lastPostDate': -1})
            .toArray((err, result) => {
              profile.threadsCreated = result.length

              if (result.length === 0) {
                profile.threads = false
              }else if (result.length === 1) {
                profile.threads = parseSingleData(result[0])
              }else {
                profile.threads = parseData(result)
              }

              mongo.db.collection('replies')
                .find({posterUsername: profile.username})
                .sort({'creationDate': -1})
                .toArray((err, result) => {
                  profile.repliesCreated = result.length
                  profile.postCount = profile.threadsCreated + profile.repliesCreated
                  if (result.length === 0) {
                    profile.replies = false
                  }else if (result.length === 1) {
                    profile.replies = parseSingleData(result[0])
                  }else {
                    profile.replies = parseData(result)
                  }
                  //res.send(profile)
                  res.render('profile', {profile: profile, repliesTab: req.query.tab === 'replies'})
                })
            })
        }else {
          res.status(404).send('user not found')
        }
      })
  })

module.exports = router
