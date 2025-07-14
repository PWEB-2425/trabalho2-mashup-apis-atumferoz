const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

dotenv.config();
const app = express();
require('./config/passport')(passport);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

app.use('/', authRoutes);
app.use('/api', apiRoutes);

// Default route
app.get('/', (req, res) => res.redirect('/login'));

const fetchSpotifyToken = require('./spotify-token');
fetchSpotifyToken().then(token => {
  process.env.SPOTIFY_TOKEN = token;
  console.log('Spotify token loaded');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
