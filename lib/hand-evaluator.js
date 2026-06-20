function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;

  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    }
  }

  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;

  const groups = Object.entries(freq)
    .map(([r, c]) => ({ rank: parseInt(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isFlush && isStraight && straightHigh === 14)
    return { handRank: 9, handName: 'Escalera Real', kickers: [14] };
  if (isFlush && isStraight)
    return { handRank: 8, handName: 'Escalera de Color', kickers: [straightHigh] };
  if (groups[0].count === 4)
    return { handRank: 7, handName: 'Póker', kickers: [groups[0].rank, (groups[1] ? groups[1].rank : 0)] };
  if (groups[0].count === 3 && groups[1] && groups[1].count === 2)
    return { handRank: 6, handName: 'Full House', kickers: [groups[0].rank, groups[1].rank] };
  if (isFlush)
    return { handRank: 5, handName: 'Color', kickers: ranks };
  if (isStraight)
    return { handRank: 4, handName: 'Escalera', kickers: [straightHigh] };
  if (groups[0].count === 3)
    return { handRank: 3, handName: 'Trío', kickers: [groups[0].rank, ...ranks.filter(r => r !== groups[0].rank)] };
  if (groups[0].count === 2 && groups[1] && groups[1].count === 2)
    return { handRank: 2, handName: 'Doble Par', kickers: [groups[0].rank, groups[1].rank, ...ranks.filter(r => r !== groups[0].rank && r !== groups[1].rank)] };
  if (groups[0].count === 2)
    return { handRank: 1, handName: 'Par', kickers: [groups[0].rank, ...ranks.filter(r => r !== groups[0].rank)] };
  return { handRank: 0, handName: 'Carta Alta', kickers: ranks };
}

function bestHand(cards) {
  const combos = combinations(cards, 7);
  let best = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || compareHands(result, best) > 0) {
      best = { ...result, cards: combo };
    }
  }
  return best;
}

function compareHands(a, b) {
  if (a.handRank !== b.handRank) return a.handRank - b.handRank;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ka = a.kickers[i] || 0;
    const kb = b.kickers[i] || 0;
    if (ka !== kb) return ka - kb;
  }
  return 0;
}

module.exports = { evaluate5, bestHand, compareHands, combinations };
