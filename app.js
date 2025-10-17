const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Home / Feed
app.get('/', async (req, res) => {
  try {
    const { rows: blogs } = await db.query('SELECT * FROM blogs ORDER BY date_created DESC');
    res.render('index', { page: 'feed', blogs, error: null });
  } catch (err) {
    console.error(err);
    res.render('index', { page: 'feed', blogs: [], error: 'Database error' });
  }
});

// Sign up
app.get('/signup', (req, res) => res.render('index', { page: 'signup', error: null }));
app.post('/signup', async (req, res) => {
  const { user_id, password, name } = req.body;
  if (!user_id || !password || !name) return res.render('index', { page: 'signup', error: 'All fields required' });
  try {
    const exists = await db.query('SELECT * FROM users WHERE user_id=$1', [user_id]);
    if (exists.rows.length) return res.render('index', { page: 'signup', error: 'User ID already exists' });
    const hashed = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users(user_id, password, name) VALUES($1,$2,$3)', [user_id, hashed, name]);
    res.redirect('/signin');
  } catch (err) {
    console.error(err);
    res.render('index', { page: 'signup', error: 'Database error' });
  }
});

// Sign in
app.get('/signin', (req, res) => res.render('index', { page: 'signin', error: null }));
app.post('/signin', async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE user_id=$1', [user_id]);
    if (!result.rows.length) return res.render('index', { page: 'signin', error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.render('index', { page: 'signin', error: 'Invalid credentials' });
    req.session.user = { user_id: user.user_id, name: user.name };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('index', { page: 'signin', error: 'Database error' });
  }
});

// Logout
app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/signin')));

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
