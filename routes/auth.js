const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../models/User');

// GET register page
router.get('/register', (req, res) => {
  res.render('register');
});

// POST register form
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashed });
  res.redirect('/login');
});

// GET login page
router.get('/login', (req, res) => {
  res.render('login');
});

// POST login form
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

// GET dashboard (protected)
router.get('/dashboard', isAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// Middleware to check auth
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;
