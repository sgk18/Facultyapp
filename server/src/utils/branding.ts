/**
 * CHRIST University Faculty App - Official Brand System Constants
 */

export const APP_NAME = 'CHRIST Faculty';
export const PRIMARY_COLOR = '#0147AD';
export const SECONDARY_COLOR = '#DCDCDC';

export const DESIGN_TOKENS = {
  appName: APP_NAME,
  colors: {
    primary: PRIMARY_COLOR,
    secondary: SECONDARY_COLOR,
    surface: '#FFFFFF',
    darkText: '#111827',
    secondaryText: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #0147AD 0%, #1D5FD1 50%, #4A84F0 100%)',
  },
  notifications: {
    INFO: PRIMARY_COLOR,
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
  },
  typography: {
    heading: 'Outfit, sans-serif',
    body: 'Inter, sans-serif',
  },
  components: {
    cards: {
      borderRadius: '16px',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    },
    buttons: {
      borderRadius: '12px',
    },
  },
};
