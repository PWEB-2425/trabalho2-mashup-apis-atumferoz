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
    // Fetch weather and wiki
    const [weatherRes, wikiRes] = await Promise.all([
      axios.get(weatherURL),
      axios.get(wikiURL)
    ]);

    const weather = weatherRes.data;
    const wiki = wikiRes.data;
    const countryCode = weather.sys.country;

    // ✅ Convert ISO code to full country name
    const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode);

    // 🌄 Unsplash city images
let images = [];
try {
  const unsplashRes = await axios.get('https://api.unsplash.com/search/photos', {
    params: {
      query: `${weather.name} city`,
      orientation: 'landscape',
      per_page: 5,
      client_id: process.env.UNSPLASH_ACCESS_KEY
    }
  });
  images = unsplashRes.data.results.map(img => img.urls.regular);
} catch (err) {
  console.warn('Unsplash failed:', err.message);
}


    // 🎬 TMDB movies by release region
    let movies = [];
    try {
      const movieRes = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: process.env.TMDB_API_KEY,
          sort_by: 'release_date.desc',
          with_release_type: 3,
          'release_date.lte': new Date().toISOString().split('T')[0],
          region: countryCode
        }
      });
      movies = movieRes.data.results.slice(0, 5);
    } catch (err) {
      console.warn('TMDB failed:', err.message);
    }

    // 🎵 Spotify Top 50 by country name (with fallback to Global)
    let tracks = [];
    try {
      const playlistSearch = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
        params: {
          q: `Top 50 - ${countryName}`,
          type: 'playlist',
          limit: 1
        }
      });

      let playlist = playlistSearch.data.playlists.items[0];

      if (!playlist) {
        // Fallback to Global
        const fallback = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
          params: {
            q: `Top 50 - Global`,
            type: 'playlist',
            limit: 1
          }
        });
        playlist = fallback.data.playlists.items[0];
      }

      if (playlist) {
        const playlistTracks = await axios.get(`https://api.spotify.com/v1/playlists/${playlist.id}`, {
          headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` }
        });

        tracks = playlistTracks.data.tracks.items.slice(0, 5).map(t => ({
          name: t.track.name,
          artists: t.track.artists.map(a => a.name).join(', '),
          url: t.track.external_urls.spotify
        }));
      }
    } catch (err) {
      console.warn('Spotify playlist fetch failed:', err.message);
    }

    // Save user search history
    await User.findByIdAndUpdate(req.user._id, { $push: { history: q } });
    
res.json({
  weather,
  wiki,
  movies,
  tracks,
  images,
  history: req.user.history.concat(q).slice(-5).reverse()
});


  } catch (err) {
    console.error('Search route failed:', err.message);
    res.status(500).json({ error: 'API error', details: err.message });
  }
});

module.exports = router;
