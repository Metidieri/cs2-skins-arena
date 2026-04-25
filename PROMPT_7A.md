Lee toda la estructura del proyecto cs2-skins-arena.
No rompas nada de lo que ya funciona.

PULIDO FINAL - Mejoras de calidad antes del deploy:

1. Añade validación de inputs en el backend con express-validator:
   npm install express-validator
   
   Valida en todos los endpoints:
   - register: email válido, password min 8 chars, 
     username 3-20 chars alfanumérico
   - createBattle/addEntry/createListing: skinId uuid válido
   - buyListing: id uuid válido
   - deposit: amount number entre 100 y 10000

2. Añade rate limiting específico por ruta:
   npm install express-rate-limit
   
   - /api/auth/login: 5 intentos por 15 minutos por IP
   - /api/auth/register: 3 registros por hora por IP
   - /api/jackpot/entry: 10 entradas por minuto por usuario
   - /api/market: 30 requests por minuto por IP
   - General: 100 requests por minuto por IP

3. Añade manejo de errores global mejorado en index.js:
   - Captura errores de Prisma y devuelve mensajes 
     legibles (P2002 = "Ya existe", P2025 = "No encontrado")
   - Captura errores de validación
   - Nunca expone stack traces en producción
   - Logs de errores con timestamp

4. Crea backend/src/utils/logger.js:
   - Log de cada request: método, ruta, status, tiempo
   - Log de errores con stack en desarrollo
   - Sin logs de passwords ni tokens

5. Añade tests básicos con Jest:
   Crea backend/tests/auth.test.js:
   - Test register con datos válidos -> 201
   - Test register con email duplicado -> 400
   - Test login correcto -> 200 con token
   - Test login con password incorrecta -> 401
   - Test GET /auth/me sin token -> 401
   - Test GET /auth/me con token válido -> 200

   Crea backend/tests/battle.test.js:
   - Test crear batalla sin auth -> 401
   - Test crear batalla sin skin -> 400
   - Test flujo completo: crear + unirse + resolver

   Configura jest en package.json con script "test"

6. Crea CLAUDE.md en la raíz del proyecto con:
   - Descripción del proyecto
   - Stack tecnológico
   - Estructura de carpetas
   - Endpoints disponibles
   - Credenciales de desarrollo
   - Cómo arrancar el proyecto
   - Cómo ejecutar los tests
   - Fases completadas

Al terminar dime resultados de los tests y errores.