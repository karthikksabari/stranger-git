import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// We are importing the provider we just created
import { GithubProvider } from './context/GithubContext.jsx'; 
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrapping the App so it can use the Brain */}
    <GithubProvider>
      <App />
    </GithubProvider>
  </React.StrictMode>,
);