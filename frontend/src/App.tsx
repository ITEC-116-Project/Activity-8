import React, { useState } from 'react';
import Auth from './components/Auth';
import MainPage from './pages/MainPage';
import './App.css';

interface User {
  id: string;
  username: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const containerStyle: React.CSSProperties = {
    width: '100vw',
    minHeight: '100vh',
    margin: 0,
    padding: user ? '40px 20px' : '20px',
    background: 'linear-gradient(135deg, #051937 0%, #0f766e 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: user ? 'flex-start' : 'center',
    boxSizing: 'border-box'
  };

  return (
    <div style={containerStyle}>
      {!user ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <MainPage user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;