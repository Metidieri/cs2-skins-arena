const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/config/db');
const { createUser, ensureSkin, giveSkin, cleanupUser } = require('./helpers');

const app = createApp();

describe('Battles - validation', () => {
  test('crear batalla sin auth devuelve 401', async () => {
    const res = await request(app).post('/api/battles').send({ skinId: 1 });
    expect(res.status).toBe(401);
  });

  test('crear batalla sin skinId devuelve 400', async () => {
    const { user } = await createUser();
    const login = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'password123',
    });
    const token = login.body.token;
    const res = await request(app)
      .post('/api/battles')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    await cleanupUser(user.id);
  });
});

describe('Battles - flujo completo crear/unirse/resolver', () => {
  let userA, userB, skinA, skinB, tokenA, tokenB;

  beforeAll(async () => {
    const a = await createUser({ balance: 5000 });
    const b = await createUser({ balance: 5000 });
    userA = a.user;
    userB = b.user;

    skinA = await ensureSkin({ name: 'TestSkinA', price: 100 });
    skinB = await ensureSkin({ name: 'TestSkinB', price: 100 });
    await giveSkin(userA.id, skinA.id);
    await giveSkin(userB.id, skinB.id);

    const loginA = await request(app).post('/api/auth/login').send({
      email: userA.email,
      password: 'password123',
    });
    const loginB = await request(app).post('/api/auth/login').send({
      email: userB.email,
      password: 'password123',
    });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;
  });

  afterAll(async () => {
    if (userA?.id) await cleanupUser(userA.id);
    if (userB?.id) await cleanupUser(userB.id);
    await prisma.skin.delete({ where: { id: skinA.id } }).catch(() => {});
    await prisma.skin.delete({ where: { id: skinB.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('crea batalla, jugador B se une, se resuelve y un ganador se queda con ambas skins', async () => {
    // 1) userA crea batalla
    const create = await request(app)
      .post('/api/battles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ skinId: skinA.id });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('waiting');
    expect(create.body.seed).toBeDefined();
    const battleId = create.body.id;

    // 2) userB se une
    const join = await request(app)
      .post(`/api/battles/${battleId}/join`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ skinId: skinB.id });
    expect(join.status).toBe(200);

    // 3) batalla resuelta
    const battle = await prisma.battle.findUnique({ where: { id: battleId } });
    expect(battle.status).toBe('completed');
    expect(['heads', 'tails']).toContain(battle.result);
    expect(battle.winnerId === userA.id || battle.winnerId === userB.id).toBe(true);

    // 4) ganador tiene ambas skins
    const winnerInv = await prisma.userSkin.findMany({
      where: { userId: battle.winnerId, skinId: { in: [skinA.id, skinB.id] } },
    });
    expect(winnerInv.length).toBe(2);

    // 5) perdedor no tiene ninguna
    const loserId = battle.winnerId === userA.id ? userB.id : userA.id;
    const loserInv = await prisma.userSkin.findMany({
      where: { userId: loserId, skinId: { in: [skinA.id, skinB.id] } },
    });
    expect(loserInv.length).toBe(0);

    // 6) transacciones
    const winnerTx = await prisma.transaction.findFirst({
      where: { userId: battle.winnerId, type: 'WIN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(winnerTx?.description).toMatch(/Coinflip ganado/);
    const loserTx = await prisma.transaction.findFirst({
      where: { userId: loserId, type: 'LOSS' },
      orderBy: { createdAt: 'desc' },
    });
    expect(loserTx?.description).toMatch(/Coinflip perdido/);
  });
});
