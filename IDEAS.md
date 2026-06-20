# Repartidor Virtual — Ideas

## Qué es

Una página web que hace de dealer/mesa para juegos de cartas.
Originalmente pensada para partidas caseras donde los jugadores
tienen cartas físicas y la web solo muestra las comunitarias.

## Juegos compatibles (actual y potenciales)

### Actual
- **Texas Holdem** — muestra flop / turn / river, quema cartas, seed verificable

### Potenciales
- **Omaha** — mismas 5 comunitarias, cambia instructivo
- **5-Card Draw** — la web quema descartes y repone nuevas cartas
- **Blackjack** — la web es el dealer (pide/sigue). Jugadores tienen cartas físicas
- **Baccarat / Punto Banco** — la web reparte mano player/banker con reglas automáticas de tercera carta
- **Red Dog** — la web reparte 2 y va sacando hasta el spread
- **Party games** — trivia, cartas contra la humanidad, juegos de beber
- **Streaming overlay** — muestra cartas del streamer en pantalla para el chat
- **Juegos de mesa** — helper que reparte equipamientos / eventos / misiones (Catán, Arkham, etc.)

## Ideas para expandir

### Asistente local (sin backend)
- Timer de ciegas para torneos
- Pantalla completa para proyector / TV
- Atajos de teclado
- Sonidos de cartas y alertas
- Historial de manos jugadas
- Seed verificable para evitar trampas

### Multi-dispositivo (sala compartida)
- Un dispositivo (PC/TV) muestra las comunitarias
- Cada jugador escanea un QR con su celu para ver sus cartas privadas
- Sin instalación de app, sin registro, sin backend
- Ideal para partidas presenciales sin baraja física

### Streamer mode
- La web es un overlay para OBS
- Muestra cartas de una mesa digital
- El streamer ve todas las cartas, los espectadores ven solo las comunitarias (o las que decida)

## Monetización

| Modelo | Detalle |
|--------|---------|
| **Freemium** | Texas Holdem gratis. Pack Pro ($3-5 one-time) desbloquea Blackjack + Omaha + Baccarat + customización |
| **PWA de pago** | Vendida como app instalable a $2 (Google Play / App Store) |
| **Licencia comercial** | $5/mes para bares, boliches, casinos que la usen en mesas físicas |
| **Suscripción torneos** | Para grupos organizados: manejo de buy-ins, rebuys, leaderboard, premios |
| **Donaciones** | Sin presión, "Invitame un café" |

## Principios

- Simple, sin registro, sin cuentas
- Un HTML que funcione offline
- Que se pueda abrir desde cualquier dispositivo sin instalar nada
- Seed visible para que cualquiera verifique el mazo
