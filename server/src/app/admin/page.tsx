'use client';

import React, { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Login Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch users when token/authentication changes
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUsers();
    }
  }, [isAuthenticated, token]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showMsg('Please fill in all fields', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMsg(data.error || 'Login failed. Please verify credentials.', 'error');
        return;
      }

      const { accessToken, user } = data.data;

      if (user.role !== 'ADMIN') {
        showMsg('Access denied. Administrator privileges required.', 'error');
        return;
      }

      localStorage.setItem('admin_token', accessToken);
      setToken(accessToken);
      setIsAuthenticated(true);
      showMsg('Welcome back, Admin!', 'success');
    } catch (err: any) {
      showMsg(err.message || 'Connection error', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsAuthenticated(false);
    setUsers([]);
    showMsg('Logged out successfully', 'success');
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
          handleLogout();
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

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

          body {
            margin: 0;
            background-color: #f3f8fc;
            font-family: 'Outfit', sans-serif;
            color: #1e293b;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #ffffff 100%);
          }

          .login-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 24px;
            padding: 40px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 20px 40px -15px rgba(37, 99, 235, 0.1);
            text-align: center;
            animation: fadeIn 0.5s ease-out;
          }

          .logo {
            width: 54px;
            height: 54px;
            border-radius: 12px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 auto 20px auto;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
          }

          h2 {
            margin: 0 0 8px 0;
            font-size: 1.6rem;
            font-weight: 700;
            color: #1e3a8a;
          }

          p.tagline {
            color: #64748b;
            font-size: 0.9rem;
            margin: 0 0 32px 0;
          }

          .form-group {
            text-align: left;
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .form-group input {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1.5px solid #dbeafe;
            background-color: white;
            color: #0f172a;
            font-size: 0.95rem;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s ease;
          }

          .form-group input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          }

          .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
            transition: all 0.2s ease;
            margin-top: 10px;
          }

          .btn-login:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
          }

          .toast {
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 500;
            font-size: 0.9rem;
            text-align: left;
            animation: slideIn 0.3s ease;
          }

          .toast-error {
            background-color: #fef2f2;
            color: #ef4444;
            border: 1px solid #fee2e2;
          }

          .toast-success {
            background-color: #f0fdf4;
            color: #22c55e;
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

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Administrator Email</label>
              <input
                type="email"
                placeholder="admin@christuniversity.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-login" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Authenticating Admin...' : 'Secure Log In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          background-color: #f8fafc;
          font-family: 'Outfit', sans-serif;
          color: #334155;
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          padding: 24px 32px;
          border-radius: 20px;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.15);
          color: white;
        }

        .logo-section h1 {
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
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 15px rgba(148, 163, 184, 0.05);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: #bfdbfe;
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.08);
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
          background: #eff6ff;
          color: #2563eb;
        }

        .indigo-icon {
          background: #eef2ff;
          color: #4f46e5;
        }

        .cyan-icon {
          background: #ecfeff;
          color: #0891b2;
        }

        .stat-details h3 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1e3a8a;
        }

        .stat-details p {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .msg-toast {
          padding: 12px 20px;
          border-radius: 10px;
          margin-bottom: 25px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .msg-success {
          background-color: #f0fdf4;
          color: #15803d;
          border: 1px solid #dcfce7;
        }

        .msg-error {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fee2e2;
        }

        /* Search & Filters Controls */
        .controls-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          box-shadow: 0 4px 15px rgba(148, 163, 184, 0.05);
        }

        .search-input {
          flex: 1;
          min-width: 250px;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          outline: none;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #3b82f6;
        }

        .filter-select {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          outline: none;
          font-size: 0.9rem;
          background-color: white;
          color: #334155;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .filter-select:focus {
          border-color: #3b82f6;
        }

        .table-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(148, 163, 184, 0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background-color: #f8fafc;
          padding: 16px 24px;
          font-weight: 600;
          color: #475569;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #e2e8f0;
        }

        td {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
          vertical-align: middle;
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
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.95rem;
          color: white;
        }

        .faculty-info h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
        }

        .faculty-info p {
          margin: 2px 0 0 0;
          color: #64748b;
          font-size: 0.8rem;
        }

        .dept-tag {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
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
          color: #ef4444;
          border: 1px solid #fecaca;
        }

        .role-hod {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .role-faculty {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .action-cell {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-promote {
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .btn-promote:hover {
          background-color: #166534;
          color: white;
        }

        .btn-demote {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .btn-demote:hover {
          background-color: #991b1b;
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
          <div className="stat-icon blue-icon">👥</div>
          <div className="stat-details">
            <h3>{loading ? '...' : totalUsers}</h3>
            <p>Total Accounts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo-icon">👑</div>
          <div className="stat-details">
            <h3>{loading ? '...' : hodCount}</h3>
            <p>Active HODs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan-icon">📚</div>
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
