Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

FEATURE: Mejoras visuales finales y pulido UX

OBJETIVO: Pulir todos los detalles que hacen que 
un producto parezca profesional y terminado.

PASO 1 - Página de error y estados vacíos mejorados:

En not-found.component.ts rediseña con:
- Número "404" en Rajdhani 180px con gradient naranja
  y text-shadow glow
- Subtítulo "Esta página no existe en la arena"
- Animación CSS: el "404" hace un pequeño bounce al cargar
- Botón "VOLVER AL LOBBY" btn-primary grande
- Fondo con el patrón de puntos de la landing

PASO 2 - Animaciones de transición entre páginas:

En app.component.ts añade animación de transición:
Al cambiar de ruta, el contenido hace fadeIn de 0.2s.
Implementa con @angular/animations:
trigger('routeAnimation', [
  transition('* <=> *', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('0.2s ease', 
      style({ opacity: 1, transform: 'translateY(0)' }))
  ])
])
Aplícalo al <main class="main-content"> con 
[@routeAnimation]="outlet.activatedRoute"

PASO 3 - Tooltips globales:

Crea shared/directives/tooltip.directive.ts:
@Directive({ selector: '[appTooltip]', standalone: true })
Acepta @Input() appTooltip: string
Al hacer hover muestra un tooltip oscuro con el texto
encima del elemento. Implementado con absolute positioning
y z-index: 1000. Con fadeIn de 0.15s.

Aplica el tooltip en:
- Iconos de alérgenos (si existen)
- Badges de rareza en las skin cards
- El contador de usuarios online del sidebar
- Los badges de nivel

PASO 4 - Skeleton screens globales:

Crea shared/components/skeleton/skeleton.component.ts
que acepta @Input() width, height, borderRadius y genera
un div con la clase .skeleton de styles.scss.

Reemplaza todos los "Cargando..." de texto en las páginas
por skeletons del tamaño apropiado:
- Inventory: 8 skeleton cards del tamaño de SkinCard
- Leaderboard: 3 skeleton cards de podio + 7 filas de tabla
- History: 10 skeleton rows del tamaño de las filas
- Stats: 4 skeleton cards + 3 cards secundarias

PASO 5 - Mejoras de responsividad mobile:

En styles.scss añade al final:
@media (max-width: 768px) {
  :root { --sidebar-w: 0px; }
  .main-content { margin-left: 0; padding: 1rem; }
}

En sidebar.component.ts añade un hamburger button:
- Solo visible en mobile (display: none en desktop)
- Botón fijo en top-left de 44x44px con z-index: 200
- Al hacer click muestra/oculta el sidebar con 
  translateX(-240px) → translateX(0) transition 0.3s
- Un overlay semitransparente cierra el sidebar al hacer
  click fuera de él

PASO 6 - Favicon y meta tags:

En index.html actualiza:
<title>CS2 Skins Arena - Juegos con Skins</title>
<meta name="description" content="Coinflip, Jackpot, 
  Ruleta y más. La arena de skins de CS2.">
<meta property="og:title" content="CS2 Skins Arena">
<meta property="og:description" content="Apuesta skins, 
  gana el jackpot, abre cajas. La arena definitiva.">
<meta property="og:image" content="/assets/og-image.png">

Crea frontend/src/assets/og-image.png como un SVG 
simple convertido a PNG: fondo oscuro, texto "CS2 ARENA"
en naranja, dimensiones 1200x630.

PASO 7 - Actualiza CLAUDE.md con el estado final:
Marca FEATURE_2-5 y IMPROVE_1-4 y FEATURE_6-9 como 
completados. Añade la lista de rutas final completa.

Al terminar haz ng build --configuration=production
y confirma que el build de producción es limpio.