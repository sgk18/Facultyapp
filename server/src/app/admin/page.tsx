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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isMockMode, setIsMockMode] = useState(true);

  // Fallback Mock data for visual wow and easy testing
  const mockUsers: User[] = [
    {
      id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
      fullName: 'Dr. Joseph Varghese',
      email: 'joseph.varghese@christuniversity.in',
      role: 'HOD',
      department: { id: 'd1', name: 'Computer Science Department', code: 'CS' },
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      createdAt: '2026-05-15T09:00:00Z',
    },
    {
      id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
      fullName: 'Prof. Mary D\'Souza',
      email: 'mary.dsouza@christuniversity.in',
      role: 'FACULTY',
      department: { id: 'd1', name: 'Computer Science Department', code: 'CS' },
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      createdAt: '2026-05-18T10:30:00Z',
    },
    {
      id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
      fullName: 'Dr. Anil K. Sharma',
      email: 'anil.sharma@christuniversity.in',
      role: 'FACULTY',
      department: { id: 'd2', name: 'Mathematics Department', code: 'MATH' },
      createdAt: '2026-05-20T11:15:00Z',
    },
    {
      id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
      fullName: 'Prof. John Peterson',
      email: 'john.peterson@christuniversity.in',
      role: 'ADMIN',
      department: { id: 'd1', name: 'Computer Science Department', code: 'CS' },
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      createdAt: '2026-05-10T08:00:00Z',
    },
  ];

  // Load initial data
  useEffect(() => {
    if (isMockMode) {
      setUsers(mockUsers);
    } else {
      fetchUsers();
    }
  }, [isMockMode]);

  // Fetch users from server using bearer token
  const fetchUsers = async () => {
    if (!token) {
      showMsg('Please provide a Bearer Token first', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload.success) {
        setUsers(payload.data);
        showMsg('Users loaded successfully', 'success');
      } else {
        showMsg(payload.error || 'Failed to fetch users', 'error');
      }
    } catch (err: any) {
      showMsg(err.message || 'API fetch error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Promote Faculty to HOD
  const promoteUser = async (userId: string) => {
    if (isMockMode) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: 'HOD' } : u))
      );
      showMsg('Mock Promotion Successful!', 'success');
      return;
    }

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
  };

  // Demote HOD to Faculty
  const demoteUser = async (userId: string) => {
    if (isMockMode) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: 'FACULTY' } : u))
      );
      showMsg('Mock Demotion Successful!', 'success');
      return;
    }

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
  };

  // Calculate statistics
  const totalUsers = users.length;
  const hodCount = users.filter(u => u.role === 'HOD').length;
  const facultyCount = users.filter(u => u.role === 'FACULTY').length;

  return (
    <div className="admin-container">
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          background-color: #0f172a;
          font-family: 'Outfit', sans-serif;
          color: #f8fafc;
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 20px;
        }

        .logo-section h1 {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #60a5fa, #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-section p {
          color: #94a3b8;
          font-size: 0.9rem;
          margin: 4px 0 0 0;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .mode-toggle {
          background-color: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .mode-toggle:hover {
          background-color: #334155;
          border-color: #475569;
        }

        .mode-toggle.active {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          border-color: #3b82f6;
        }

        .token-input {
          background-color: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          outline: none;
          font-size: 0.85rem;
          width: 250px;
          transition: border-color 0.2s;
        }

        .token-input:focus {
          border-color: #3b82f6;
        }

        .btn-sync {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          font-size: 0.85rem;
          transition: transform 0.2s, background-color 0.2s;
        }

        .btn-sync:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
        }

        .btn-sync:active {
          transform: translateY(0);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(96, 165, 250, 0.2);
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
          background: rgba(37, 99, 235, 0.15);
          color: #60a5fa;
        }

        .indigo-icon {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }

        .cyan-icon {
          background: rgba(6, 182, 212, 0.15);
          color: #22d3ee;
        }

        .stat-details h3 {
          margin: 0;
          font-size: 2.2rem;
          font-weight: 700;
        }

        .stat-details p {
          margin: 4px 0 0 0;
          color: #94a3b8;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .msg-toast {
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .msg-success {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .msg-error {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .table-container {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background-color: rgba(15, 23, 42, 0.6);
          padding: 16px 24px;
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #1e293b;
        }

        td {
          padding: 20px 24px;
          border-bottom: 1px solid #1e293b;
          font-size: 0.95rem;
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .faculty-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .faculty-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.1rem;
          color: white;
        }

        .faculty-info h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .faculty-info p {
          margin: 2px 0 0 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .dept-tag {
          background-color: rgba(51, 65, 85, 0.5);
          border: 1px solid #475569;
          color: #cbd5e1;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .role-admin {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .role-hod {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .role-faculty {
          background-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
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
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .btn-promote:hover {
          background-color: #10b981;
          color: #0f172a;
        }

        .btn-demote {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-demote:hover {
          background-color: #ef4444;
          color: #0f172a;
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
          <p>Role Access & Department Control Center</p>
        </div>
        <div className="controls">
          <button
            className={`mode-toggle ${isMockMode ? 'active' : ''}`}
            onClick={() => setIsMockMode(prev => !prev)}
          >
            {isMockMode ? 'MOCK MODE ACTIVE' : 'SWITCH TO MOCK'}
          </button>
          {!isMockMode && (
            <>
              <input
                type="text"
                placeholder="Paste Bearer Token"
                className="token-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <button className="btn-sync" onClick={fetchUsers}>
                Sync API
              </button>
            </>
          )}
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
            <h3>{totalUsers}</h3>
            <p>Total Accounts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo-icon">👑</div>
          <div className="stat-details">
            <h3>{hodCount}</h3>
            <p>Active HODs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan-icon">📚</div>
          <div className="stat-details">
            <h3>{facultyCount}</h3>
            <p>Faculty Members</p>
          </div>
        </div>
      </div>

      {/* Faculty list Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Synchronizing data with API servers...
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
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="faculty-profile">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="faculty-avatar" />
                      ) : (
                        <div className="faculty-avatar">
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
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
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                          Root Lock
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                    No faculty members found. Set up a default token and sync to load.
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
