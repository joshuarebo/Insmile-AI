import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function SlideTransition(props: TransitionProps & { children: React.ReactElement }) {
  return <Slide {...props} direction="down" />;
}

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = generateId();
    const newNotification: Notification = {
      id,
      duration: 6000,
      ...notification,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the latest notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-hide non-persistent notifications
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, newNotification.duration);
    }
  }, [maxNotifications]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showNotification({ type: 'success', message, title });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string) => {
    showNotification({ type: 'error', message, title, persistent: true });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    showNotification({ type: 'warning', message, title });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    showNotification({ type: 'info', message, title });
  }, [showNotification]);

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render notifications */}
      <Box
        sx={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400,
        }}
      >
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            TransitionComponent={SlideTransition}
            sx={{
              position: 'relative',
              transform: 'none !important',
              left: 'auto !important',
              right: 'auto !important',
              top: 'auto !important',
              bottom: 'auto !important',
            }}
          >
            <Alert
              severity={notification.type}
              variant="filled"
              sx={{
                width: '100%',
                borderRadius: 2,
                boxShadow: 3,
              }}
              action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {notification.action && (
                    <Typography
                      variant="button"
                      sx={{
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        color: 'inherit',
                        fontSize: '0.75rem',
                      }}
                      onClick={notification.action.onClick}
                    >
                      {notification.action.label}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    aria-label="close"
                    color="inherit"
                    onClick={() => hideNotification(notification.id)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              {notification.title && (
                <AlertTitle sx={{ mb: notification.message ? 1 : 0 }}>
                  {notification.title}
                </AlertTitle>
              )}
              {notification.message && (
                <Typography variant="body2">
                  {notification.message}
                </Typography>
              )}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Hook for easy error handling
export const useErrorHandler = () => {
  const { showError } = useNotification();

  return useCallback((error: unknown, title?: string) => {
    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    showError(message, title || 'Error');
  }, [showError]);
};
