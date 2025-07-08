import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import TaskDetail from './pages/TaskDetail';
import TaskPool from './pages/TaskPool';
import Scan from './pages/Scan';
import AIAssistant from './pages/AIAssistant';
import MapDashboard from './pages/MapDashboard';
import TeamPerformance from './pages/TeamPerformance';
import Profile from './pages/Profile';
import Tutorial from './pages/Tutorial';

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/tasks/:id" element={<TaskDetail />} />
                      <Route path="/task-pool" element={<TaskPool />} />
                      <Route path="/scan" element={<Scan />} />
                      <Route path="/ai-assistant" element={<AIAssistant />} />
                      <Route path="/map" element={<MapDashboard />} />
                      <Route path="/team-performance" element={<TeamPerformance />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 