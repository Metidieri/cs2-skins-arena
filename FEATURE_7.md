Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

FEATURE: Página de perfil de nivel y progresión

BACKEND:

Nuevo endpoint GET /api/users/progression (auth):
Devuelve historial completo de progresión del usuario:
{
  currentLevel: number,
  currentXp: number,
  xpNeeded: number,
  progress: number,
  totalLost: number,
  levelHistory: [
    // Las últimas 20 veces que subió de nivel
    // derivado de las transactions LOSS más grandes
    { date, coinsLost, xpGained }
  ],
  nextRewards: [
    // Qué recompensas dan los próximos 3 niveles
    // (cajas más valiosas)
    { level, boxAvgValue, description }
  ],
  tierInfo: {
    name: 'Novato' | 'Competidor' | etc,
    color: string,
    minLevel: number,
    maxLevel: number,
    perksDescription: string
  }
}

Añade esto a usersController.js y regístralo en 
routes/users.js como GET /api/users/progression.

FRONTEND:

Crea frontend/src/app/pages/level/
level.component.ts — ruta /level (authGuard)

DISEÑO: página de progresión de nivel premium

HERO de nivel:
- Círculo grande central (200px) con:
  * Anillo SVG de progreso animado (como el jackpot donut
    pero para XP, un solo arco que va del 0% al progress%)
  * Dentro: "LVL" pequeño + número de nivel en Rajdhani 64px
  * Color del anillo según tier del usuario
  * Animación de llenado al cargar la página

- A la derecha del círculo:
  * Nombre del tier en Rajdhani 28px con su color
  * "X / Y XP para nivel Z" 
  * Barra de progreso lineal ancha (como la del sidebar 
    pero más grande, con gradient del color del tier)
  * "Total perdido: X coins" en muted pequeño

SECCIÓN de recompensas de niveles:
- Título "Próximas recompensas"
- Timeline horizontal de los próximos 5 niveles:
  * Cada nivel como un nodo en la línea
  * El nodo del nivel actual está activo (naranja)
  * Los futuros están en gris con lock icon
  * Al hacer hover muestra tooltip con la recompensa
    de la caja de ese nivel
  * Si el nivel tiene una recompensa especial 
    (múltiplo de 5: nivel 5, 10, 15...) el nodo 
    tiene una estrella dorada

SECCIÓN de historial de XP:
- Título "Historial de XP"
- Lista de las últimas 15 ganancias de XP:
  * Fecha + "Perdiste X coins en [batalla/jackpot/ruleta]"
  * "+ Y XP" en verde a la derecha
  * Ordenado del más reciente al más antiguo

SECCIÓN de tiers:
- Tabla de todos los tiers con sus rangos:
  Novato (1-5), Competidor (6-15), Veterano (16-30),
  Elite (31-50), Leyenda (51+)
  * El tier actual resaltado con su color
  * Los desbloqueados en gris

Añade "Mi Nivel" al sidebar debajo de Estadísticas.

Al terminar confirma ng build limpio.