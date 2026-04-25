Lee la estructura actual del proyecto antes de empezar.
No rompas nada de lo que ya funciona.
Usa el skill UI/UX Pro Max para el diseño.

Crea la página Marketplace completa:

1. frontend/src/app/pages/marketplace/
   MarketplaceComponent — ruta /marketplace (authGuard)

DISEÑO estilo gaming dark nivel producción:
- Fondo #0a0a0f, cards #16161a, acento naranja #ff6b00

SECCIÓN FILTROS (sticky top):
- Pills de rareza: Todas, Consumer, Industrial, 
  Mil-Spec, Restricted, Classified, Covert
- Dropdown de arma: Todas, AK-47, M4A1-S, AWP...
- Rango de precio: inputs min y max
- Ordenar: Precio menor, Precio mayor, Más reciente
- Botón limpiar filtros

GRID DE LISTINGS:
- 2 cols mobile, 3 tablet, 4 desktop, 5 en wide
- ListingCard por cada listing activo:
  * Imagen de la skin con badge de rareza coloreado
  * Nombre y arma
  * Vendedor con su avatar e inicial
  * Precio en coins en naranja con icono
  * Botón "COMPRAR" naranja: 
    - Disabled si es tu propio listing
    - Disabled si no tienes saldo suficiente
    - Modal de confirmación antes de comprar
  * Badge "TUYO" si el listing es del usuario actual
    con botón "CANCELAR" en rojo
- Las cards aparecen en tiempo real via WebSocket
  (onMarketListed añade al inicio, onMarketSold 
  y onMarketCancelled eliminan de la lista)
- Loading skeleton mientras carga
- Estado vacío si no hay listings

MODAL VENDER SKIN:
- Botón "VENDER SKIN" en el header abre modal
- Grid del inventario del usuario
- Al seleccionar skin: input de precio con 
  validación (mínimo 1, máximo 999999)
- Preview: skin seleccionada + precio introducido
- Botón confirmar llama a createListing()
- Toast éxito/error

MIS LISTINGS (tab o sección inferior):
- Tabla de mis listings: skin, precio, status 
  con color (active verde, sold gris, cancelled rojo),
  fecha, comprador si está vendido
- Botón cancelar en listings activos

2. Añade /marketplace al NavbarComponent
3. Añade ruta en app.routes.ts con authGuard

Al terminar dime cómo quedó la UI y si hay errores.