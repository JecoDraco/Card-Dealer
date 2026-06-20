const express = require('express');
const http = require('http');
const { Server: WebSocketServer } = require('ws');
const crypto = require('crypto');
const os = require('os');
const { bestHand, compareHands } = require('./lib/hand-evaluator');

const app = express();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/server-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
    if (ip !== 'localhost') break;
  }
  const port = process.env.PORT || 3000;
  res.json({ ip, port, url: `http://${ip}:${port}` });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of VALUES)
      deck.push({ suit, rank });
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getRoomState(room) {
  const players = [];
  for (const [, info] of room.players) {
    if (info.isTable) continue;
    players.push({
      nickname: info.nickname,
      isHost: info.isHost,
      isTable: false,
      folded: info.folded,
      allIn: info.allIn,
      cardCount: info.cards.length
    });
  }
  return {
    phase: room.phase,
    communityCards: room.communityCards,
    players
  };
}

function broadcast(room, message, excludeWs = null) {
  const data = JSON.stringify(message);
  for (const [ws] of room.players) {
    if (ws !== excludeWs && ws.readyState === 1) {
      ws.send(data);
    }
  }
}

function sendTo(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentPlayer = null;

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'open_table': {
        if (currentRoom) return sendTo(ws, { type: 'error', message: 'Ya estás en una sala' });

        const code = generateRoomCode();
        const room = {
          code,
          host: null,
          phase: 'waiting',
          players: new Map(),
          deck: [],
          communityCards: [null, null, null, null, null],
          burnPile: []
        };

        currentPlayer = {
          nickname: 'Mesa',
          cards: [],
          folded: false,
          allIn: false,
          isHost: false,
          isTable: true
        };
        room.players.set(ws, currentPlayer);
        rooms.set(code, room);
        currentRoom = room;

        sendTo(ws, { type: 'table_opened', code: room.code });
        break;
      }

      case 'create_room': {
        if (currentRoom) return sendTo(ws, { type: 'error', message: 'Ya estás en una sala' });
        if (!msg.nickname || msg.nickname.trim().length === 0)
          return sendTo(ws, { type: 'error', message: 'Ingresá un nickname' });
        if (msg.nickname.length > 16)
          return sendTo(ws, { type: 'error', message: 'Nickname muy largo (máx 16)' });

        const code = generateRoomCode();
        const room = {
          code,
          host: ws,
          phase: 'waiting',
          players: new Map(),
          deck: [],
          communityCards: [null, null, null, null, null],
          burnPile: []
        };

        currentPlayer = {
          nickname: msg.nickname.trim(),
          cards: [],
          folded: false,
          allIn: false,
          isHost: true
        };
        room.players.set(ws, currentPlayer);
        rooms.set(code, room);
        currentRoom = room;

        sendTo(ws, {
          type: 'room_created',
          code: room.code,
          players: [{
            nickname: currentPlayer.nickname,
            isHost: true,
            folded: false,
            allIn: false,
            cardCount: 0
          }]
        });
        break;
      }

      case 'join_room': {
        if (currentRoom) return sendTo(ws, { type: 'error', message: 'Ya estás en una sala' });
        if (!msg.nickname || msg.nickname.trim().length === 0)
          return sendTo(ws, { type: 'error', message: 'Ingresá un nickname' });
        if (msg.nickname.length > 16)
          return sendTo(ws, { type: 'error', message: 'Nickname muy largo (máx 16)' });

        const roomCode = msg.code ? msg.code.toUpperCase() : '';
        const room = rooms.get(roomCode);
        if (!room) return sendTo(ws, { type: 'error', message: 'Sala no encontrada' });
        if (room.phase !== 'waiting')
          return sendTo(ws, { type: 'error', message: 'La partida ya comenzó' });
        if (room.players.size >= 9)
          return sendTo(ws, { type: 'error', message: 'Sala llena (máx 9 jugadores)' });

        const nickname = msg.nickname.trim();
        for (const [, p] of room.players) {
          if (p.nickname.toLowerCase() === nickname.toLowerCase())
            return sendTo(ws, { type: 'error', message: 'Ese nickname ya está en uso' });
        }

        currentPlayer = {
          nickname,
          cards: [],
          folded: false,
          allIn: false,
          isHost: false,
          isTable: false
        };

        const hasTable = [...room.players.values()].some(p => p.isTable);
        if (hasTable && !room.host) {
          currentPlayer.isHost = true;
          room.host = ws;
        }

        room.players.set(ws, currentPlayer);
        currentRoom = room;

        const state = getRoomState(room);
        sendTo(ws, {
          type: 'joined_room',
          code: room.code,
          isHost: currentPlayer.isHost,
          ...state
        });

        broadcast(room, { type: 'player_joined', players: state.players });
        break;
      }

      case 'deal': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost) return;
        if (room.players.size < 2)
          return sendTo(ws, { type: 'error', message: 'Se necesitan al menos 2 jugadores' });
        if (room.phase !== 'waiting') return;

        room.phase = 'preflop';
        room.deck = shuffleDeck(createDeck());
        room.communityCards = [null, null, null, null, null];
        room.burnPile = [];

        for (const [, player] of room.players) {
          if (player.isTable) continue;
          player.cards = [];
          player.folded = false;
          player.allIn = false;
        }

        const playerList = [...room.players.entries()];
        for (let i = 0; i < 2; i++) {
          for (const [ws_p, player] of playerList) {
            if (player.isTable) continue;
            player.cards.push(room.deck.pop());
          }
        }

        const state = getRoomState(room);
        for (const [ws2, player] of room.players) {
          if (player.isTable) continue;
          sendTo(ws2, { type: 'your_cards', cards: player.cards, players: state.players });
        }

        broadcast(room, { type: 'deal_complete', phase: 'preflop', players: getRoomState(room).players });
        break;
      }

      case 'flop': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost || room.phase !== 'preflop') return;

        room.burnPile.push(room.deck.pop());
        for (let i = 0; i < 3; i++) room.communityCards[i] = room.deck.pop();
        room.phase = 'flop';

        broadcast(room, {
          type: 'community_cards',
          phase: 'flop',
          communityCards: room.communityCards,
          players: getRoomState(room).players
        });
        break;
      }

      case 'turn': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost || room.phase !== 'flop') return;

        room.burnPile.push(room.deck.pop());
        room.communityCards[3] = room.deck.pop();
        room.phase = 'turn';

        broadcast(room, {
          type: 'community_cards',
          phase: 'turn',
          communityCards: room.communityCards,
          players: getRoomState(room).players
        });
        break;
      }

      case 'river': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost || room.phase !== 'turn') return;

        room.burnPile.push(room.deck.pop());
        room.communityCards[4] = room.deck.pop();
        room.phase = 'river';

        broadcast(room, {
          type: 'community_cards',
          phase: 'river',
          communityCards: room.communityCards,
          players: getRoomState(room).players
        });
        break;
      }

      case 'showdown': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost || room.phase !== 'river') return;

        room.phase = 'showdown';

        const hands = [];
        for (const [ws2, player] of room.players) {
          if (player.isTable) continue;
          if (player.folded) {
            hands.push({
              nickname: player.nickname,
              folded: true,
              cards: player.cards,
              handName: 'Se retiró'
            });
          } else {
            const allCards = [...player.cards, ...room.communityCards.filter(c => c !== null)];
            const hand = bestHand(allCards);
            hands.push({
              nickname: player.nickname,
              folded: false,
              cards: player.cards,
              handName: hand.handName,
              handRank: hand.handRank,
              kickers: hand.kickers
            });
          }
        }

        const active = hands.filter(h => !h.folded);
        let winner = null;
        if (active.length > 0) {
          active.sort((a, b) => compareHands(
            { handRank: a.handRank, kickers: a.kickers },
            { handRank: b.handRank, kickers: b.kickers }
          ));
          winner = active[active.length - 1];
        }

        broadcast(room, { type: 'showdown', hands, winner: winner ? winner.nickname : null, players: getRoomState(room).players });
        break;
      }

      case 'new_hand': {
        if (!currentRoom) return;
        const room = currentRoom;
        if (!currentPlayer.isHost) return;

        room.phase = 'waiting';
        room.deck = [];
        room.communityCards = [null, null, null, null, null];
        room.burnPile = [];

        for (const [, player] of room.players) {
          player.cards = [];
          player.folded = false;
          player.allIn = false;
        }

        broadcast(room, { type: 'new_hand_ready', phase: 'waiting', players: getRoomState(room).players });
        break;
      }

      case 'fold': {
        if (!currentRoom) return;
        if (!currentPlayer || currentPlayer.folded) return;
        const room = currentRoom;
        if (room.phase === 'waiting' || room.phase === 'showdown') return;

        currentPlayer.folded = true;

        broadcast(room, {
          type: 'player_folded',
          nickname: currentPlayer.nickname,
          players: getRoomState(room).players
        });
        break;
      }

      case 'all_in': {
        if (!currentRoom) return;
        if (!currentPlayer || currentPlayer.folded) return;
        const room = currentRoom;
        if (room.phase === 'waiting' || room.phase === 'showdown') return;

        currentPlayer.allIn = !currentPlayer.allIn;

        broadcast(room, {
          type: 'player_all_in',
          nickname: currentPlayer.nickname,
          allIn: currentPlayer.allIn,
          players: getRoomState(room).players
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentPlayer) {
      const room = currentRoom;
      const isTable = currentPlayer.isTable;
      const wasHost = currentPlayer.isHost;
      room.players.delete(ws);

      if (room.players.size === 0) {
        rooms.delete(room.code);
        return;
      }

      if (isTable) {
        broadcast(room, { type: 'player_left', players: getRoomState(room).players });
        return;
      }

      if (wasHost) {
        for (const [nextWs, nextPlayer] of room.players) {
          if (!nextPlayer.isTable) {
            room.host = nextWs;
            nextPlayer.isHost = true;
            broadcast(room, { type: 'host_changed', players: getRoomState(room).players });
            break;
          }
        }
      } else {
        broadcast(room, { type: 'player_left', players: getRoomState(room).players });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
