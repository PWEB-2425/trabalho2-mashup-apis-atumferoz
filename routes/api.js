const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');

router.get('/search', isAuth, async (req, res) => {
  const { q } = req.query;
  const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
  const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;

  try {
    const [weatherRes, wikiRes] = await Promise.all([
      axios.get(weatherURL),
      axios.get(wikiURL)
    ]);

    // Save search
    await User.findByIdAndUpdate(req.user._id, { $push: { history: q } });

    res.json({
      weather: weatherRes.data,
      wiki: wikiRes.data
    });
  } catch (err) {
    res.status(500).json({ error: 'API request failed', details: err.message });
  }
});

function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = router;
