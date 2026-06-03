'use client';

import React, { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#DCDCDC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#0147AD',
      fontWeight: 600,
      fontSize: '1.1rem'
    }}>
      <div>Redirecting to the CHRIST Faculty mobile app...</div>
    </div>
  );
}
