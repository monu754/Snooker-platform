type MatchAnalyticsSource = {
  playerA: string;
  playerB: string;
  framesWonA?: number;
  framesWonB?: number;
  winner?: string;
  status?: string;
};

type EventAnalyticsSource = {
  player?: string;
  eventType?: string;
  points?: number;
  description?: string;
};

type PlayerAnalytics = {
  player: string;
  matches: number;
  wins: number;
  framesWon: number;
  framesLost: number;
  scoringVisits: number;
  foulPointsDrawn: number;
  highestScoringVisit: number;
  winRate: number;
};

function ensurePlayer(map: Map<string, PlayerAnalytics>, player: string) {
  if (!map.has(player)) {
    map.set(player, {
      player,
      matches: 0,
      wins: 0,
      framesWon: 0,
      framesLost: 0,
      scoringVisits: 0,
      foulPointsDrawn: 0,
      highestScoringVisit: 0,
      winRate: 0,
    });
  }

  return map.get(player)!;
}

export function buildPlayerAnalytics(matches: MatchAnalyticsSource[], events: EventAnalyticsSource[]) {
  const analytics = new Map<string, PlayerAnalytics>();

  for (const match of matches) {
    const playerA = ensurePlayer(analytics, match.playerA);
    const playerB = ensurePlayer(analytics, match.playerB);

    playerA.matches += 1;
    playerB.matches += 1;
    playerA.framesWon += Number(match.framesWonA || 0);
    playerA.framesLost += Number(match.framesWonB || 0);
    playerB.framesWon += Number(match.framesWonB || 0);
    playerB.framesLost += Number(match.framesWonA || 0);

    if (match.winner === match.playerA) {
      playerA.wins += 1;
    } else if (match.winner === match.playerB) {
      playerB.wins += 1;
    }
  }

  for (const event of events) {
    if (!event.player || event.player === "System") continue;
    const player = ensurePlayer(analytics, event.player);

    if (event.eventType === "score_update") {
      player.scoringVisits += 1;
      player.highestScoringVisit = Math.max(player.highestScoringVisit, Number(event.points || 0));
    }

    if (event.eventType === "foul") {
      player.foulPointsDrawn += Math.max(Number(event.points || 0), 0);
    }
  }

  return Array.from(analytics.values())
    .map((player) => ({
      ...player,
      winRate: player.matches > 0 ? Number(((player.wins / player.matches) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.framesWon - a.framesWon || a.player.localeCompare(b.player));
}
