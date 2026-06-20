# Card Dealer

Multiplayer Texas Holdem poker for home games.

One device (PC / tablet) shows the community cards on the big screen. Each player joins from their phone by scanning a QR code — no sign-up, no installation, no app store.

## How it works

1. Open the page on a PC or tablet → tap **Open Table**
2. Share the QR code or room code — players join from their phones
3. First player to join becomes the host (gets deal / flop / turn / river / showdown buttons)
4. Host controls the game from the table display, players see their own cards and fold / go all-in from their phones

## Run it

```bash
npm install
npm start         # production on port 3000
npm run dev       # development with auto-restart on changes
PORT=8080 npm start  # custom port
```

## Stack

- **Backend**: Node.js + Express + WebSocket (ws)
- **Frontend**: Single HTML file SPA (CSS + JS inline)
- **Hand evaluator**: custom Texas Holdem hand evaluator in `lib/`
- Zero dependencies beyond Express and ws
