import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, full_name, role = 'huesped' } = req.body;
  if (!email || !password || !full_name)
    return res.status(400).json({ error: 'email, password y full_name son requeridos' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows: [user] } = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4) RETURNING id, email, full_name, role, photo_url`,
      [email, hash, full_name, role]);
    await query(`INSERT INTO ai_agent_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
    res.status(201).json({ user, token: signToken(user) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows: [user] } = await query(`SELECT * FROM users WHERE email=$1`, [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Credenciales inválidas' });
  const { password_hash, ...safe } = user;
  res.json({ user: safe, token: signToken(user) });
});

router.get('/me', authRequired, async (req, res) => {
  const { rows: [user] } = await query(
    `SELECT id, email, full_name, role, photo_url, bio, id_verified FROM users WHERE id=$1`,
    [req.user.sub]);
  res.json(user);
});

export default router;
