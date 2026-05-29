'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="home-container">
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          background-color: #0f172a;
          font-family: 'Outfit', sans-serif;
          color: #f8fafc;
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
          background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.1), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.08), transparent 45%);
        }

        .card {
          background: rgba(30, 41, 59, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 24px;
          padding: 48px;
          max-width: 650px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
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
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.4rem;
          color: white;
          box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.4);
        }

        h1 {
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #f8fafc, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 1.1rem;
          margin-top: 10px;
          margin-bottom: 30px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 32px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.8s infinite;
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
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          background-color: transparent;
          border: 1px solid #334155;
          color: #cbd5e1;
        }

        .btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.03);
          border-color: #475569;
          color: #f8fafc;
        }

        .routes-section {
          text-align: left;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 30px;
        }

        .routes-section h3 {
          font-size: 1rem;
          color: #f8fafc;
          margin-bottom: 16px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .route-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 0.9rem;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.03);
        }

        .route-item:last-child {
          border-bottom: none;
        }

        .route-path {
          font-family: monospace;
          color: #60a5fa;
        }

        .route-desc {
          color: #94a3b8;
        }

        footer {
          margin-top: 40px;
          font-size: 0.8rem;
          color: #475569;
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
