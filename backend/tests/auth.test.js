const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/config/db');
const { uniqueSuffix } = require('./helpers');

const app = createApp();

describe('POST /api/auth/register', () => {
  const created = [];

  afterAll(async () => {
    for (const id of created) {
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('registra usuario válido y devuelve token (201)', async () => {
    const suffix = uniqueSuffix();
    const res = await request(app).post('/api/auth/register').send({
      email: `t_${suffix}@cs2.test`,
      username: `t_${suffix}`,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(`t_${suffix}@cs2.test`);
    expect(res.body.user.password).toBeUndefined();
    created.push(res.body.user.id);
  });

  test('falla con email duplicado (400)', async () => {
    const suffix = uniqueSuffix();
    const payload = {
      email: `dup_${suffix}@cs2.test`,
      username: `dup_${suffix}`,
      password: 'password123',
    };
    const first = await request(app).post('/api/auth/register').send(payload);
    expect(first.status).toBe(201);
    created.push(first.body.user.id);

    const second = await request(app).post('/api/auth/register').send({
      ...payload,
      username: `dup2_${suffix}`,
    });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/Email|registrado|exists/i);
  });

  test('rechaza password corta (400)', async () => {
    const suffix = uniqueSuffix();
    const res = await request(app).post('/api/auth/register').send({
      email: `short_${suffix}@cs2.test`,
      username: `short_${suffix}`,
      password: 'abc',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login + GET /api/auth/me', () => {
  let user;
  let token;

  beforeAll(async () => {
    const suffix = uniqueSuffix();
    const reg = await request(app).post('/api/auth/register').send({
      email: `lg_${suffix}@cs2.test`,
      username: `lg_${suffix}`.slice(0, 20),
      password: 'password123',
    });
    user = reg.body.user;
    token = reg.body.token;
  });

  afterAll(async () => {
    if (user?.id) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('login correcto devuelve 200 con token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });

  test('login con password incorrecta devuelve 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'wrong-pass',
    });
    expect(res.status).toBe(401);
  });

  test('GET /auth/me sin token devuelve 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /auth/me con token válido devuelve 200', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.password).toBeUndefined();
  });
});
