Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

BUGS A CORREGIR: Bots, Chat y Seed

BUG 1 - Bots sin skins disponibles:

El problema es que ensureBotsExist() crea los bots pero 
no se garantiza que tengan UserSkin asignadas después 
de limpiar la BD en cada seed.

Abre backend/prisma/seed.js y verifica que:
1. ensureBotsExist() se llama ANTES de asignar skins
2. Después de crear los bots, el seed asigna exactamente
   3 skins distintas a CADA bot de esta forma:
   - Obtén todos los bots: prisma.user.findMany({where:{isBot:true}})
   - Para cada bot, elimina sus UserSkin existentes primero
   - Asigna skins con índices escalonados para que no 
     se repitan entre bots
3. Verifica que el endpoint POST /api/battles/:id/call-bot
   en battleController.js llama a getBotWithSkin() 
   correctamente y que si devuelve null responde con 
   error 503 "No hay bots disponibles en este momento"
   en lugar de 400

Ejecuta: npm run seed
Verifica con: GET /api/battles (crea una batalla primero
y luego llama al endpoint call-bot)

BUG 2 - Chat no persiste ni aparece al cargar:

El problema es que chat:join no se emite cuando el 
usuario abre la aplicación.

En frontend/src/app/shared/components/chat/
chat.component.ts:
1. En ngOnInit verifica que llamas a:
   this.chatService.joinChat()
   this.chatService.getHistory().subscribe(...)
   AMBOS en ese orden
2. getHistory() debe llamarse SIEMPRE al cargar el 
   componente, incluso si el usuario no está logueado
   (para mostrar el historial aunque no pueda escribir)
3. La suscripción a onMessage() debe hacerse DESPUÉS 
   de getHistory() para no perder mensajes
4. En ngOnDestroy verifica que el unsubscribe es correcto
   y no deja listeners huérfanos

En chat.service.ts verifica que sendMessage() emite:
socket.emit('chat:message', { 
  token: this.authService.getToken(), 
  content 
})
Si getToken() no existe en AuthService, añádelo:
getToken(): string | null {
  return localStorage.getItem('token')
}

BUG 3 - Cajas diarias sin skins en rango de precio:

El problema es que selectSkinByValueRange() puede no 
encontrar skins en el rango correcto para niveles bajos.

En backend/prisma/seed.js añade estas skins adicionales
con precios bajos que cubran el rango de niveles 1-5:
[
  { name: 'Stained', weapon: 'AK-47', rarity: 'consumer', 
    price: 15, wear: 'Field-Tested',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1/medium' },
  { name: 'Safari Mesh', weapon: 'AK-47', rarity: 'consumer',
    price: 8, wear: 'Battle-Scarred',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/2/medium' },
  { name: 'Contractor', weapon: 'P90', rarity: 'industrial',
    price: 25, wear: 'Field-Tested',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/3/medium' },
  { name: 'Sand Dune', weapon: 'AK-47', rarity: 'consumer',
    price: 5, wear: 'Factory-New',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/4/medium' },
  { name: 'Forest DDPAT', weapon: 'M4A4', rarity: 'consumer',
    price: 12, wear: 'Minimal-Wear',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/5/medium' },
  { name: 'Bone Mask', weapon: 'AK-47', rarity: 'industrial',
    price: 35, wear: 'Field-Tested',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/6/medium' },
  { name: 'Basilisk', weapon: 'P250', rarity: 'mil-spec',
    price: 120, wear: 'Factory-New',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/7/medium' },
  { name: 'Scorched', weapon: 'AWP', rarity: 'industrial',
    price: 45, wear: 'Field-Tested',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/8/medium' },
]

En backend/src/utils/boxSystem.js en la función 
selectSkinByValueRange asegúrate de que el fallback
selecciona la skin MÁS BARATA disponible si no hay 
ninguna en rango (no la más cercana, porque la más 
cercana puede ser muy cara para nivel 1):

function selectSkinByValueRange(skins, minVal, maxVal) {
  const eligible = skins.filter(s => 
    s.price >= minVal && s.price <= maxVal
  )
  if (eligible.length === 0) {
    // Fallback: skin más barata disponible
    return skins.sort((a, b) => a.price - b.price)[0]
  }
  return eligible[Math.floor(Math.random() * eligible.length)]
}

BUG 4 - Ruleta: estado perdido al recargar página:

En frontend/src/app/pages/roulette/roulette.component.ts
en ngOnInit añade este orden correcto de inicialización:

1. Primero suscríbete a todos los eventos de socket
2. Luego llama joinRoulette()  
3. Luego llama getCurrentRound() para hidratar el estado
   con la ronda actual del servidor
4. En el handler de getCurrentRound, si la ronda está
   en "betting" calcula el tiempo restante:
   const msLeft = new Date(round.bettingEndsAt).getTime() 
     - Date.now()
   this.timer = Math.max(0, Math.floor(msLeft / 1000))

Ejecuta npm run seed al terminar todos los fixes.
Confirma que ng build y npm test pasan sin errores.