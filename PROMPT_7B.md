Lee toda la estructura del proyecto cs2-skins-arena.
No rompas nada de lo que ya funciona.
Usa el skill UI/UX Pro Max para el diseño final.

PULIDO FRONTEND - Mejoras de UX antes del deploy:

1. Añade un sistema de toasts global en Angular:
   Crea frontend/src/app/shared/services/toast.service.ts
   con métodos: success(msg), error(msg), info(msg), warn(msg)
   
   Crea frontend/src/app/shared/components/toast/
   ToastComponent standalone que muestre los toasts
   en esquina inferior derecha, apilados, con 
   animación entrada/salida y auto-dismiss a los 4s.
   Añádelo a app.component.ts.
   
   Reemplaza todos los alerts y console.log de error
   en los componentes por llamadas al ToastService.

2. Añade loading states globales:
   Crea frontend/src/app/shared/services/loading.service.ts
   con signal isLoading.
   
   Añade al JWT interceptor: activa isLoading en cada 
   request, desactiva al terminar.
   
   Crea LoadingBarComponent (barra fina naranja en top 
   de la página, estilo NProgress) y añádelo al navbar.

3. Mejora la página 404:
   Crea frontend/src/app/pages/not-found/
   NotFoundComponent con diseño gaming dark,
   mensaje "404 - Página no encontrada", 
   botón volver al inicio.
   Añade a app.routes.ts como catch-all.

4. Añade guards de redirección:
   Si el usuario ya está logueado y va a /login 
   o /register, redirige a /coinflip.

5. Mejora el formulario de login y register:
   - Muestra/oculta password con icono de ojo
   - Deshabilita el botón submit mientras hace request
   - Muestra spinner en el botón durante el login
   - Mensaje de error inline bajo el campo que falla

6. Añade una página de inicio/landing para 
   usuarios no logueados en ruta /:
   - Hero oscuro con título "CS2 SKINS ARENA"
   - Descripción breve de los modos de juego
   - Botones: "ENTRAR" -> /login, "REGISTRARSE" -> /register
   - Stats globales: total partidas, total coins apostadas
     (endpoints GET /api/stats públicos que tienes que 
     crear también en el backend)
   - Si está logueado redirige a /coinflip

Al terminar dime qué cambios se aplicaron y errores.