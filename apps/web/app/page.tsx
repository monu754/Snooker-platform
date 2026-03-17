"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Play, Activity, CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto advance slides every 5 seconds
  useEffect(() => {
    if (liveMatches.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % liveMatches.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [liveMatches.length]);

  useEffect(() => {
    const fetchLatestData = () => {
      fetch("/api/matches", { cache: "no-store" }) 
        .then(res => res.json())
        .then(data => {
          const matches = data.matches || [];
          setLiveMatches(matches.filter((m: any) => m.status === 'live' || m.status === 'paused'));
          setScheduledMatches(matches.filter((m: any) => m.status === 'scheduled'));
          setIsLoading(false);
        });
    };

    fetchLatestData(); 
    const interval = setInterval(fetchLatestData, 3000); // Polling for real-time score updates!
    return () => clearInterval(interval); 
  }, []);

  // Filter matches based on search query
  const filteredLiveMatches = liveMatches.filter((match) => 
    match.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerA.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerB.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScheduledMatches = scheduledMatches.filter((match) => 
    match.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerA.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerB.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans">
      <header className="h-20 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 group">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] group-hover:animate-pulse transition-all"></div>
            <span className="font-bold text-xl md:text-2xl text-white tracking-tight">Snooker<span className="text-emerald-500">Stream</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#live" className="text-zinc-300 hover:text-white font-medium transition-colors">Live Matches</Link>
            <Link href="#schedule" className="text-zinc-300 hover:text-white font-medium transition-colors">Upcoming</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {status === "loading" ? (
             <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          ) : session ? (
            <div className="flex items-center gap-4">
              {(session.user as any)?.role === "admin" && (
                <Link href="/admin" className="text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                  Admin Dashboard
                </Link>
              )}
              {(session.user as any)?.role === "umpire" && (
                <Link href="/umpire" className="text-sm font-semibold bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-800/50">
                  Umpire Panel
                </Link>
              )}
              
              <div className="w-px h-6 bg-zinc-800 hidden md:block"></div>
              
              <Link 
                href="/profile" 
                className="flex items-center gap-3 group transition-all"
                title="Profile Settings"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-zinc-800 transition-all overflow-hidden">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-zinc-500 group-hover:text-emerald-500 transition-colors capitalize font-bold">
                      {session.user?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-bold text-white leading-none mb-0.5">{session.user?.name}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">{session.user?.email}</p>
                </div>
              </Link>

              <button 
                onClick={() => signOut()} 
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full transition-colors shadow-lg shadow-emerald-900/20">
                <span className="hidden sm:inline">Subscribe Now</span>
                <span className="sm:hidden">Subscribe</span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero / Top Live Matches Carousel (Hotstar Style) */}
      <section className="relative w-full h-[60vh] md:h-[75vh] bg-black overflow-hidden border-b border-zinc-800 flex items-center justify-center">
        {isLoading ? (
          <Activity className="animate-spin text-emerald-500 relative z-10" size={48} />
        ) : liveMatches.length === 0 ? (
          <div className="text-center z-10 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
             <p className="text-zinc-500 font-medium text-lg">No live matches currently in progress.</p>
          </div>
        ) : (
          <>
            {/* Background Layers */}
            <div className="absolute inset-0 z-0">
               {/* Per-match background: use thumbnail if available, else fallback */}
               {liveMatches.map((match, idx) => (
                 <div
                   key={match._id}
                   className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                 >
                   <img
                     src={match.thumbnailUrl || "https://images.unsplash.com/photo-1628190715364-77218f2a9ccb?q=80&w=2070&auto=format&fit=crop"}
                     alt={match.title}
                     className="w-full h-full object-cover opacity-30"
                     onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1628190715364-77218f2a9ccb?q=80&w=2070&auto=format&fit=crop"; }}
                   />
                 </div>
               ))}
               <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
            </div>

            {/* Content Container */}
            <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 relative z-10 flex flex-col justify-end h-full pb-16 md:pb-24">
               {liveMatches.map((match, idx) => (
                 <div 
                   key={match._id} 
                   className={`transition-all duration-700 ease-in-out absolute inset-0 max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-16 md:pb-24 ${idx === currentSlide ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-12 pointer-events-none z-0'}`}
                 >
                   <div className="max-w-3xl">
                     <div className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-full mb-6 max-w-fit ${match.status === 'live' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                       <div className={`w-2 h-2 rounded-full ${match.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}></div>
                       <span className={`text-xs font-bold tracking-widest uppercase ${match.status === 'live' ? 'text-red-500' : 'text-orange-500'}`}>
                         {match.status === 'live' ? 'Live Now' : 'Paused'}
                       </span>
                     </div>
                     
                      <h1 className="text-3xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-tight md:leading-none tracking-tighter mb-4 drop-shadow-2xl">
                        {match.playerA} <span className="text-zinc-600 font-medium px-1 md:px-2 text-xl md:text-4xl">vs</span> {match.playerB}
                      </h1>
                      
                      <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8 text-lg md:text-2xl font-bold">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white truncate max-w-[100px] md:max-w-[150px]">{match.playerA}</span>
                          <span className="text-3xl md:text-5xl text-emerald-400">{match.scoreA || 0}</span>
                        </div>
                        <span className="text-zinc-700">-</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl md:text-5xl text-zinc-400">{match.scoreB || 0}</span>
                          <span className="text-zinc-400 truncate max-w-[100px] md:max-w-[150px]">{match.playerB}</span>
                        </div>
                      </div>
                     
                      <div className="flex flex-row flex-wrap gap-3 md:gap-4">
                        <Link 
                          href={`/watch/${match._id}`} 
                          className="inline-flex items-center justify-center gap-2 md:gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-base md:text-lg transition-all shadow-xl shadow-emerald-900/30"
                        >
                          <Play fill="currentColor" size={18} /> Watch Now
                        </Link>
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-full text-zinc-300 font-medium capitalize w-fit text-sm md:text-base">
                          <Activity size={18} className={match.status === 'live' ? 'text-emerald-500' : 'text-orange-500'} /> 
                          <span className="hidden sm:inline">Frame {match.currentFrame || 1} • Target {match.framesToWin || Math.ceil(match.totalFrames / 2)}</span>
                          <span className="sm:hidden">F{match.currentFrame || 1} • T{match.framesToWin || Math.ceil(match.totalFrames / 2)}</span>
                        </div>
                      </div>
                   </div>
                 </div>
               ))}
            </div>

            {/* Navigation Controls */}
            {liveMatches.length > 1 && (
              <div className="absolute bottom-8 right-8 z-30 flex items-center gap-4 bg-zinc-950/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800 shadow-2xl">
                <button 
                  onClick={() => setCurrentSlide(prev => prev === 0 ? liveMatches.length - 1 : prev - 1)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex gap-2">
                  {liveMatches.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 transition-all rounded-full cursor-pointer ${idx === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-700 hover:bg-zinc-500'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentSlide(prev => (prev + 1) % liveMatches.length)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Main Content Areas */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-16 space-y-20">
        
        {/* Search Bar Section */}
        <div className="relative max-w-2xl mx-auto -mt-6 px-4 md:px-0">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover:bg-emerald-500/20 transition-all duration-300"></div>
            <div className="relative flex items-center bg-zinc-900 border border-zinc-700/50 rounded-2xl p-1.5 md:p-2 shadow-2xl">
              <Search className="text-zinc-400 ml-3 md:ml-4 mr-2" size={20} />
              <input 
                type="text" 
                placeholder="Search matches or players..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-zinc-500 px-2 md:px-4 py-2.5 md:py-3 outline-none text-base md:text-lg"
              />
            </div>
          </div>
        </div>

        <section id="live" className="scroll-mt-24">
           <h2 className="text-2xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
             <Activity className="text-emerald-500" />
             All Live Matches <span className="text-zinc-500 text-base font-medium ml-2">({filteredLiveMatches.length})</span>
           </h2>
           
           {!isLoading && filteredLiveMatches.length === 0 ? (
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30 text-center">
               <Activity className="mx-auto text-zinc-700 mb-4" size={48} />
               <h3 className="text-xl font-bold text-white mb-2">{searchQuery ? 'No matching live matches' : 'No matches live right now'}</h3>
               <p className="text-zinc-500">{searchQuery ? 'Try a different search term.' : 'Check back later for exciting snooker action.'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredLiveMatches.map(match => (
                 <MatchCard key={match._id} match={match} />
               ))}
             </div>
           )}
        </section>

        <section id="schedule" className="scroll-mt-24">
           <h2 className="text-2xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
             <CalendarDays className="text-blue-500" />
             Scheduled Matches <span className="text-zinc-500 text-base font-medium ml-2">({filteredScheduledMatches.length})</span>
           </h2>
           
           {!isLoading && filteredScheduledMatches.length === 0 ? (
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30 text-center">
               <CalendarDays className="mx-auto text-zinc-700 mb-4" size={48} />
               <h3 className="text-xl font-bold text-white mb-2">{searchQuery ? 'No matching scheduled matches' : 'No upcoming matches'}</h3>
               <p className="text-zinc-500">{searchQuery ? 'Try a different search term.' : 'The schedule is currently clear. Admins will add new matches soon.'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredScheduledMatches.map((match: any) => (
                 <MatchCard key={match._id} match={match} />
               ))}
             </div>
           )}
         </section>

      </main>
    </div>
  );
}function MatchCard({ match }: { match: any }) {
  const isScheduled = match.status === 'scheduled';
  return (
    <Link href={`/watch/${match._id}`} className="bg-[#121214] border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors group flex flex-col justify-between h-full">
       {/* Thumbnail Image */}
       {match.thumbnailUrl ? (
         <div className="relative w-full h-36 overflow-hidden flex-shrink-0">
           <img
             src={match.thumbnailUrl}
             alt={match.title}
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-[#121214] to-transparent" />
           {/* Status badge overlaid on the image */}
           <span className={`absolute top-3 left-3 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${
             isScheduled ? 'text-blue-400 bg-blue-500/20 border-blue-500/30 backdrop-blur-sm' :
             (match.status === 'live' ? 'text-red-400 bg-red-500/20 border-red-500/30 backdrop-blur-sm' :
             'text-orange-400 bg-orange-500/20 border-orange-500/30 backdrop-blur-sm')
           }`}>
             {match.status.toUpperCase()}
           </span>
         </div>
       ) : null}

       <div className="p-5 flex flex-col flex-1">
         {!match.thumbnailUrl && (
           <div className="flex justify-between items-start mb-6">
             <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${isScheduled ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : (match.status === 'live' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-orange-400 bg-orange-500/10 border-orange-500/20')}`}>
               {match.status.toUpperCase()}
             </span>
             <span className="text-[10px] text-zinc-500 font-medium uppercase">{isScheduled ? new Date(match.scheduledTime).toLocaleDateString() : `Frame ${match.currentFrame || 1}`}</span>
           </div>
         )}
         {match.thumbnailUrl && (
           <div className="flex justify-end mb-2">
             <span className="text-[10px] text-zinc-500 font-medium uppercase">{isScheduled ? new Date(match.scheduledTime).toLocaleDateString() : `Frame ${match.currentFrame || 1}`}</span>
           </div>
         )}

         <div className="space-y-3 mb-6 flex-1 flex flex-col justify-center">
           <div className="flex justify-between items-center">
              <span className="font-bold text-white truncate max-w-[150px]">{match.playerA}</span>
              {!isScheduled && <span className="font-black text-xl text-emerald-400">{match.scoreA || 0}</span>}
           </div>
           <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-400 truncate max-w-[150px]">{match.playerB}</span>
              {!isScheduled && <span className="font-black text-xl text-zinc-500">{match.scoreB || 0}</span>}
           </div>
         </div>

         {isScheduled && (
           <div className="mt-auto pt-4 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center">
             <span>{new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             <span className="flex items-center gap-1"><Play size={12} className="text-blue-500 group-hover:text-blue-400"/>View</span>
           </div>
         )}
       </div>
    </Link>
  );
}