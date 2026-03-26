export type BracketMatch = {
  id: string;
  round: number;
  position: number;
  playerA: string;
  playerB: string;
};

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(Math.max(value, 2)));
}

export function generateBracket(entrants: string[]) {
  const cleaned = entrants.map((entry) => entry.trim()).filter(Boolean);
  const bracketSize = nextPowerOfTwo(cleaned.length);
  const seeded = [...cleaned];

  while (seeded.length < bracketSize) {
    seeded.push("BYE");
  }

  const rounds: BracketMatch[][] = [];
  let currentRound = seeded;
  let roundNumber = 1;

  while (currentRound.length > 1) {
    const matches: BracketMatch[] = [];
    const nextRound: string[] = [];

    for (let index = 0; index < currentRound.length; index += 2) {
      const playerA = currentRound[index] || "BYE";
      const playerB = currentRound[index + 1] || "BYE";
      matches.push({
        id: `r${roundNumber}-m${index / 2 + 1}`,
        round: roundNumber,
        position: index / 2 + 1,
        playerA,
        playerB,
      });
      nextRound.push(playerA === "BYE" ? playerB : playerB === "BYE" ? playerA : `Winner ${index / 2 + 1}`);
    }

    rounds.push(matches);
    currentRound = nextRound;
    roundNumber += 1;
  }

  return {
    entrants: cleaned,
    bracketSize,
    rounds,
  };
}
