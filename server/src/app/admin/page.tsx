'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhnkrauedvbedvpgugcm.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobmtyYXVlZHZiZWR2cGd1Z2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg2MjEsImV4cCI6MjA5NTAzNDYyMX0.W5d7MZ4d7Ed4hWGHhJLUFoDo8FJ5vk-vWjHCHy1BffQ'
);

interface Department {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'HOD' | 'FACULTY';
  department: Department;
  avatarUrl?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Check session on mount and subscribe to auth changes
  useEffect(() => {
    const verifyAndSetSession = async (session: any) => {
      if (session) {
        const accessToken = session.access_token;
        setToken(accessToken);
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const payload = await res.json();
          if (payload.success && payload.data.role === 'ADMIN') {
            setIsAuthenticated(true);
            setIsAdmin(true);
          } else {
            setIsAuthenticated(true);
            setIsAdmin(false);
          }
        } catch (err) {
          showMsg('Failed to verify administrator privileges', 'error');
          setIsAuthenticated(true);
          setIsAdmin(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setToken('');
      }
    };

    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await verifyAndSetSession(session);
      } catch (err: any) {
        console.error('Failed to get session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        await verifyAndSetSession(session);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch users when token/authentication changes
  useEffect(() => {
    if (isAuthenticated && isAdmin && token) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin, token]);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/admin',
        },
      });
      if (error) {
        showMsg(error.message, 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'Connection error', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setToken('');
      setUsers([]);
      showMsg('Logged out successfully', 'success');
    } catch (err: any) {
      showMsg(err.message || 'Log out failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload.success) {
        setUsers(payload.data);
      } else {
        if (res.status === 401) {
          await handleLogout();
          showMsg('Session expired. Please log in again.', 'error');
        } else {
          showMsg(payload.error || 'Failed to fetch users', 'error');
        }
      }
    } catch (err: any) {
      showMsg(err.message || 'API fetch error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const promoteUser = async (userId: string) => {
    if (confirm('Are you sure you want to promote this user to HOD?')) {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/promote-hod', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        });
        const payload = await res.json();
        if (payload.success) {
          showMsg(payload.message || 'Promotion successful', 'success');
          fetchUsers();
        } else {
          showMsg(payload.error || 'Failed to promote', 'error');
        }
      } catch (err: any) {
        showMsg(err.message || 'Promotion failed', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const demoteUser = async (userId: string) => {
    if (confirm('Are you sure you want to demote this HOD to Faculty?')) {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/demote-hod', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        });
        const payload = await res.json();
        if (payload.success) {
          showMsg(payload.message || 'Demotion successful', 'success');
          fetchUsers();
        } else {
          showMsg(payload.error || 'Failed to demote', 'error');
        }
      } catch (err: any) {
        showMsg(err.message || 'Demotion failed', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate statistics
  const totalUsers = users.length;
  const hodCount = users.filter((u) => u.role === 'HOD').length;
  const facultyCount = users.filter((u) => u.role === 'FACULTY').length;

  if (loading && !token) {
    return (
      <div className="login-container">
        <style jsx global>{`
          body {
            margin: 0;
            background-color: #DCDCDC;
            font-family: 'Inter', sans-serif;
          }
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #DCDCDC;
          }
          .loading-text {
            font-family: 'Outfit', sans-serif;
            font-size: 1.2rem;
            font-weight: 600;
            color: #4B5563;
          }
        `}</style>
        <div className="loading-text">Verifying Portal Security...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

          body {
            margin: 0;
            background-color: #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background-color: #DCDCDC;
          }

          .login-card {
            background: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
            text-align: center;
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .logo {
            width: 54px;
            height: 54px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0147AD 0%, #1D5FD1 50%, #4A84F0 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 auto 24px auto;
            box-shadow: 0 8px 20px rgba(1, 71, 173, 0.15);
          }

          h2 {
            margin: 0 0 8px 0;
            font-family: 'Outfit', sans-serif;
            font-size: 1.6rem;
            font-weight: 700;
            color: #111827;
          }

          p.tagline {
            color: #6B7280;
            font-size: 0.9rem;
            margin: 0 0 32px 0;
          }

          .btn-login {
            width: 100%;
            background: #0147AD;
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(1, 71, 173, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.2s ease;
            margin-top: 10px;
          }

          .btn-login:hover {
            background-color: #1D5FD1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(1, 71, 173, 0.25);
          }

          .btn-login:disabled {
            background-color: #9CA3AF;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          .google-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
          }

          .toast {
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-weight: 500;
            font-size: 0.9rem;
            text-align: left;
            animation: slideIn 0.3s ease;
          }

          .toast-error {
            background-color: #fef2f2;
            color: #EF4444;
            border: 1px solid #fee2e2;
          }

          .toast-success {
            background-color: #f0fdf4;
            color: #10B981;
            border: 1px solid #dcfce7;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="login-card">
          <div className="logo">C</div>
          <h2>CHRIST Faculty Hub</h2>
          <p className="tagline">Admin Control & Security Portal</p>

          {message.text && (
            <div className={`toast toast-${message.type}`}>{message.text}</div>
          )}

          <button className="btn-login" onClick={handleGoogleLogin} disabled={loginLoading}>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {loginLoading ? 'Redirecting to Google...' : 'Sign In with Google'}
          </button>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="login-container">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

          body {
            margin: 0;
            background-color: #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background-color: #DCDCDC;
          }

          .login-card {
            background: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
            text-align: center;
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .logo-error {
            width: 54px;
            height: 54px;
            border-radius: 12px;
            background: #EF4444;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 auto 24px auto;
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);
          }

          h2 {
            margin: 0 0 8px 0;
            font-family: 'Outfit', sans-serif;
            font-size: 1.6rem;
            font-weight: 700;
            color: #111827;
          }

          p.tagline {
            color: #6B7280;
            font-size: 0.9rem;
            margin: 0 0 32px 0;
          }

          .btn-logout-error {
            width: 100%;
            background: #374151;
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-logout-error:hover {
            background-color: #4B5563;
          }
        `}</style>

        <div className="login-card">
          <div className="logo-error">!</div>
          <h2>403 Forbidden</h2>
          <p className="tagline">Your account does not have Administrator privileges. Please contact IT support if you believe this is an error.</p>

          <button className="btn-logout-error" onClick={handleLogout}>
            Log Out Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          background-color: #DCDCDC;
          font-family: 'Inter', sans-serif;
          color: #111827;
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          background: linear-gradient(135deg, #0147AD 0%, #1D5FD1 50%, #4A84F0 100%);
          padding: 24px 32px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(1, 71, 173, 0.15);
          color: white;
        }

        .logo-section h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0;
        }

        .logo-section p {
          color: #bfdbfe;
          font-size: 0.85rem;
          margin: 4px 0 0 0;
        }

        .btn-logout {
          background-color: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          padding: 8px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background-color: rgba(255, 255, 255, 0.25);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border: 1.5px solid #DCDCDC;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: #0147AD;
          box-shadow: 0 8px 24px rgba(1, 71, 173, 0.08);
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .blue-icon {
          background: rgba(1, 71, 173, 0.08);
          color: #0147AD;
        }

        .indigo-icon {
          background: rgba(29, 95, 209, 0.08);
          color: #1D5FD1;
        }

        .cyan-icon {
          background: rgba(74, 132, 240, 0.08);
          color: #4A84F0;
        }

        .stat-details h3 {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
        }

        .stat-details p {
          margin: 4px 0 0 0;
          color: #6B7280;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .msg-toast {
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .msg-success {
          background-color: #f0fdf4;
          color: #10B981;
          border: 1px solid #dcfce7;
        }

        .msg-error {
          background-color: #fef2f2;
          color: #EF4444;
          border: 1px solid #fee2e2;
        }

        /* Search & Filters Controls */
        .controls-card {
          background: white;
          border: 1.5px solid #DCDCDC;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .search-input {
          flex: 1;
          min-width: 250px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid #DCDCDC;
          outline: none;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #0147AD;
          box-shadow: 0 0 0 4px rgba(1, 71, 173, 0.15);
        }

        .filter-select {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid #DCDCDC;
          outline: none;
          font-size: 0.9rem;
          background-color: white;
          color: #111827;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .filter-select:focus {
          border-color: #0147AD;
        }

        .table-container {
          background: white;
          border: 1.5px solid #DCDCDC;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background-color: #f8fafc;
          padding: 16px 24px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          color: #6B7280;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #DCDCDC;
        }

        td {
          padding: 18px 24px;
          border-bottom: 1px solid #DCDCDC;
          font-size: 0.9rem;
          vertical-align: middle;
          color: #111827;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .faculty-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .faculty-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          background: linear-gradient(135deg, #0147AD, #1D5FD1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          color: white;
        }

        .faculty-info h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #111827;
        }

        .faculty-info p {
          margin: 2px 0 0 0;
          color: #6B7280;
          font-size: 0.8rem;
        }

        .dept-tag {
          background-color: #f3f4f6;
          border: 1px solid #DCDCDC;
          color: #111827;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .role-admin {
          background-color: #fee2e2;
          color: #EF4444;
          border: 1px solid #fecaca;
        }

        .role-hod {
          background-color: #dcfce7;
          color: #10B981;
          border: 1px solid #bbf7d0;
        }

        .role-faculty {
          background-color: #eff6ff;
          color: #0147AD;
          border: 1px solid #bfdbfe;
        }

        .action-cell {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-promote {
          background-color: #f0fdf4;
          color: #10B981;
          border: 1px solid #bbf7d0;
        }

        .btn-promote:hover {
          background-color: #10B981;
          color: white;
        }

        .btn-demote {
          background-color: #fef2f2;
          color: #EF4444;
          border: 1px solid #fecaca;
        }

        .btn-demote:hover {
          background-color: #EF4444;
          color: white;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Header Bar */}
      <header>
        <div className="logo-section">
          <h1>CHRIST Faculty Hub</h1>
          <p>Portal Security, HOD Assignments & Account Controls</p>
        </div>
        <div>
          <button className="btn-logout" onClick={handleLogout}>
            Log Out Portal
          </button>
        </div>
      </header>

      {/* Message Notifications */}
      {message.text && (
        <div className={`msg-toast msg-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-details">
            <h3>{loading ? '...' : totalUsers}</h3>
            <p>Total Accounts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
              <path d="M3 20h18" />
            </svg>
          </div>
          <div className="stat-details">
            <h3>{loading ? '...' : hodCount}</h3>
            <p>Active HODs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="stat-details">
            <h3>{loading ? '...' : facultyCount}</h3>
            <p>Faculty Members</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="controls-card">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="HOD">HOD</option>
          <option value="FACULTY">FACULTY</option>
        </select>
      </div>

      {/* Faculty list Table */}
      <div className="table-container">
        {loading && users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Fetching direct database records...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Faculty Profile</th>
                <th>Department</th>
                <th>Current Role</th>
                <th>Role Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="faculty-profile">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="faculty-avatar" />
                      ) : (
                        <div className="faculty-avatar">
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="faculty-info">
                        <h4>{user.fullName}</h4>
                        <p>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="dept-tag">{user.department?.code || 'GEN'}</span>
                  </td>
                  <td>
                    <span className={`role-badge role-${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <div className="action-cell">
                      {user.role === 'FACULTY' && (
                        <button
                          className="btn-action btn-promote"
                          onClick={() => promoteUser(user.id)}
                        >
                          Promote to HOD
                        </button>
                      )}
                      {user.role === 'HOD' && (
                        <button
                          className="btn-action btn-demote"
                          onClick={() => demoteUser(user.id)}
                        >
                          Demote to Faculty
                        </button>
                      )}
                      {user.role === 'ADMIN' && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
                          Root Lock
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                    No faculty members matching the query were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
