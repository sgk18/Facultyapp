'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      
      if (search.includes('code=')) {
        window.location.href = `facultyapp://auth/callback${search}`;
      } else if (hash.includes('access_token=')) {
        window.location.href = `facultyapp://auth/callback${hash}`;
      }
    }
  }, []);

  return (
    <div className="home-container">
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent),
                      radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.05), transparent),
                      #0B0F19;
          font-family: 'Inter', sans-serif;
          color: #F3F4F6;
          overflow-x: hidden;
        }

        .home-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
        }

        .card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 48px;
          max-width: 650px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3),
                      0 0 40px rgba(99, 102, 241, 0.05);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .logo-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .logo-symbol {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: white;
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
        }

        h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #818CF8 0%, #34D399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #9CA3AF;
          font-size: 1.1rem;
          margin-top: 12px;
          margin-bottom: 32px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34D399;
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 36px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #34D399;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.8s infinite;
          box-shadow: 0 0 8px #34D399;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 28px;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
          filter: brightness(1.1);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          background-color: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          color: #818CF8;
        }

        .btn-secondary:hover {
          background-color: rgba(99, 102, 241, 0.08);
          border-color: #818CF8;
          color: white;
        }

        .routes-section {
          text-align: left;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 30px;
        }

        .routes-section h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          color: #818CF8;
          margin-bottom: 16px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .route-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          font-size: 0.9rem;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
        }

        .route-item:last-child {
          border-bottom: none;
        }

        .route-path {
          font-family: monospace;
          color: #34D399;
          font-weight: 600;
        }

        .route-desc {
          color: #9CA3AF;
        }

        footer {
          margin-top: 40px;
          font-size: 0.8rem;
          color: #6B7280;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(52, 211, 153, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0);
          }
        }
      `}</style>

      <div className="card">
        <div className="logo-area">
          <div className="logo-symbol">C</div>
          <h1>CHRIST Faculty App</h1>
        </div>
        <div className="subtitle">Core REST API Server & Management Console</div>

        <div className="status-badge">
          <span className="status-dot"></span>
          API Service Operational
        </div>

        <div className="actions">
          <Link href="/admin" className="btn btn-primary">
            Launch Admin Control Center
          </Link>
          <a href="/api/users" className="btn btn-secondary" target="_blank" rel="noreferrer">
            Test API Connections
          </a>
        </div>

        <div className="routes-section">
          <h3>Active API Services</h3>
          <div className="route-item">
            <span className="route-path">POST /api/auth/login</span>
            <span className="route-desc">Secure Password Sign In</span>
          </div>
          <div className="route-item">
            <span className="route-path">GET /api/deadlines</span>
            <span className="route-desc">Faculty Deadline Feeds</span>
          </div>
          <div className="route-item">
            <span className="route-path">GET /api/notifications</span>
            <span className="route-desc">FCM Push Notification Hub</span>
          </div>
        </div>
      </div>

      <footer>
        &copy; {new Date().getFullYear()} CHRIST University. All rights reserved.
      </footer>
    </div>
  );
}
