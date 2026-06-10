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
          background:
            radial-gradient(
              circle at top right,
              rgba(1, 71, 173, 0.06),
              transparent
            ),
            radial-gradient(
              circle at bottom left,
              rgba(74, 132, 240, 0.06),
              transparent
            ),
            #dcdcdc;
          font-family: 'Inter', sans-serif;
          color: #111827;
          overflow-x: hidden;
          min-height: 100vh;
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
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(1, 71, 173, 0.08);
          border-radius: 24px;
          padding: 48px;
          max-width: 650px;
          width: 100%;
          text-align: center;
          box-shadow:
            0 20px 50px rgba(1, 71, 173, 0.05),
            0 0 30px rgba(1, 71, 173, 0.02);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .logo-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .logo-symbol {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0147ad 0%, #4a84f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.6rem;
          color: white;
          box-shadow: 0 6px 20px rgba(1, 71, 173, 0.25);
        }

        h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #0147ad 0%, #4a84f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #4b5563;
          font-size: 1.1rem;
          margin-top: 12px;
          margin-bottom: 32px;
          font-weight: 500;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #059669;
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 36px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.8s infinite;
          box-shadow: 0 0 8px #10b981;
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
          background: linear-gradient(135deg, #0147ad 0%, #4a84f0 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 15px rgba(1, 71, 173, 0.2);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(1, 71, 173, 0.3);
          filter: brightness(1.05);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          background-color: transparent;
          border: 1.5px solid rgba(1, 71, 173, 0.2);
          color: #0147ad;
        }

        .btn-secondary:hover {
          background-color: rgba(1, 71, 173, 0.05);
          border-color: #0147ad;
        }

        .routes-section {
          text-align: left;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          padding-top: 30px;
        }

        .routes-section h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          color: #0147ad;
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
          border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
        }

        .route-item:last-child {
          border-bottom: none;
        }

        .route-path {
          font-family: monospace;
          color: #0147ad;
          font-weight: 600;
        }

        .route-desc {
          color: #4b5563;
        }

        footer {
          margin-top: 40px;
          font-size: 0.8rem;
          color: #6b7280;
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
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>

      <div className="card">
        <div className="logo-area">
          <div className="logo-symbol">C</div>
          <h1>CHRIST Faculty App</h1>
        </div>
        <div className="subtitle">
          Core REST API Server & Management Console
        </div>

        <div className="status-badge">
          <span className="status-dot"></span>
          API Service Operational
        </div>

        <div className="actions">
          <Link href="/admin" className="btn btn-primary">
            Launch Admin Control Center
          </Link>
          <a
            href="/api/users"
            className="btn btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
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
        &copy; {new Date().getFullYear()} CHRIST University. All rights
        reserved.
      </footer>
    </div>
  );
}
