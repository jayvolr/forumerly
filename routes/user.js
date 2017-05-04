// Routes for profile and settings pages
const express = require('express')
const router = express.Router()
const mongo = require('../db')
const bcrypt = require('bcrypt-nodejs')
const moment = require('moment-timezone')
const fs = require('fs')

// File upload middleware (for profile pictures)
const multer = require('multer')
const upload = multer({dest: 'public/images/profileImages', limits: {fileSize: 2000000}})


moment.tz.setDefault("America/New_York") // All formated times will be in this timezone by default

// Middleware requiring the user to be authenticated
function loginRequired(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('info', 'You must be logged in to perform that action.')
    return res.redirect('back')
  }
  next()
}

// Formats dates for each object inside an array (the objects in the array being individual threads)
function formatThreadDates(data) {
  data.forEach((i) => {
    i.formatedPostDate = moment(i.creationDate).calendar()
    i.formatedLastPostDate = moment(i.lastPostDate).calendar()
    i.relativeLastPostDate = moment(i.lastPostDate).startOf('minute').fromNow()
    i.relativePostDate = moment(i.creationDate).startOf('minute').fromNow()
  })
  return data
}

// Formats all the dates inside of a single object (the object being a single thread)
function formatSingleObject(data) {
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
  // GET profile page
  .get('/user/:username', (req, res) => {
    // Find the user specified in in the URL
    mongo.db.collection('users')
      .findOne({lcUsername: req.params.username.toLowerCase()}, (err, result) => {
        // If they exist in the database:
        if (result) {
          // Assign their data to the profile variable and add other information to be displayed to it
          var profile = result
          profile.joinDate = moment(result.joinDate).format('l')

          // Find all threads created by this user
          mongo.db.collection('threads')
            .find({posterUsername: profile.username})
            .sort({'lastPostDate': -1})
            .toArray((err, result) => {
              profile.threadsCreated = result.length

              // Format dates included in the threads data
              if (result.length === 0) {
                profile.threads = false
              }else if (result.length === 1) {
                profile.threads = formatSingleObject(result[0])
              }else {
                profile.threads = formatThreadDates(result)
              }

              // Find all replies authored by this user
              mongo.db.collection('replies')
                .find({posterUsername: profile.username})
                .sort({'creationDate': -1})
                .toArray((err, result) => {

                  // Add and format information and dates
                  profile.repliesCreated = result.length
                  profile.postCount = profile.threadsCreated + profile.repliesCreated
                  if (result.length === 0) {
                    profile.replies = false
                  }else if (result.length === 1) {
                    profile.replies = formatSingleObject(result[0])
                  }else {
                    profile.replies = formatThreadDates(result)
                  }

                  // This value will be true if the profile being viewed belongs to the current authenticated user
                  var bool = false
                  if (req.user) {
                    bool = (profile.username === req.user.username)
                  }
                  // Render the profile view with all the collected information
                  res.render('profile', {profile: profile, repliesTab: req.query.tab === 'replies', viewerIsOwner: bool})
                })
            })
        // If the user specified could not be found in the database
        }else {
          res.status(404).send('user not found')
        }
      })
  })

  // GET settings page
  .get('/settings', loginRequired, (req, res) => {
    res.render('settings', {error: req.flash('error'), success: req.flash('success')})
  })

  // POST new user bio
  .post('/updateBio', loginRequired, (req, res) => {
    // Find user in database and set their bio to the provided text
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

  // POST new user password
  .post('/changePassword', loginRequired, (req, res) => {
    // If the two new passwords match
    if (req.body.newPassword === req.body.newPassword2) {
      // Find the user in the database
      mongo.db.collection('users')
        .findOne({lcUsername: req.user.lcUsername}, (err, result) => {
          if(err){ console.log(err)}else {
            // If the password entered into the "Current password" field is correct
            if (bcrypt.compareSync(req.body.password, result.password)) {
              // Set their password to the bcrypt hash of the provided new password
              mongo.db.collection('users')
                .updateOne({lcUsername: req.user.lcUsername}, {
                  $set: {password: bcrypt.hashSync(req.body.newPassword)}
                }, (err, result) => {
                  // Callback
                  if(err){ console.log(err)}else {
                    req.flash('success', 'Your password has been updated!')
                    res.redirect('/settings')
                  }
                })
            // If the password entered into the "Current password" field is NOT correct
            }else {
              req.flash('error', 'Incorrect current password.')
              res.redirect('/settings')
            }
          }
        })
    // If the two new passwords do NOT match
    }else {
      req.flash('error', 'Passwords do not match.')
      res.redirect('/settings')
    }
  })

  // POST delete user's account (this should probably be a DELETE request)
  .post('/deleteAccount', loginRequired, (req, res) => {
    // Find the user in the database
    mongo.db.collection('users')
      .findOne({lcUsername: req.user.lcUsername}, (err, result) => {
        if(err){ console.log(err)}else {
          // If the password provided is correct
          if (bcrypt.compareSync(req.body.password, result.password)) {
            // Delete the user from the database and log them out
            mongo.db.collection('users')
              .deleteOne({lcUsername: req.user.lcUsername}, (err, result) => {
                if(err){ console.log(err)}else {
                  req.flash('success', 'Your account has been deleted.')
                  res.redirect('/logout')
                }
              })
          // If the password provided is NOT correct
          }else {
            req.flash('error', 'Incorrect password.')
            res.redirect('/settings')
          }
        }
      })
  })

  // POST route for profile picture upload
  .post('/upload', upload.single('avatar'), (req, res) => {
    // Move the file and rename it to the user's username
    fs.rename(req.file.path, req.file.destination + '/' + req.user.username, (err) => {
      if (err) throw err;
      // Find the user in the database and set the img variable to the correct path
      mongo.db.collection('users')
        .updateOne({username: req.user.username}, {
          $set: {img: '/images/profileImages/' + req.user.username}
        }, (err, result) => {
          if (err) {throw err}else {
            // Callback
            res.redirect('back')
          }
        })
    })
  })

// Export these routes to be used in app.js
module.exports = router
