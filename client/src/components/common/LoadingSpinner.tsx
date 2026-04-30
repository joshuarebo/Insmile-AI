import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
`;

const StyledContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  padding: theme.spacing(4),
}));

const AnimatedBox = styled(Box)({
  animation: `${float} 3s ease-in-out infinite`,
});

const PulsingText = styled(Typography)({
  animation: `${pulse} 2s ease-in-out infinite`,
});

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
  variant = 'default',
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 60;
      default:
        return 40;
    }
  };

  const containerProps = fullScreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
        minHeight: '100vh',
      }
    : {};

  if (variant === 'minimal') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={getSize()} />
      </Box>
    );
  }

  if (variant === 'detailed') {
    return (
      <Fade in timeout={300}>
        <StyledContainer sx={containerProps}>
          <AnimatedBox>
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <CircularProgress
                size={getSize()}
                thickness={4}
                sx={{
                  color: 'primary.main',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Box
                  sx={{
                    width: getSize() * 0.3,
                    height: getSize() * 0.3,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    animation: `${pulse} 1.5s ease-in-out infinite`,
                  }}
                />
              </Box>
            </Box>
          </AnimatedBox>
          
          <PulsingText
            variant={size === 'large' ? 'h6' : 'body1'}
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </PulsingText>
          
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              mt: 2,
            }}
          >
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  animation: `${pulse} 1.4s ease-in-out infinite`,
                  animationDelay: `${index * 0.2}s`,
                }}
              />
            ))}
          </Box>
        </StyledContainer>
      </Fade>
    );
  }

  return (
    <Fade in timeout={300}>
      <StyledContainer sx={containerProps}>
        <AnimatedBox>
          <CircularProgress size={getSize()} />
        </AnimatedBox>
        <PulsingText
          variant={size === 'large' ? 'h6' : 'body2'}
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          {message}
        </PulsingText>
      </StyledContainer>
    </Fade>
  );
};

export default LoadingSpinner;
