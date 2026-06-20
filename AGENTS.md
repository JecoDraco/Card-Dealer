# Repartidor Virtual

Texas Holdem multijugador — un dispositivo hace de mesa (comunitarias visibles), los jugadores se conectan con el celu.

## Comandos

```bash
npm start       # producción
npm run dev     # desarrollo con nodemon (auto-reload en cambios)
PORT=8080 npm start  # cambiar puerto
```

## Arquitectura

- `server.js` — Express + WebSocket (ws), estado en memoria (Map de salas)
- `public/index.html` — SPA completa (CSS+JS inline ~1270 líneas)
- `lib/hand-evaluator.js` — evalúa manos Texas Holdem, exporta `bestHand()` y `compareHands()`
- Sin build step, sin tests, sin base de datos, sin autenticación

## Flujo

1. **PC/tablet** → "Abrir Mesa" (crea sala, no recibe cartas, solo muestra comunitarias + controles)
2. **Jugadores** → escanean QR o ingresan código → "Crear Sala" (host) o "Unirse a Sala"
3. El **primer jugador** que se une a una mesa se convierte en **host** (tiene botones: REPARTIR, FLOP, TURN, RIVER, SHOWDOWN, NUEVA MANO)
4. Host avanza rondas desde la mesa O desde su celu si es jugador+host

## Reglas del servidor

- Códigos de sala: 4 caracteres alfanuméricos (sin vocales para evitar groserías)
- Máximo 9 jugadores por sala
- No se puede unir si la partida ya empezó (phase !== 'waiting')
- Al desconectarse el host, se transfiere al siguiente jugador (no-mesa)
- Si la mesa se desconecta, la sala sigue sin cambios

## Convenciones

- UI en español (argentino neutro)
- Cartas: `{ suit: '♠'|'♥'|'♦'|'♣', rank: 2-14 }` (11=J, 12=Q, 13=K, 14=A)
- Comunity cards: array de 5 (null si no revelada)
- Fases: `waiting → preflop → flop → turn → river → showdown`
- Botones de control solo visibles para `isHost`; jugadores ven FOLD / ALL-IN

## Estructura de mensajes WebSocket

Ver `server.js` handlers. Mensajes clave:
- `open_table` / `create_room` / `join_room` → entrada
- `deal` / `flop` / `turn` / `river` / `showdown` / `new_hand` → control (solo host)
- `fold` / `all_in` → acción de jugador
- Broadcasts siempre incluyen `players` para mantener sincronizada la vista mesa

## Mobile responsive

Breakpoint 600px. Cartas jugador: 160×224px desktop, 80×112px mobile. Comunitarias: 60×84px mobile. Mesa: 170×238px desktop, 60×84px mobile en comunitarias.

## Sonido

Web Audio API con AudioContext lazy. `playCardSound()` al repartir/mostrar cartas, `playWinSound()` en showdown.

## A jugar en redes locales

El QR usa `/api/server-info` para detectar automáticamente la IP local. Si no funciona, ingresar manualmente `http://IP:3000`.
