const passport = require('passport');
const LocalStrategy = require('passport').Strategy;
const User = require('./models/user');
const bcrypt = require('bcrypt');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/api', apiRoutes);


passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (!user) return done(null, false);
  const isValid = await bcrypt.compare(password, user.password);
  return done(null, isValid ? user : false);
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, done));
