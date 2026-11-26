// Accounts for IELTS Studio: register / login / per-user progress sync.
// Passwords are hashed with scrypt (never stored or logged). Sessions are random bearer tokens
// (only their SHA-256 hash is kept, in memory). Users live in a JSON file: for a small trusted pilot only.
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomBytes, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const scryptAsync = promisify(scrypt);
const USERNAME = /^[a-z0-9][a-z0-9_.-]{2,29}$/; // must start with a letter or digit
const RESERVED = new Set(['constructor', 'prototype', 'hasownproperty', 'tostring', 'valueof', 'admin', 'root']);
const TARGETS = ['5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_SESSIONS_PER_USER = 5;

export function authRouter({ origins, dataFile = process.env.DATA_FILE || new URL('./data/users.json', import.meta.url).pathname,
  maxUsers = Number(process.env.MAX_USERS || '200') } = {}) {
  const router = express.Router();
  mkdirSync(path.dirname(dataFile), { recursive: true });
  let db = { users: {} };
  if (existsSync(dataFile)) db = JSON.parse(readFileSync(dataFile, 'utf8'));
  const sessions = new Map(); // tokenHash -> { user, expires }

  let writing = Promise.resolve();
  const persist = () => (writing = writing.then(async () => {
    const tmp = dataFile + '.tmp';
    await writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
    await rename(tmp, dataFile);
  }));

  const hashToken = t => createHash('sha256').update(t).digest('hex');
  async function hashPassword(password, salt) { return scryptAsync(password, salt, 64); }
  const DUMMY_SALT = randomBytes(16);
  const dummyHash = hashPassword('dummy-password', DUMMY_SALT); // keeps timing similar for unknown users

  function issue(user) {
    const now = Date.now();
    for (const [k, s] of sessions) if (s.expires < now) sessions.delete(k);
    const mine = [...sessions.entries()].filter(([, s]) => s.user === user).sort((a, b) => a[1].expires - b[1].expires);
    while (mine.length >= MAX_SESSIONS_PER_USER) sessions.delete(mine.shift()[0]);
    const token = randomBytes(32).toString('base64url');
    sessions.set(hashToken(token), { user, expires: now + SESSION_MS });
    return token;
  }
  const bearer = req => (req.get('Authorization') || '').match(/^Bearer ([A-Za-z0-9_-]{20,100})$/)?.[1];
  function requireUser(req, res, next) {
    const token = bearer(req); const s = token && sessions.get(hashToken(token));
    if (!s || s.expires < Date.now() || !db.users[s.user]) return res.status(401).json({ error: 'Please log in again.' });
    req.user = s.user; req.tokenHash = hashToken(token); next();
  }
  const route = h => (req, res, next) => Promise.resolve(h(req, res)).catch(next);

  router.use((req, res, next) => {
    if (!origins.includes(req.get('Origin'))) return res.status(403).json({ error: 'Origin not permitted.' });
    next();
  });
  router.use(cors({ origin: origins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: false, maxAge: 600 }));
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const limiter = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Wait a few minutes.' } });
  const general = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Wait a minute.' } });
  router.use(general);

  function readCredentials(body) {
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    return { username, password };
  }

  router.post('/register', limiter, express.json({ limit: '2kb' }), route(async (req, res) => {
    const { username, password } = readCredentials(req.body);
    if (!USERNAME.test(username) || RESERVED.has(username)) return res.status(400).json({ error: 'Username must be 3–30 characters: letters, numbers, dot, dash or underscore.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters.' });
    if (Object.prototype.hasOwnProperty.call(db.users, username)) return res.status(409).json({ error: 'That username is taken.' });
    if (Object.keys(db.users).length >= maxUsers) return res.status(503).json({ error: 'Registration is closed: the account limit was reached.' });
    const salt = randomBytes(16);
    const hash = await hashPassword(password, salt);
    if (Object.prototype.hasOwnProperty.call(db.users, username)) return res.status(409).json({ error: 'That username is taken.' });
    db.users[username] = { salt: salt.toString('hex'), hash: hash.toString('hex'), created: new Date().toISOString(), progress: null, progressUpdated: null };
    await persist();
    res.status(201).json({ token: issue(username), username });
  }));

  router.post('/login', limiter, express.json({ limit: '2kb' }), route(async (req, res) => {
    const { username, password } = readCredentials(req.body);
    const user = Object.prototype.hasOwnProperty.call(db.users, username) ? db.users[username] : null;
    const salt = user ? Buffer.from(user.salt, 'hex') : DUMMY_SALT;
    const candidate = await hashPassword(password.slice(0, 128), salt);
    const expected = user ? Buffer.from(user.hash, 'hex') : await dummyHash;
    if (!user || !timingSafeEqual(candidate, expected)) return res.status(401).json({ error: 'Incorrect username or password.' });
    res.json({ token: issue(username), username });
  }));

  router.post('/logout', requireUser, (req, res) => { sessions.delete(req.tokenHash); res.json({ ok: true }); });
  router.get('/me', requireUser, (req, res) => res.json({ username: req.user }));

  router.get('/progress', requireUser, (req, res) => {
    const u = db.users[req.user];
    res.json({ progress: u.progress, updated: u.progressUpdated });
  });

  function shapeOk(p) {
    return p && typeof p === 'object' && p.version === 2 && TARGETS.includes(p.target)
      && p.drafts && typeof p.drafts === 'object' && !Array.isArray(p.drafts)
      && Array.isArray(p.sessions) && p.sessions.length <= 10000
      && p.diagnostic && typeof p.diagnostic === 'object' && !Array.isArray(p.diagnostic)
      && Object.values(p.drafts).every(t => typeof t === 'string' && t.length <= 500000);
  }
  router.put('/progress', requireUser, express.json({ limit: '1mb' }), route(async (req, res) => {
    const p = req.body?.progress;
    if (!shapeOk(p)) return res.status(400).json({ error: 'Invalid progress data.' });
    const u = db.users[req.user];
    u.progress = p; u.progressUpdated = new Date().toISOString();
    await persist();
    res.json({ updated: u.progressUpdated });
  }));

  router.delete('/me', requireUser, route(async (req, res) => {
    delete db.users[req.user];
    for (const [k, s] of sessions) if (s.user === req.user) sessions.delete(k);
    await persist();
    res.json({ ok: true });
  }));

  return router;
}
