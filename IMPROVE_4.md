Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

MEJORA: Sistema de referidos

BACKEND:

1. Añade al schema.prisma en User:
   referralCode  String?  @unique
   referredBy    Int?
   referredByUser User?   @relation("Referrals", 
                    fields: [referredBy], references: [id])
   referrals     User[]   @relation("Referrals")

Ejecuta: npx prisma migrate dev --name add_referrals

2. En authController.js en register():
   - Genera código de referido único al registrarse:
     const referralCode = username.toUpperCase().slice(0,4) 
       + Math.random().toString(36).substring(2,6).toUpperCase()
   - Acepta campo opcional referralCode en el body
   - Si viene un referralCode válido:
     * Busca el usuario con ese código
     * Si existe, asigna referredBy = ese usuario id
     * Da 500 coins de bonus al nuevo usuario
     * Da 500 coins de bonus al referidor
     * Crea Transaction DEPOSIT para ambos con 
       description "Bonus de referido"
     * Emite notificación al referidor si el io está 
       disponible (importar de index.js o pasar como param)

3. Nuevo endpoint GET /api/users/referral-code (auth):
   Devuelve { code, totalReferrals, coinsEarned }
   - totalReferrals: count de usuarios con referredBy = userId
   - coinsEarned: totalReferrals * 500

4. Endpoint GET /api/users/referrals (auth):
   Lista de usuarios referidos con username y createdAt

FRONTEND:

5. En profile.component.ts añade una nueva sección
   "Programa de referidos" después de la sección de depósito:

DISEÑO de la sección:
- Header con título "Referidos" e icono de regalo
- Card con el código de referido del usuario:
  * Código en Rajdhani 28px dorado, monospace
  * Botón copiar al lado con icon copy y tooltip 
    "¡Copiado!" al hacer click
  * URL de registro con el código pre-rellenado:
    https://cs2arena.com/register?ref=TUCODIGO
  * Botón "Compartir enlace" que también copia la URL

- Stats de referidos:
  * Total de amigos referidos
  * Coins ganadas por referidos en dorado

- Lista de referidos (si tiene alguno):
  * Username + fecha de registro + 500 coins ganadas
  * Máximo 5, con "y X más" si hay más

6. En register.component.ts:
   - Lee el query param ?ref= de la URL al cargar:
     const ref = this.route.snapshot.queryParams['ref']
   - Si existe, rellena un campo oculto referralCode 
     en el formulario
   - Muestra un mensaje visible: 
     "🎁 Registrándote con código de referido. 
     Recibirás 500 coins de bienvenida."
   - Envía el referralCode en el POST /api/auth/register

Al terminar confirma ng build limpio.