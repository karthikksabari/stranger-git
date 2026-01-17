import { createContext, useReducer, useEffect } from 'react';

const GithubContext = createContext();

// --- REDUCER: HANDLES DATA CHANGES ---
const githubReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true };
    case 'SET_REPOS':
      return { 
        ...state, 
        repos: action.payload.reset ? action.payload.data : [...state.repos, ...action.payload.data], 
        loading: false,
        hasMore: action.payload.data.length > 0
      };
    case 'SET_ERROR':
      return { ...state, loading: false, errorType: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_SEARCH_TYPE':
      return { ...state, searchType: action.payload };
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'RESET':
      return {
        ...state,
        repos: [],
        loading: false,
        errorType: null,
        page: 1,
        hasMore: true,
        query: '',
        searchType: 'orgs',
      };
    case 'RESTORE_SESSION':
      return { ...action.payload };
    default:
      return state;
  }
};

export const GithubProvider = ({ children }) => {
  const initialState = {
    repos: [],
    loading: false,
    errorType: null,
    page: 1,
    hasMore: true,
    query: '',
    searchType: 'orgs',
  };

  const [state, dispatch] = useReducer(githubReducer, initialState);
  
  // --- PERSISTENCE: LOAD ON START ---
  useEffect(() => {
    const savedSession = localStorage.getItem('stranger_git_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed.repos && parsed.repos.length > 0) {
        dispatch({ type: 'RESTORE_SESSION', payload: parsed });
      }
    }
  }, []);

  // --- PERSISTENCE: SAVE ON CHANGE ---
  useEffect(() => {
    if (state.repos.length > 0) {
      localStorage.setItem('stranger_git_session', JSON.stringify(state));
    }
  }, [state]);

  // --- THE SMART SEARCH FUNCTION ---
  const searchGithub = async (name, pageNum = 1, typeOverride = null) => {
    const typeToUse = typeOverride || (pageNum === 1 ? 'orgs' : state.searchType);
    const cacheKey = `sg_cache_${name}_${pageNum}_${typeToUse}`;

    // 1. CHECK CACHE (5 Minute Rule)
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { timestamp, data, type } = JSON.parse(cachedData);
      if (Date.now() - timestamp < 5 * 60 * 1000) { 
        console.log(`⚡ Context Loaded Cache: ${cacheKey}`);
        if (pageNum === 1) dispatch({ type: 'SET_SEARCH_TYPE', payload: type });
        dispatch({ 
          type: 'SET_REPOS', 
          payload: { data, reset: pageNum === 1 } 
        });
        return; 
      }
    }

    // 2. FETCH FROM API
    dispatch({ type: 'SET_LOADING' });
    
    const token = localStorage.getItem('stranger_git_token');
    const headers = token ? { 'Authorization': `token ${token}` } : {};

    try {
      let url = `https://api.github.com/${typeToUse}/${name}/repos?sort=stars&per_page=10&page=${pageNum}`;
      let response = await fetch(url, { headers });

      // Fallback: If Org 404, Try User
      if (response.status === 404 && pageNum === 1) {
        console.log("Context: Switching to User Search...");
        url = `https://api.github.com/users/${name}/repos?sort=stars&per_page=10&page=${pageNum}`;
        response = await fetch(url, { headers });
        if (response.ok) {
           dispatch({ type: 'SET_SEARCH_TYPE', payload: 'users' });
        }
      }

      if (!response.ok) {
        const status = response.status === 404 ? '404' : response.status === 403 ? '403' : '404';
        dispatch({ type: 'SET_ERROR', payload: status });
        return;
      }

      const data = await response.json();

      // SAVE TO CACHE
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data,
        type: state.searchType 
      }));

      dispatch({ 
        type: 'SET_REPOS', 
        payload: { data, reset: pageNum === 1 } 
      });

    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: '404' });
    }
  };

  const resetContext = () => {
    localStorage.removeItem('stranger_git_session');
    dispatch({ type: 'RESET' });
  };

  const setQuery = (q) => dispatch({ type: 'SET_QUERY', payload: q });
  const incrementPage = () => dispatch({ type: 'SET_PAGE', payload: state.page + 1 });

  return (
    <GithubContext.Provider value={{
      ...state,
      searchGithub,
      resetContext,
      setQuery,
      incrementPage
    }}>
      {children}
    </GithubContext.Provider>
  );
};

export default GithubContext;