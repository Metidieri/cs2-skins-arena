Lee toda la estructura del proyecto cs2-skins-arena.
No rompas nada de lo que ya funciona.

DEPLOY - Prepara el proyecto para producción:

1. Backend - Variables de entorno para producción:
   Crea backend/.env.example con todas las variables
   necesarias sin valores reales:
   DATABASE_URL=
   JWT_SECRET=
   JWT_REFRESH_SECRET=
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=

2. Backend - Configura para Railway:
   Crea backend/Procfile:
   web: node src/index.js
   
   Asegúrate de que package.json tiene:
   "start": "node src/index.js"
   "engines": { "node": ">=18.0.0" }

3. Frontend - Build de producción:
   Actualiza frontend/src/environments/environment.prod.ts:
   apiUrl: 'https://TU-BACKEND.railway.app/api'
   socketUrl: 'https://TU-BACKEND.railway.app'
   
   Ejecuta ng build --configuration production
   y verifica que no hay errores.

4. Frontend - Configura para Vercel:
   Crea frontend/vercel.json:
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }

5. Crea README.md completo en la raíz con:
   - Badge de tecnologías
   - Screenshots de las páginas principales
   - Descripción del proyecto
   - Modos de juego explicados
   - Stack tecnológico
   - Instrucciones de instalación local
   - Variables de entorno necesarias
   - Cómo hacer deploy en Railway y Vercel
   - Credenciales de demo
   - Enlace al proyecto en producción (placeholder)

6. Asegúrate de que .gitignore incluye:
   node_modules, dist, .env, dev.db, *.db,
   .angular/cache, coverage

7. Haz un build final completo:
   - cd backend && npm test (todos los tests pasan)
   - cd frontend && ng build --configuration production
   
   Si hay errores corrígelos antes de terminar.

Al terminar dime si el build de producción es limpio
y qué pasos quedan para hacer el deploy real.