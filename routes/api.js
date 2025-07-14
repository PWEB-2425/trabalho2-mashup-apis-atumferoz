const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');

function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.get('/search', isAuth, async (req, res) => {
  const { q } = req.query;
  const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
  const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;

  try {
    const [weatherRes, wikiRes] = await Promise.all([
      axios.get(weatherURL),
      axios.get(wikiURL)
    ]);

    const weather = weatherRes.data;
    const wiki = wikiRes.data;
    const countryCode = weather.sys.country;

    // TMDB Movies
    const moviesRes = await axios.get('https://api.themoviedb.org/3/movie/popular', {
      params: {
        api_key: process.env.TMDB_API_KEY,
        region: countryCode
      }
    });
    const movies = moviesRes.data.results.slice(0, 5);

    // Spotify Top Tracks (use Client Credentials token in SPOTIFY_TOKEN env)
    let tracks = [];
    try {
      const artistSearch = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
        params: {
          q: countryCode,
          type: 'artist',
          limit: 1,
          market: countryCode
        }
      });

      const artist = artistSearch.data.artists.items[0];
      if (artist) {
        const trackRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks`, {
          headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
          params: { market: countryCode }
        });

        tracks = trackRes.data.tracks.slice(0, 5).map(t => ({
          name: t.name,
          artists: t.artists.map(a => a.name).join(', '),
          url: t.external_urls.spotify
        }));
      }
    } catch (spotifyError) {
      console.warn('Spotify failed:', spotifyError.message);
    }

    await User.findByIdAndUpdate(req.user._id, { $push: { history: q } });

    res.json({
      weather,
      wiki,
      movies,
      tracks,
      history: req.user.history.concat(q).slice(-5).reverse()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'API error', details: err.message });
  }
});

module.exports = router;
