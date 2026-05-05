import { createTheme, ThemeOptions } from '@mui/material/styles';

const colors = {
  skyBlue: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  lilac: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  purple: {
    50: '#faf5ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  burgundy: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#a4133c',
    600: '#800f2f',
    700: '#6b0d28',
    800: '#590b21',
    900: '#420818',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colors.skyBlue[600],
      light: colors.skyBlue[400],
      dark: colors.skyBlue[800],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.lilac[500],
      light: colors.lilac[300],
      dark: colors.lilac[700],
      contrastText: '#ffffff',
    },
    success: {
      main: colors.success[600],
      light: colors.success[400],
      dark: colors.success[800],
    },
    warning: {
      main: colors.warning[500],
      light: colors.warning[400],
      dark: colors.warning[700],
    },
    error: {
      main: colors.error[500],
      light: colors.error[400],
      dark: colors.error[700],
    },
    background: {
      default: colors.gray[50],
      paper: '#ffffff',
    },
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
    },
    divider: colors.gray[200],
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", "Segoe UI", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', lineHeight: 1.5, color: colors.gray[500] },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.03)',
    '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.03)',
    '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)',
    '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03)',
    '0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.03)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 18px',
          transition: 'all 0.15s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px -2px rgba(2, 132, 199, 0.3)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: colors.gray[300],
          '&:hover': {
            borderColor: colors.skyBlue[400],
            backgroundColor: colors.skyBlue[50],
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.gray[200]}`,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px -2px rgba(0,0,0,0.08)',
            borderColor: colors.gray[300],
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.skyBlue[400],
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 44,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: '1px 0 3px 0 rgba(0,0,0,0.04)',
        },
      },
    },
  },
};

const darkThemeOptions: ThemeOptions = {
  ...lightThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: colors.skyBlue[400],
      light: colors.skyBlue[300],
      dark: colors.skyBlue[600],
      contrastText: colors.gray[900],
    },
    secondary: {
      main: colors.lilac[400],
      light: colors.lilac[300],
      dark: colors.lilac[600],
      contrastText: colors.gray[900],
    },
    success: {
      main: colors.success[400],
      light: colors.success[300],
      dark: colors.success[600],
    },
    warning: {
      main: colors.warning[400],
      light: colors.warning[300],
      dark: colors.warning[600],
    },
    error: {
      main: colors.error[400],
      light: colors.error[300],
      dark: colors.error[600],
    },
    background: {
      default: colors.gray[900],
      paper: colors.gray[800],
    },
    text: {
      primary: colors.gray[100],
      secondary: colors.gray[400],
    },
    divider: colors.gray[700],
  },
  components: {
    ...lightThemeOptions.components,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: colors.gray[800],
          border: `1px solid ${colors.gray[700]}`,
          '&:hover': {
            borderColor: colors.gray[600],
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          backgroundColor: colors.gray[900],
        },
      },
    },
  },
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof lightTheme;
}

export { colors };
