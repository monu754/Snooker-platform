"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { AlertTriangle, Undo2, Flag, Pause, Play, Square, Clock, Activity } from "lucide-react";

type Player = "A" | "B";
type EventLog = { id: string; time: string; player: Player; action: string; points: number | string; type: "score" | "foul" | "system" };
type GameState = { scoreA: number; scoreB: number; breakScore: number; activePlayer: Player; events: EventLog[] };

export default function UmpireScoringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [matchStatus, setMatchStatus] = useState<"scheduled" | "live" | "paused" | "finished">("scheduled");
  const [frame, setFrame] = useState(1);
  const [activePlayer, setActivePlayer] = useState<Player>("A");
  const [breakScore, setBreakScore] = useState(0);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [framesWonA, setFramesWonA] = useState(0);
  const [framesWonB, setFramesWonB] = useState(0);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [history, setHistory] = useState<GameState[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");

    if (status !== "authenticated") return;

    // Fetch fresh match data AND load the saved scores so they survive reloads
    fetch(`/api/matches/${matchId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.match) {
          const currentMatch = data.match;
          const userRole = (session?.user as any)?.role;
          const userId = (session?.user as any)?.id;

          // ✅ SECURITY: Verify umpire owns this match (admin can access any match)
          if (userRole === "umpire" && currentMatch.umpireId?.toString() !== userId) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }
          
          const getEmbedUrl = (url: string) => {
            if (!url) return null;
            
            // YouTube
            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (ytMatch) {
              // Adding mute=1 and playsinline=1 to improve mobile autoplay reliability
              return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playsinline=1&rel=0` };
            }
            
            // Twitch
            const twitchChannel = url.match(/twitch\.tv\/([^"&?\/\s]+)/);
            if (twitchChannel) {
              const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
              return { type: "twitch", embedUrl: `https://player.twitch.tv/?channel=${twitchChannel[1]}&parent=${hostname}&autoplay=true&muted=true` };
            }

            return { type: "other", embedUrl: url };
          };

          setMatch(currentMatch);
          setMatchStatus(currentMatch.status);
          
          // Hydrate state from database
          setScoreA(currentMatch.scoreA || 0);
          setScoreB(currentMatch.scoreB || 0);
          setFramesWonA(currentMatch.framesWonA || 0);
          setFramesWonB(currentMatch.framesWonB || 0);
          setFrame(currentMatch.currentFrame || 1);
        }
        if (data.events) {
          setEvents(data.events.map((e: any) => ({
            id: e._id || Date.now().toString(),
            time: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            player: e.player,
            action: e.description,
            points: e.eventType === "foul" ? `Opponent +${e.points}` : `+${e.points}`,
            type: e.eventType === "foul" ? "foul" : (e.eventType === "score_update" ? "score" : "system")
          })));
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Match context error:", err);
        setIsLoading(false);
      });
  }, [status, session, router, matchId]);


  const saveHistory = () => {
    setHistory(prev => [...prev, { scoreA, scoreB, breakScore, activePlayer, events }]);
  };

  const undoLastAction = () => {
    if (history.length === 0 || matchStatus !== "live") return;
    const lastState = history[history.length - 1];
    if (!lastState) return;
    setScoreA(lastState.scoreA);
    setScoreB(lastState.scoreB);
    setBreakScore(lastState.breakScore);
    setActivePlayer(lastState.activePlayer);
    setEvents(lastState.events);
    setHistory(prev => prev.slice(0, -1));
    
    // Sync undo to DB
    syncToDatabase({ scoreA: lastState.scoreA, scoreB: lastState.scoreB });
  };

  const switchPlayer = (newPlayer: Player) => {
    if (activePlayer !== newPlayer && matchStatus === "live") {
      setActivePlayer(newPlayer);
      setBreakScore(0);
      // Sync active player to DB so watch page highlights the right player
      syncToDatabase({ activePlayer: newPlayer });
    }
  };

  // Centralized DB Sync Function
  const syncToDatabase = async (updates: any, eventLog?: EventLog) => {
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, eventLog })
      });
    } catch (error) { console.error("Database sync failed", error); }
  };

  const addScore = async (points: number, ballName: string) => {
    if (matchStatus !== "live") return; 

    saveHistory();
    const newScoreA = activePlayer === "A" ? scoreA + points : scoreA;
    const newScoreB = activePlayer === "B" ? scoreB + points : scoreB;
    const newBreak = breakScore + points;

    setScoreA(newScoreA);
    setScoreB(newScoreB);
    setBreakScore(newBreak);
    const ev = logEvent(activePlayer, `Potted ${ballName}`, `+${points}`, "score");
    
    // Instantly sync the new score to the database!
    await syncToDatabase({ scoreA: newScoreA, scoreB: newScoreB, currentFrame: frame, framesWonA, framesWonB }, ev);
  };

  const addFoul = async (penalty: number) => {
    if (matchStatus !== "live") return;

    saveHistory();
    const newScoreA = activePlayer === "B" ? scoreA + penalty : scoreA;
    const newScoreB = activePlayer === "A" ? scoreB + penalty : scoreB;

    setScoreA(newScoreA);
    setScoreB(newScoreB);
    const ev = logEvent(activePlayer, `Foul`, `Opponent +${penalty}`, "foul");
    
    await syncToDatabase({ scoreA: newScoreA, scoreB: newScoreB, currentFrame: frame, framesWonA, framesWonB }, ev);
    switchPlayer(activePlayer === "A" ? "B" : "A");
  };

  const handleEndFrame = async () => {
    if (matchStatus !== "live") return;

    if (window.confirm("Are you sure you want to end this frame?")) {
      saveHistory();
      const winner = scoreA > scoreB ? "A" : "B";
      
      const newFramesA = winner === "A" ? framesWonA + 1 : framesWonA;
      const newFramesB = winner === "B" ? framesWonB + 1 : framesWonB;
      const newFrameNum = frame + 1;
      
      setFramesWonA(newFramesA);
      setFramesWonB(newFramesB);
      const ev = logEvent(winner, "Won Frame", `${scoreA} - ${scoreB}`, "system");
      
      // Check for match winner (Auto-Conclude)
      const framesToWin = match.framesToWin || Math.ceil(match.totalFrames / 2);
      const matchWinner = newFramesA >= framesToWin ? "A" : (newFramesB >= framesToWin ? "B" : null);

      if (matchWinner) {
        setMatchStatus("finished");
        setScoreA(0);
        setScoreB(0);
        setBreakScore(0);
        const winnerName = matchWinner === "A" ? match.playerA : match.playerB;
        const finalEv = logEvent(matchWinner, "Won Match", `Final Score: ${newFramesA} - ${newFramesB}`, "system");
        await syncToDatabase({ 
          scoreA: 0, 
          scoreB: 0, 
          framesWonA: newFramesA, 
          framesWonB: newFramesB, 
          status: "finished",
          winner: winnerName
        }, finalEv);
        alert(`Match Concluded! Winner: ${winnerName}`);
      } else {
        setScoreA(0);
        setScoreB(0);
        setBreakScore(0);
        setFrame(newFrameNum);
        await syncToDatabase({ scoreA: 0, scoreB: 0, framesWonA: newFramesA, framesWonB: newFramesB, currentFrame: newFrameNum }, ev);
      }
    }
  };

  const logEvent = (player: Player, action: string, points: string, type: "score" | "foul" | "system") => {
    const newEvent: EventLog = { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      player, 
      action, 
      points, 
      type 
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  };

  const handleMatchControl = async (action: "paused" | "live" | "finished") => {
    if (action === "finished" && !window.confirm("CRITICAL: Are you sure you want to END the entire match?")) return;
    
    setMatchStatus(action);
    const updates: any = { status: action };
    
    if (action === "finished") {
      // Determine winner based on current frames won
      if (framesWonA > framesWonB) updates.winner = match.playerA;
      else if (framesWonB > framesWonA) updates.winner = match.playerB;
      else updates.winner = "Draw"; // Or logic for decider
    }

    const ev = logEvent("A", `Match ${action.toUpperCase()}`, "-", "system");
    await syncToDatabase(updates, ev);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Activity className="animate-spin text-emerald-500" size={32} /></div>;
  if (accessDenied) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400 mb-6">You are not assigned as the umpire for this match. You can only access matches assigned to you.</p>
        <a href="/umpire" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors">Back to My Matches</a>
      </div>
    </div>
  );
  if (!match) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Match not found.</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-lg gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                {matchStatus === "live" && <span className="bg-red-500/20 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold tracking-wider animate-pulse">LIVE</span>}
                {matchStatus === "paused" && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold tracking-wider">PAUSED</span>}
                {matchStatus === "scheduled" && <span className="bg-blue-500/20 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold tracking-wider">SCHEDULED</span>}
                {matchStatus === "finished" && <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold tracking-wider">FINISHED</span>}
                <span className="text-zinc-400 text-[10px] md:text-sm font-medium capitalize">Best of {match.totalFrames} • #{matchId.substring(0,8).toUpperCase()}</span>
              </div>
              <h1 className="text-lg md:text-xl text-white font-bold">{match.playerA} vs {match.playerB}</h1>
            </div>
            <div className="flex items-center gap-4 md:gap-6 bg-zinc-950 px-4 md:px-6 py-2 md:py-3 rounded-xl border border-zinc-800 w-full md:w-auto justify-center">
              <div className="text-center">
                <p className="text-zinc-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-0.5 md:mb-1">Frame</p>
                <p className="text-xl md:text-2xl font-black text-white">{frame}</p>
              </div>
              <div className="w-px h-6 md:h-8 bg-zinc-800"></div>
              <div className="text-center">
                <p className="text-zinc-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-0.5 md:mb-1">Target</p>
                <p className="text-xl md:text-2xl font-black text-emerald-500">{match.framesToWin || Math.ceil(match.totalFrames / 2)}</p>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlayerCard name={match.playerA} player="A" score={scoreA} framesWon={framesWonA} isActive={activePlayer === "A" && matchStatus === "live"} breakScore={breakScore} onClick={() => switchPlayer("A")} />
          <PlayerCard name={match.playerB} player="B" score={scoreB} framesWon={framesWonB} isActive={activePlayer === "B" && matchStatus === "live"} breakScore={breakScore} onClick={() => switchPlayer("B")} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-zinc-300 font-medium text-center sm:text-left w-full sm:w-auto">Record Points for <strong className="text-white">{activePlayer === "A" ? match.playerA : match.playerB}</strong></h3>
            <button 
              onClick={undoLastAction} 
              disabled={history.length === 0 || matchStatus !== "live"} 
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <Undo2 size={16} /> Undo
            </button>
          </div>
          
          <div className="flex flex-col items-center py-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Quick Add Points</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-full px-2">
              <BallButton disabled={matchStatus !== "live"} color="bg-red-600" text="white" points={1} onClick={() => addScore(1, "Red")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-yellow-500" text="black" points={2} onClick={() => addScore(2, "Yellow")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-emerald-600" text="white" points={3} onClick={() => addScore(3, "Green")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-orange-500" text="white" points={4} onClick={() => addScore(4, "Brown")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-blue-600" text="white" points={5} onClick={() => addScore(5, "Blue")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-pink-500" text="white" points={6} onClick={() => addScore(6, "Pink")} />
              <BallButton disabled={matchStatus !== "live"} color="bg-zinc-950" text="white" points={7} onClick={() => addScore(7, "Black")} />
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h4 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Record Foul (Awards points to opponent)</h4>
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {[4,5,6,7].map(pts => (
                <button 
                  key={pts} 
                  onClick={() => addFoul(pts)} 
                  disabled={matchStatus !== "live"}
                  className={`border py-3 rounded-xl font-bold text-lg transition-colors ${matchStatus !== "live" ? 'opacity-30 border-zinc-800 text-zinc-600 bg-zinc-950 cursor-not-allowed' : 'bg-zinc-950 hover:bg-zinc-800 border-red-900/50 text-red-400 cursor-pointer'}`}
                >
                  {pts}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-4">Match Administration</h3>
          
          {matchStatus === "finished" ? (
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center font-bold">
               Match Concluded
             </div>
          ) : (
            <>
              <button 
                onClick={handleEndFrame} 
                disabled={matchStatus !== "live"}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold mb-4 transition-colors ${matchStatus !== "live" ? "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-500 cursor-pointer"}`}
              >
                <Flag size={20} /> End Current Frame
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                {matchStatus === "live" ? (
                  <button onClick={() => handleMatchControl("paused")} className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer"><Pause size={16} /> Pause</button>
                ) : (
                  <button onClick={() => handleMatchControl("live")} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer"><Play size={16} /> Start / Resume</button>
                )}
                <button onClick={() => handleMatchControl("finished")} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer"><Square size={16} /> End Match</button>
              </div>
            </>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex-1 flex flex-col h-[400px] lg:h-auto">
          <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Clock size={14} /> System Event Log</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {events.length === 0 ? <p className="text-zinc-600 text-sm text-center mt-8">Match hasn't started yet.</p> : events.map((ev) => (
              <div key={ev.id} className={`p-3 rounded-lg border flex justify-between items-start ${ev.type === "score" ? "bg-zinc-950 border-zinc-800" : ev.type === "foul" ? "bg-red-500/5 border-red-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{ev.player === "A" ? match.playerA : ev.player === "B" ? match.playerB : "System"}</p>
                  <p className="text-xs text-zinc-400">{ev.action}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${ev.type === "foul" ? "text-red-400" : "text-emerald-400"}`}>{ev.points}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{ev.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ name, player, score, framesWon, isActive, breakScore, onClick }: any) {
  return (
    <div onClick={onClick} className={`relative rounded-2xl p-4 md:p-6 border-2 transition-all cursor-pointer overflow-hidden ${isActive ? "bg-zinc-950 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.02] z-10" : "bg-zinc-900 border-zinc-800 opacity-60 hover:opacity-100"}`}>
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <div><h2 className="text-lg md:text-2xl font-bold text-white leading-tight truncate max-w-[150px] md:max-w-none">{name}</h2><p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Player {player}</p></div>
        <div className="bg-zinc-800 px-2.5 py-1 rounded-lg text-white font-bold text-xs md:text-sm" title="Frames Won">({framesWon})</div>
      </div>
      <div className="text-center my-4 md:my-6"><span className="text-6xl md:text-[100px] leading-none font-black text-white tracking-tighter">{score}</span></div>
      <div className={`text-center py-1.5 md:py-2 rounded-lg border ${isActive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-zinc-900 border-zinc-800"}`}><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Break: </span><span className={`text-sm font-bold ${isActive ? "text-emerald-400" : "text-zinc-400"}`}>{isActive ? breakScore : 0}</span></div>
    </div>
  );
}

function BallButton({ color, points, text, onClick, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${color} w-10 h-10 min-w-[40px] md:w-16 md:h-16 rounded-full shadow-lg flex items-center justify-center text-base md:text-xl font-black ${text === 'white' ? 'text-white' : 'text-zinc-900'} active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed group`}
    >
      <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-zinc-900 rounded-full border-2 border-zinc-800 flex items-center justify-center text-[8px] md:text-[10px] text-zinc-400 font-bold">{points}</div>
      {points}
    </button>
  );
}
