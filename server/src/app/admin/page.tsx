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
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Department creation states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersStats, setUsersStats] = useState({ totalFaculty: 0, totalHods: 0 });

  const [deadlinesPage, setDeadlinesPage] = useState(1);
  const [deadlinesTotalPages, setDeadlinesTotalPages] = useState(1);
  const [deadlinesTotal, setDeadlinesTotal] = useState(0);

  const [remindersPage, setRemindersPage] = useState(1);
  const [remindersTotalPages, setRemindersTotalPages] = useState(1);
  const [remindersTotal, setRemindersTotal] = useState(0);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'USERS' | 'DEADLINES' | 'REMINDERS' | 'DEPARTMENTS'>('USERS');

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const [authChecking, setAuthChecking] = useState(true);

  // Check session on mount and subscribe to auth changes
  useEffect(() => {
    const verifyAndSetSession = async (session: any) => {
      if (session) {
        const accessToken = session.access_token;
        setToken(accessToken);

        // Check sessionStorage cache first to prevent redundant /api/auth/me requests
        try {
          const cached = sessionStorage.getItem('admin_session_cache');
          if (cached) {
            const { token: cachedToken, isAdmin: cachedIsAdmin } = JSON.parse(cached);
            if (cachedToken === accessToken) {
              setIsAuthenticated(true);
              setIsAdmin(cachedIsAdmin);
              return;
            }
          }
        } catch (_) {}

        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const payload = await res.json();
          const isUserAdmin = payload.success && payload.data.role === 'ADMIN';

          try {
            sessionStorage.setItem('admin_session_cache', JSON.stringify({
              token: accessToken,
              isAdmin: isUserAdmin
            }));
          } catch (_) {}

          if (isUserAdmin) {
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
        sessionStorage.removeItem('admin_session_cache');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setToken('');
      }
    };

    const initAuth = async () => {
      setAuthChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await verifyAndSetSession(session);
      } catch (err: any) {
        console.error('Failed to get session:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setAuthChecking(true);
        }
        await verifyAndSetSession(session);
        setAuthChecking(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch users when token/authentication changes
  useEffect(() => {
    if (isAuthenticated && isAdmin && token) {
      fetchUsers(1);
      fetchActivities(1, 1);
      fetchDepartments();
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

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload.success) {
        setUsers(payload.data.items || []);
        setUsersPage(payload.data.pagination.page);
        setUsersTotalPages(payload.data.pagination.pages);
        setUsersTotal(payload.data.pagination.total);
        setUsersStats({
          totalFaculty: payload.data.pagination.totalFaculty || 0,
          totalHods: payload.data.pagination.totalHods || 0,
        });
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

  const fetchActivities = async (dPage = 1, rPage = 1) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/activities?dPage=${dPage}&dLimit=10&rPage=${rPage}&rLimit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload.success) {
        setDeadlines(payload.data.deadlines.items || []);
        setDeadlinesPage(payload.data.deadlines.pagination.page);
        setDeadlinesTotalPages(payload.data.deadlines.pagination.pages);
        setDeadlinesTotal(payload.data.deadlines.pagination.total);

        setReminders(payload.data.reminders.items || []);
        setRemindersPage(payload.data.reminders.pagination.page);
        setRemindersTotalPages(payload.data.reminders.pagination.pages);
        setRemindersTotal(payload.data.reminders.pagination.total);
      } else {
        showMsg(payload.error || 'Failed to fetch user activities', 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'API fetch error', 'error');
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload.success) {
        setDepartments(payload.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const addDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      showMsg('Department Name and Code are required', 'error');
      return;
    }
    setDeptLoading(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newDeptName.trim(), code: newDeptCode.trim() }),
      });
      const payload = await res.json();
      if (payload.success) {
        showMsg('Department created successfully', 'success');
        setNewDeptName('');
        setNewDeptCode('');
        fetchDepartments();
      } else {
        showMsg(payload.error || 'Failed to create department', 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'Department creation failed', 'error');
    } finally {
      setDeptLoading(false);
    }
  };

  const assignDepartment = async (userId: string, departmentId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, departmentId }),
      });
      const payload = await res.json();
      if (payload.success) {
        showMsg('Department assigned successfully', 'success');
        fetchUsers(usersPage);
      } else {
        showMsg(payload.error || 'Failed to assign department', 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'Department assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUsersPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= usersTotalPages) {
      fetchUsers(newPage);
    }
  };

  const handleDeadlinesPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= deadlinesTotalPages) {
      fetchActivities(newPage, remindersPage);
    }
  };

  const handleRemindersPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= remindersTotalPages) {
      fetchActivities(deadlinesPage, newPage);
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
          fetchUsers(usersPage);
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
          fetchUsers(usersPage);
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
  const totalUsers = usersTotal;
  const hodCount = usersStats.totalHods;
  const facultyCount = usersStats.totalFaculty;

  if (authChecking) {
    return (
      <div className="login-container">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

          body {
            margin: 0;
            background: radial-gradient(circle at top right, rgba(1, 71, 173, 0.06), transparent),
                        radial-gradient(circle at bottom left, rgba(74, 132, 240, 0.06), transparent),
                        #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
            min-height: 100vh;
          }
          .login-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(1, 71, 173, 0.12);
            border-left-color: #0147AD;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            box-shadow: 0 0 15px rgba(1, 71, 173, 0.2);
          }
          .loading-text {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: #4B5563;
            letter-spacing: 0.5px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="spinner"></div>
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
            background: radial-gradient(circle at top right, rgba(1, 71, 173, 0.06), transparent),
                        radial-gradient(circle at bottom left, rgba(74, 132, 240, 0.06), transparent),
                        #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
            min-height: 100vh;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .login-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(1, 71, 173, 0.08);
            border-radius: 24px;
            padding: 48px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 50px rgba(1, 71, 173, 0.05),
                        0 0 30px rgba(1, 71, 173, 0.02);
            text-align: center;
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .logo {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: linear-gradient(135deg, #0147AD 0%, #4A84F0 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            margin: 0 auto 28px auto;
            box-shadow: 0 8px 24px rgba(1, 71, 173, 0.25);
            position: relative;
          }
          
          .logo::after {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 20px;
            background: linear-gradient(135deg, #0147AD, #4A84F0);
            z-index: -1;
            opacity: 0.5;
            filter: blur(8px);
          }

          h2 {
            margin: 0 0 8px 0;
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            color: #111827;
            letter-spacing: -0.5px;
          }

          p.tagline {
            color: #4B5563;
            font-size: 0.95rem;
            margin: 0 0 36px 0;
            line-height: 1.5;
          }

          .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #0147AD 0%, #4A84F0 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-family: 'Outfit', sans-serif;
            font-size: 1.05rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(1, 71, 173, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.25s ease;
          }

          .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(1, 71, 173, 0.3);
            filter: brightness(1.05);
          }

          .btn-login:active {
            transform: translateY(0);
          }

          .btn-login:disabled {
            background: #E5E7EB;
            color: #9CA3AF;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          .google-icon {
            width: 20px;
            height: 20px;
          }

          .toast {
            padding: 14px 18px;
            border-radius: 12px;
            margin-bottom: 24px;
            font-weight: 500;
            font-size: 0.9rem;
            text-align: left;
            animation: slideIn 0.3s ease;
          }

          .toast-error {
            background: rgba(239, 68, 68, 0.08);
            color: #EF4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
          }

          .toast-success {
            background: rgba(16, 185, 129, 0.08);
            color: #10B981;
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
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
            background: radial-gradient(circle at top right, rgba(239, 68, 68, 0.06), transparent),
                        radial-gradient(circle at bottom left, rgba(74, 132, 240, 0.06), transparent),
                        #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
            min-height: 100vh;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .login-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 24px;
            padding: 48px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08),
                        0 0 40px rgba(239, 68, 68, 0.04);
            text-align: center;
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .logo-error {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: rgba(239, 68, 68, 0.08);
            color: #EF4444;
            border: 1.5px solid rgba(239, 68, 68, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            margin: 0 auto 28px auto;
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.15);
          }

          h2 {
            margin: 0 0 12px 0;
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            color: #111827;
            letter-spacing: -0.5px;
          }

          p.tagline {
            color: #4B5563;
            font-size: 0.95rem;
            margin: 0 0 36px 0;
            line-height: 1.6;
          }

          .btn-logout-error {
            width: 100%;
            background: #F3F4F6;
            border: 1px solid rgba(0, 0, 0, 0.1);
            color: #111827;
            padding: 16px;
            border-radius: 14px;
            font-family: 'Outfit', sans-serif;
            font-size: 1.05rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
          }

          .btn-logout-error:hover {
            background-color: #E5E7EB;
            transform: translateY(-1px);
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
          background: radial-gradient(circle at top right, rgba(1, 71, 173, 0.06), transparent),
                      radial-gradient(circle at bottom left, rgba(74, 132, 240, 0.06), transparent),
                      #DCDCDC;
          font-family: 'Inter', sans-serif;
          color: #111827;
          min-height: 100vh;
        }

        .admin-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 40px 20px;
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(1, 71, 173, 0.08);
          padding: 24px 32px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(1, 71, 173, 0.05),
                      0 0 30px rgba(1, 71, 173, 0.01);
          color: #111827;
        }

        .logo-section h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #0147AD 0%, #4A84F0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-section p {
          color: #4B5563;
          font-size: 0.88rem;
          margin: 6px 0 0 0;
          font-weight: 500;
        }

        .btn-logout {
          background-color: #F3F4F6;
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #111827;
          padding: 10px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .btn-logout:hover {
          background-color: #EF4444;
          border-color: #EF4444;
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25);
          transform: translateY(-1px);
        }

        .btn-logout:active {
          transform: translateY(0);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 36px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(1, 71, 173, 0.08);
          border-radius: 20px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 22px;
          box-shadow: 0 8px 32px rgba(1, 71, 173, 0.04);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(1, 71, 173, 0.25);
          box-shadow: 0 12px 30px rgba(1, 71, 173, 0.08),
                      0 0 20px rgba(74, 132, 240, 0.03);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          transition: transform 0.3s;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.1) rotate(2deg);
        }

        .blue-icon {
          background: rgba(1, 71, 173, 0.08);
          color: #0147AD;
          border: 1px solid rgba(1, 71, 173, 0.15);
        }

        .indigo-icon {
          background: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .cyan-icon {
          background: rgba(74, 132, 240, 0.08);
          color: #4A84F0;
          border: 1px solid rgba(74, 132, 240, 0.15);
        }

        .stat-details h3 {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -1px;
        }

        .stat-details p {
          margin: 4px 0 0 0;
          color: #6B7280;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .msg-toast {
          padding: 14px 24px;
          border-radius: 12px;
          margin-bottom: 28px;
          font-weight: 500;
          font-size: 0.95rem;
          backdrop-filter: blur(8px);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .msg-success {
          background: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.05);
        }

        .msg-error {
          background: rgba(239, 68, 68, 0.08);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
        }

        .tabs-container {
          display: flex;
          gap: 6px;
          margin-bottom: 28px;
          border-bottom: 1.5px solid rgba(0, 0, 0, 0.08);
          padding-bottom: 8px;
        }

        .tab-btn {
          padding: 12px 24px;
          border: none;
          background: transparent;
          color: #6B7280;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          color: #0147AD;
          background: rgba(1, 71, 173, 0.04);
        }

        .tab-btn.active {
          color: #FFFFFF;
          background: linear-gradient(135deg, #0147AD 0%, #4A84F0 100%);
          box-shadow: 0 6px 20px rgba(1, 71, 173, 0.25);
        }

        .controls-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(1, 71, 173, 0.08);
          border-radius: 20px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          box-shadow: 0 4px 20px rgba(1, 71, 173, 0.03);
        }

        .search-input {
          flex: 1;
          min-width: 250px;
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background-color: #FFFFFF;
          color: #111827;
          outline: none;
          font-size: 0.92rem;
          transition: all 0.25s ease;
        }

        .search-input:focus {
          border-color: #0147AD;
          box-shadow: 0 0 0 3px rgba(1, 71, 173, 0.15);
        }

        .filter-select {
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background-color: #FFFFFF;
          color: #111827;
          outline: none;
          font-size: 0.92rem;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .filter-select:focus {
          border-color: #0147AD;
          box-shadow: 0 0 0 3px rgba(1, 71, 173, 0.15);
        }

        .table-container {
          background: #FFFFFF;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(1, 71, 173, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(1, 71, 173, 0.04);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background-color: rgba(1, 71, 173, 0.02);
          padding: 18px 24px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          color: #6B7280;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 1.5px solid rgba(0, 0, 0, 0.06);
        }

        td {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          font-size: 0.92rem;
          vertical-align: middle;
          color: #374151;
          transition: background-color 0.2s ease;
        }

        tr:hover td {
          background-color: rgba(1, 71, 173, 0.012);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .faculty-profile {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .faculty-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          background: linear-gradient(135deg, #0147AD, #4A84F0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          color: white;
          border: 1.5px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 8px rgba(1, 71, 173, 0.15);
        }

        .faculty-info h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
        }

        .faculty-info p {
          margin: 4px 0 0 0;
          color: #6B7280;
          font-size: 0.82rem;
        }

        .dept-tag {
          background-color: rgba(1, 71, 173, 0.05);
          border: 1px solid rgba(1, 71, 173, 0.15);
          color: #0147AD;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .role-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .role-admin {
          background-color: rgba(239, 68, 68, 0.08);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .role-hod {
          background-color: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .role-faculty {
          background-color: rgba(1, 71, 173, 0.08);
          color: #0147AD;
          border: 1px solid rgba(1, 71, 173, 0.15);
        }

        .action-cell {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
        }

        .btn-promote {
          background-color: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.18);
        }

        .btn-promote:hover {
          background-color: #10B981;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          transform: translateY(-1px);
        }

        .btn-demote {
          background-color: rgba(239, 68, 68, 0.08);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.18);
        }

        .btn-demote:hover {
          background-color: #EF4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
          transform: translateY(-1px);
        }

        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(1, 71, 173, 0.02);
        }

        .pagination-info {
          font-size: 0.88rem;
          color: #6B7280;
          font-weight: 500;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-pagination {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(0, 0, 0, 0.10);
          background-color: #FFFFFF;
          color: #374151;
        }

        .btn-pagination:hover:not(:disabled) {
          border-color: #0147AD;
          color: #0147AD;
          background-color: rgba(1, 71, 173, 0.05);
          transform: translateY(-1px);
        }

        .btn-pagination:disabled {
          background-color: #F3F4F6;
          color: #9CA3AF;
          cursor: not-allowed;
          border-color: rgba(0, 0, 0, 0.05);
        }

        .page-indicator {
          font-size: 0.88rem;
          font-weight: 600;
          color: #111827;
          min-width: 32px;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'USERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('USERS')}
        >
          Faculty Accounts
        </button>
        <button
          className={`tab-btn ${activeTab === 'DEADLINES' ? 'active' : ''}`}
          onClick={() => setActiveTab('DEADLINES')}
        >
          Created Deadlines
        </button>
        <button
          className={`tab-btn ${activeTab === 'REMINDERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REMINDERS')}
        >
          Created Reminders
        </button>
        <button
          className={`tab-btn ${activeTab === 'DEPARTMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('DEPARTMENTS')}
        >
          Manage Departments
        </button>
      </div>

      {activeTab === 'USERS' && (
        <>
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
                        <select
                          className="filter-select"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', border: '1px solid rgba(0, 0, 0, 0.12)', backgroundColor: '#FFFFFF', color: '#111827', borderRadius: '8px' }}
                          value={user.department?.id || ''}
                          onChange={(e) => assignDepartment(user.id, e.target.value)}
                        >
                          <option value="" disabled style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id} style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
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
                            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: '600' }}>
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
            {!loading && users.length > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing page {usersPage} of {usersTotalPages} ({usersTotal} total accounts)
                </div>
                <div className="pagination-controls">
                  <button
                    className="btn-pagination"
                    disabled={usersPage <= 1}
                    onClick={() => handleUsersPageChange(usersPage - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-indicator">{usersPage}</span>
                  <button
                    className="btn-pagination"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => handleUsersPageChange(usersPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'DEADLINES' && (
        <div className="table-container">
          {activityLoading && deadlines.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Fetching platform deadline records...
            </div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Deadline Title</th>
                    <th>Description</th>
                    <th>Dept</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className="faculty-info">
                          <h4 style={{ margin: 0 }}>{d.owner?.fullName || 'System/Email Sync'}</h4>
                          <p style={{ margin: '2px 0 0 0', color: '#6B7280', fontSize: '0.8rem' }}>{d.owner?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td style={{ fontWeight: '600', color: '#0147AD' }}>{d.title}</td>
                      <td style={{ color: '#4B5563', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.description}>{d.description}</td>
                      <td>
                        <span className="dept-tag">{d.department?.code || 'GEN'}</span>
                      </td>
                      <td>
                        <span className={`role-badge ${d.priority === 'HIGH' ? 'role-admin' : d.priority === 'MEDIUM' ? 'role-faculty' : 'role-hod'}`}>
                          {d.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(d.dueDate).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <span className={`role-badge ${d.isCompleted ? 'role-hod' : 'role-admin'}`}>
                          {d.isCompleted ? 'COMPLETED' : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {deadlines.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        No user deadlines found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!activityLoading && deadlines.length > 0 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing page {deadlinesPage} of {deadlinesTotalPages} ({deadlinesTotal} total deadlines)
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      disabled={deadlinesPage <= 1}
                      onClick={() => handleDeadlinesPageChange(deadlinesPage - 1)}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">{deadlinesPage}</span>
                    <button
                      className="btn-pagination"
                      disabled={deadlinesPage >= deadlinesTotalPages}
                      onClick={() => handleDeadlinesPageChange(deadlinesPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'REMINDERS' && (
        <div className="table-container">
          {activityLoading && reminders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Fetching platform reminder records...
            </div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reminder Title</th>
                    <th>Description</th>
                    <th>Reminder Time</th>
                    <th>Repeat Type</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="faculty-info">
                          <h4 style={{ margin: 0 }}>{r.user?.fullName}</h4>
                          <p style={{ margin: '2px 0 0 0', color: '#6B7280', fontSize: '0.8rem' }}>{r.user?.email}</p>
                        </div>
                      </td>
                      <td style={{ fontWeight: '600', color: '#0147AD' }}>{r.title}</td>
                      <td style={{ color: '#4B5563', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description || ''}>{r.description || 'N/A'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(r.reminderTime).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <span className="dept-tag">{r.repeatType}</span>
                      </td>
                      <td>
                        <span className={`role-badge ${r.status === 'COMPLETED' || r.status === 'SENT' ? 'role-hod' : r.status === 'DISMISSED' ? 'role-faculty' : 'role-admin'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {reminders.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        No user reminders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!activityLoading && reminders.length > 0 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing page {remindersPage} of {remindersTotalPages} ({remindersTotal} total reminders)
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      disabled={remindersPage <= 1}
                      onClick={() => handleRemindersPageChange(remindersPage - 1)}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">{remindersPage}</span>
                    <button
                      className="btn-pagination"
                      disabled={remindersPage >= remindersTotalPages}
                      onClick={() => handleRemindersPageChange(remindersPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'DEPARTMENTS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', animation: 'fadeIn 0.3s' }}>
          {/* Departments List */}
          <div className="table-container">
            <table style={{ minHeight: '100px' }}>
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Code</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                   <tr key={dept.id}>
                     <td style={{ fontWeight: '600', color: '#0147AD' }}>{dept.name}</td>
                     <td>
                       <span className="dept-tag">{dept.code}</span>
                     </td>
                     <td style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'monospace' }}>
                       {dept.id}
                     </td>
                   </tr>
                 ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                      No departments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Add Department Form */}
          <div className="controls-card" style={{ flexDirection: 'column', alignItems: 'stretch', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', color: '#111827', fontWeight: 700 }}>
              Add Department
            </h3>
            <form onSubmit={addDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Name</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ minWidth: 'auto' }}
                  placeholder="e.g. Computer Science"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Code</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ minWidth: 'auto' }}
                  placeholder="e.g. CS"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-pagination"
                style={{
                  backgroundColor: '#0147AD',
                  color: 'white',
                  borderColor: '#0147AD',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginTop: '10px'
                }}
                disabled={deptLoading}
              >
                {deptLoading ? 'Creating...' : 'Create Department'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
