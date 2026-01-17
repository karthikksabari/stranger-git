import { useState, useEffect, useRef, useMemo, useContext } from 'react';
import GithubContext from './context/GithubContext'; 
import './App.css';

// IMAGES
import graveyardImage from './assets/graveyard.jpg'; 
import upsidedownImage from './assets/upsidedown.jpg'; 
import maxImage from './assets/maxanitrans.png';
import textImage from './assets/text.png';
import demogorgonImage from './assets/demogorgon.png'; 

// HOOK: DEBOUNCE
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function App() {
  const { 
    repos, loading, errorType, hasMore, query, 
    searchGithub, resetContext, setQuery, incrementPage, page
  } = useContext(GithubContext);

  const [isFloating, setIsFloating] = useState(false);
  const [isUpsideDown, setIsUpsideDown] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [filterQuery, setFilterQuery] = useState(""); 
  const debouncedFilter = useDebounce(filterQuery, 500); 
  
  const [sortBy, setSortBy] = useState('stars'); 
  const [showStats, setShowStats] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const sensorRef = useRef(null);

  // --- PRELOAD IMAGES ---
  useEffect(() => {
    const img1 = new Image();
    img1.src = graveyardImage;
    const img2 = new Image();
    img2.src = upsidedownImage;
    const img3 = new Image();
    img3.src = demogorgonImage;
  }, []);

  const langColors = {
    JavaScript: '#f1e05a', TypeScript: '#2b7489', Python: '#3572A5',
    Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c',
    Go: '#00ADD8', C: '#555555', 'C++': '#f34b7d',
    Rust: '#dea584', Shell: '#89e051', Other: '#ff0000'
  };

  useEffect(() => {
    if (repos.length > 0 || errorType) {
      setIsFloating(true);
      setIsFlipped(true);
      setIsUpsideDown(true);
      const savedY = localStorage.getItem('sg_scroll_y');
      if(savedY) setTimeout(() => window.scrollTo(0, parseInt(savedY)), 100);
    }
  }, [repos.length, errorType]);

  useEffect(() => {
    const handleScroll = () => {
      if(isUpsideDown) localStorage.setItem('sg_scroll_y', window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isUpsideDown]);

  const cleanInput = (input) => {
    return input.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\/$/, '');
  };

  const handleSearch = () => {
    if(!query) return;
    const cleaned = cleanInput(query);
    
    setIsFloating(true);
    setTimeout(() => {
      setIsFlipped(true); 
    }, 2000);
    setTimeout(() => {
      setIsUpsideDown(true);
      searchGithub(cleaned, 1); 
    }, 3250); 
  };

  const handleReset = () => {
    setIsFlipped(false);
    setTimeout(() => {
        setIsUpsideDown(false);
        setIsFloating(false);
        resetContext(); 
        setShowStats(false);
        setFilterQuery("");
    }, 500); 
  };

  const processedRepos = useMemo(() => {
    let result = [...repos];
    if (debouncedFilter) {
      result = result.filter(repo => 
        repo.name.toLowerCase().includes(debouncedFilter.toLowerCase())
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count;
      if (sortBy === 'forks') return b.forks_count - a.forks_count;
      if (sortBy === 'updated') return new Date(b.updated_at) - new Date(a.updated_at);
      return 0;
    });
    return result;
  }, [repos, debouncedFilter, sortBy]);

  const languageStats = useMemo(() => {
    const stats = {};
    let total = 0;
    repos.forEach(repo => {
      if (repo.language) {
        stats[repo.language] = (stats[repo.language] || 0) + 1;
        total++;
      }
    });
    return Object.entries(stats)
      .map(([lang, count]) => ({ lang, count, percent: Math.round((count/total)*100) }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5); 
  }, [repos]);

  const pieChartGradient = useMemo(() => {
    if (languageStats.length === 0) return 'conic-gradient(#333 0% 100%)';
    let gradientString = 'conic-gradient(';
    let currentDeg = 0;
    languageStats.forEach((stat, index) => {
      const color = langColors[stat.lang] || langColors.Other;
      const deg = (stat.percent / 100) * 360;
      const endDeg = currentDeg + deg;
      gradientString += `${color} ${currentDeg}deg ${endDeg}deg`;
      if (index < languageStats.length - 1) gradientString += ', ';
      currentDeg = endDeg;
    });
    if (currentDeg < 360) gradientString += `, #333 ${currentDeg}deg 360deg`;
    gradientString += ')';
    return gradientString;
  }, [languageStats]);

  useEffect(() => {
    if (!isUpsideDown || errorType) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        incrementPage(); 
      }
    }, { threshold: 0.1 });
    if (sensorRef.current) observer.observe(sensorRef.current);
    return () => observer.disconnect();
  }, [isUpsideDown, hasMore, loading, errorType]);

  useEffect(() => {
    if (page > 1) {
       searchGithub(cleanInput(query), page);
    }
  }, [page]);

  const orgLogo = repos.length > 0 ? repos[0].owner.avatar_url : null;
  const saveToken = () => {
    if(tokenInput) localStorage.setItem('stranger_git_token', tokenInput);
    setShowToken(false);
  };

  return (
    <div className="app-container">
      <div 
        className="bg-layer"
        style={{ 
          backgroundImage: `url(${isUpsideDown ? upsidedownImage : graveyardImage})`,
          filter: errorType ? 'grayscale(100%) brightness(0.4)' : 'none' 
        }}
      ></div>

      {isUpsideDown && !errorType && <div className="lightning-overlay"></div>}
      {isUpsideDown && <div className="fog-layer"></div>}

      <div className={`rotator-wrapper ${isFlipped ? 'flipped-state' : ''}`}>

        {/* --- NORMAL WORLD --- */}
        {!isUpsideDown && (
          <>
            <img src={textImage} alt="Stranger Git" className="landing-header-image" />
            <img src={maxImage} alt="Max" className={`max-character ${isFloating ? 'floating-up' : ''}`} />
            
            <div className={`search-box ${isFloating ? 'hidden' : ''}`}>
              <svg className="git-search-logo" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <input 
                type="text" 
                placeholder="Enter Name (User or Org)..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="icon-button" onClick={handleSearch}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="token-btn" onClick={() => setShowToken(true)} title="Enter API Key">🔑</button>
            </div>
          </>
        )}

        {/* --- UPSIDE DOWN WORLD --- */}
        {isUpsideDown && (
          <div className="results-container flipped-content-fix">
             
            {/* --- HEADER --- */}
            <div className="upside-down-header-new">
              <button className="back-icon-btn" onClick={handleReset} title="Go Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14L4 9l5-5"/>
                  <path d="M4 9h10c3 0 7 1.5 7 8"/>
                </svg>
              </button>
               
              <div className="header-center-group">
                {orgLogo && !errorType && <img src={orgLogo} alt="Logo" className="header-circular-logo" />}
                
                {!errorType && (
                  <div className="header-search-wrapper">
                    <svg className="search-icon-small" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                      className="header-search-input"
                      placeholder="Search Projects..." 
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="header-right-tools-container">
                 {!errorType && (
                   <button 
                     className="stats-icon-btn" 
                     onClick={() => setShowStats(true)}
                     style={{ background: pieChartGradient }}
                     title="View Language Stats"
                   ></button>
                 )}
                  {!errorType && (
                   <div className="sort-wrapper">
                      <select className="sort-select-rounded" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="stars">Stars ⭐</option>
                        <option value="forks">Forks 🍴</option>
                        <option value="updated">Date 📅</option>
                      </select>
                   </div>
                 )}
              </div>
            </div>

             {/* --- ERROR CONTAINER (THE ABYSS) --- */}
             {errorType && (
               <div className="error-container">
                 {/* DEMOGORGON IMAGE BEHIND TEXT */}
                 <img src={demogorgonImage} className="demogorgon-error" alt="The Demogorgon" />
                 
                 <div className="error-content-wrapper">
                    <h2 className="error-title">
                    {errorType === '404' ? "404 - NOT FOUND" : "403 - GATE CLOSED"}
                    </h2>
                    <p className="error-msg">
                    {errorType === '404' 
                        ? `The Demogorgon has swallowed "${cleanInput(query)}". It does not exist in this reality.` 
                        : "The Mind Flayer blocks your path. (Rate Limit Exceeded)."}
                    </p>
                    <button className="escape-btn" onClick={handleReset}>ESCAPE THE ABYSS</button>
                 </div>
               </div>
             )}

             {/* --- CARDS GRID --- */}
             {!errorType && (
               <>
                 <div className="cards-grid">
                   {processedRepos.map((repo, index) => (
                     <div 
                       key={`${repo.id}-${index}`} 
                       className="repo-card"
                       onClick={() => window.open(repo.html_url, '_blank')}
                       style={{ cursor: 'pointer' }}
                     >
                       <h3>{repo.name}</h3>
                       <p>{repo.description || "Secrets lost in the void..."}</p>
                       <div className="repo-stats">
                         <span>⭐ {repo.stargazers_count}</span>
                         <span>🍴 {repo.forks_count}</span>
                         <span>🔤 {repo.language}</span>
                       </div>
                     </div>
                   ))}
                   {loading && (
                     <>
                       <div className="skeleton-card"></div>
                       <div className="skeleton-card"></div>
                       <div className="skeleton-card"></div>
                       <div className="skeleton-card"></div>
                     </>
                   )}
                 </div>
                 {hasMore && !filterQuery && !loading && (
                   <div ref={sensorRef} className="loading-sensor"></div>
                 )}
               </>
             )}
          </div>
        )}
      </div> 

      {/* --- MODALS (Same as before) --- */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">LANGUAGE DATA</h2>
            <div className="chart-container">
               {languageStats.map(stat => (
                 <div key={stat.lang} className="lang-row">
                   <span style={{color: langColors[stat.lang] || '#fff'}}>{stat.lang}</span>
                   <span style={{color: '#ffaaaa'}}>{stat.percent}% ({stat.count})</span>
                 </div>
               ))}
               {languageStats.length === 0 && <p>No Data Available</p>}
            </div>
            <button className="close-modal-btn" onClick={() => setShowStats(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {showToken && (
        <div className="modal-overlay" onClick={() => setShowToken(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">ENTER THE KEY</h2>
            <p style={{marginBottom: '20px'}}>Enter GitHub Personal Access Token to bypass limits.</p>
            <input 
              type="text" 
              className="token-input-field" 
              placeholder="ghp_..." 
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button className="close-modal-btn" onClick={saveToken}>SAVE KEY</button>
          </div>
        </div>
      )}
    </div> 
  );
}
