const express = require('express')
const router = express.Router()
const mongo = require('../db')
const bcrypt = require('bcrypt-nodejs');
const moment = require('moment-timezone')


moment.tz.setDefault("America/New_York")

function loginRequired(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('info', 'You must be logged in to perform that action.')
    return res.redirect('back')
  }
  next()
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
                  var bool = false
                  if (req.user) {
                    bool = (profile.username === req.user.username)
                  }
                  //res.send(profile)
                  res.render('profile', {profile: profile, repliesTab: req.query.tab === 'replies', viewerIsOwner: bool})
                })
            })
        }else {
          res.status(404).send('user not found')
        }
      })
  })
  .get('/settings', loginRequired, (req, res) => {
    res.render('settings', {error: req.flash('error'), success: req.flash('success')})
  })
  .post('/updateBio', loginRequired, (req, res) => {
    mongo.db.collection('users')
      .updateOne({lcUsername: req.user.lcUsername}, {
        $set: {'bio': req.body.bio}
      }, (err, result) => {
        if(err){ console.log(err)}else {
          req.flash('success', 'Your bio has been updated.')
          res.redirect('/settings')
        }
      })
  })
  .post('/changePassword', loginRequired, (req, res) => {
    if (req.body.newPassword === req.body.newPassword2) {
      mongo.db.collection('users')
        .findOne({lcUsername: req.user.lcUsername}, (err, result) => {
          if(err){ console.log(err)}else {
            if (bcrypt.compareSync(req.body.password, result.password)) {
              mongo.db.collection('users')
                .updateOne({lcUsername: req.user.lcUsername}, {
                  $set: {password: bcrypt.hashSync(req.body.newPassword)}
                }, (err, result) => {
                  if(err){ console.log(err)}else {
                    req.flash('success', 'Your password has been updated!')
                    res.redirect('/settings')
                  }
                })
            }else {
              req.flash('error', 'Incorrect current password.')
              res.redirect('/settings')
            }
          }
        })

    }else {
      req.flash('error', 'Passwords do not match.')
      res.redirect('/settings')
    }
  })
  .post('/deleteAccount', loginRequired, (req, res) => {
    mongo.db.collection('users')
      .findOne({lcUsername: req.user.lcUsername}, (err, result) => {
        if(err){ console.log(err)}else {
          if (bcrypt.compareSync(req.body.password, result.password)) {
            mongo.db.collection('users')
              .deleteOne({lcUsername: req.user.lcUsername}, (err, result) => {
                if(err){ console.log(err)}else {
                  req.flash('success', 'Your account has been deleted.')
                  res.redirect('/logout')
                }
              })
          }else {
            req.flash('error', 'Incorrect password.')
            res.redirect('/settings')
          }
        }
      })
  })
  .post('/upload', (req, res) => {

  })


module.exports = router
