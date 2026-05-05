import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack, CircularProgress, Tooltip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Finding, API_BASE_URL } from '../services/ai';
import { getToken } from '../lib/tokenManager';

interface ScanViewerProps {
  scanId: string;
  findings?: Finding[];
  selectedIndex?: number | null;
  onSelectFinding?: (index: number | null) => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  severe: '#dc2626',
  moderate: '#ea580c',
  mild: '#16a34a',
};

async function fetchSignedUrl(scanId: string): Promise<string | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/scans/${scanId}/image`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || null;
}

export const ScanViewer: React.FC<ScanViewerProps> = ({
  scanId,
  findings = [],
  selectedIndex = null,
  onSelectFinding,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setImageDims(null);

    if (!scanId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchSignedUrl(scanId).then((url) => {
      if (cancelled) return;
      if (url) {
        setImageUrl(url);
      } else {
        setError('Unable to load scan image. The file may still be uploading or was removed.');
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setError('Unable to load scan image.');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [scanId]);

  const handleLoad = () => {
    const img = imgRef.current;
    if (img) setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
    setLoading(false);
  };

  const handleError = () => {
    setError('Unable to load scan image. The file may still be uploading or was removed.');
    setLoading(false);
  };

  const findingsWithIndex = useMemo(() => {
    return findings.map((f, i) => ({ ...f, _i: i }));
  }, [findings]);

  const activeIdx = hovered ?? selectedIndex;

  return (
    <Box>
      {/* Legend + controls */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap">
        <Chip size="small" label="Severe" sx={{ bgcolor: SEVERITY_COLOR.severe, color: 'white', height: 22, fontSize: 11 }} />
        <Chip size="small" label="Moderate" sx={{ bgcolor: SEVERITY_COLOR.moderate, color: 'white', height: 22, fontSize: 11 }} />
        <Chip size="small" label="Mild" sx={{ bgcolor: SEVERITY_COLOR.mild, color: 'white', height: 22, fontSize: 11 }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title={showMarkers ? 'Hide markers — view clean scan' : 'Show markers'} placement="top">
          <IconButton
            size="small"
            onClick={() => setShowMarkers(!showMarkers)}
            sx={{
              bgcolor: showMarkers ? 'action.selected' : 'transparent',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {showMarkers ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Image container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          bgcolor: '#0b1220',
          borderRadius: 2,
          overflow: 'hidden',
          minHeight: 320,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}
        {error && !imageUrl && (
          <Typography color="#f87171" sx={{ p: 3, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
        {imageUrl && (
          <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img
              ref={imgRef}
              src={imageUrl}
              onLoad={handleLoad}
              onError={handleError}
              alt="Dental scan"
              crossOrigin="anonymous"
              style={{
                maxWidth: '100%',
                maxHeight: 520,
                display: 'block',
                borderRadius: 6,
              }}
            />

            {/* Bounding boxes — only visible for active finding */}
            {showMarkers && imageDims && findingsWithIndex.map((f) => {
              const bbox = f.bbox_norm;
              if (!bbox) return null;
              const [x, y, w, h] = bbox;
              const color = SEVERITY_COLOR[f.severity] || '#6b7280';
              const isActive = activeIdx === f._i;
              if (!isActive) return null;
              return (
                <Box
                  key={`bbox-${f._i}`}
                  sx={{
                    position: 'absolute',
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${w * 100}%`,
                    height: `${h * 100}%`,
                    border: `2px solid ${color}`,
                    borderRadius: '4px',
                    backgroundColor: `${color}15`,
                    boxShadow: `0 0 0 2px ${color}40, 0 0 12px ${color}30`,
                    pointerEvents: 'none',
                    zIndex: 2,
                    animation: 'pulse-border 1.5s ease-in-out infinite',
                    '@keyframes pulse-border': {
                      '0%, 100%': { boxShadow: `0 0 0 2px ${color}40, 0 0 8px ${color}20` },
                      '50%': { boxShadow: `0 0 0 3px ${color}60, 0 0 16px ${color}40` },
                    },
                  }}
                />
              );
            })}

            {/* Numbered pin markers at center of each bbox */}
            {showMarkers && imageDims && findingsWithIndex.map((f) => {
              const bbox = f.bbox_norm;
              if (!bbox) return null;
              const [x, y, w, h] = bbox;
              const cx = (x + w / 2) * 100;
              const cy = (y + h / 2) * 100;
              const color = SEVERITY_COLOR[f.severity] || '#6b7280';
              const isActive = activeIdx === f._i;
              const label = `${f.tooth ? `#${f.tooth} ` : ''}${f.label} (${f.severity})`;

              return (
                <Tooltip
                  key={`pin-${f._i}`}
                  title={label}
                  placement="top"
                  arrow
                  disableInteractive
                >
                  <Box
                    onClick={() => onSelectFinding && onSelectFinding(isActive ? null : f._i)}
                    onMouseEnter={() => setHovered(f._i)}
                    onMouseLeave={() => setHovered(null)}
                    sx={{
                      position: 'absolute',
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isActive ? 28 : 22,
                      height: isActive ? 28 : 22,
                      borderRadius: '50%',
                      bgcolor: color,
                      border: '2px solid white',
                      boxShadow: isActive
                        ? `0 0 0 3px ${color}, 0 4px 12px rgba(0,0,0,0.4)`
                        : '0 2px 6px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: isActive ? 10 : 3,
                      transition: 'all 150ms ease',
                      '&:hover': {
                        transform: 'translate(-50%, -50%) scale(1.2)',
                        zIndex: 10,
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'white',
                        fontSize: isActive ? 12 : 10,
                        fontWeight: 700,
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                    >
                      {f._i + 1}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}

            {/* Findings without bbox — show as floating pins at edges */}
            {showMarkers && imageDims && findingsWithIndex.map((f, idx) => {
              if (f.bbox_norm) return null;
              const color = SEVERITY_COLOR[f.severity] || '#6b7280';
              const isActive = activeIdx === f._i;
              const yPos = 8 + idx * 6;
              const label = `${f.tooth ? `#${f.tooth} ` : ''}${f.label} (${f.severity}) — no location data`;

              return (
                <Tooltip key={`no-bbox-${f._i}`} title={label} placement="left" arrow>
                  <Box
                    onClick={() => onSelectFinding && onSelectFinding(isActive ? null : f._i)}
                    onMouseEnter={() => setHovered(f._i)}
                    onMouseLeave={() => setHovered(null)}
                    sx={{
                      position: 'absolute',
                      right: '8px',
                      top: `${yPos}%`,
                      width: isActive ? 26 : 20,
                      height: isActive ? 26 : 20,
                      borderRadius: '50%',
                      bgcolor: color,
                      border: '2px solid white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: 0.8,
                      zIndex: isActive ? 10 : 3,
                      transition: 'all 150ms ease',
                      '&:hover': { opacity: 1, transform: 'scale(1.2)' },
                    }}
                  >
                    <Typography sx={{ color: 'white', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>
                      {f._i + 1}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Footer info */}
      {imageDims && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {imageDims.w}×{imageDims.h}px · {findings.length} finding{findings.length === 1 ? '' : 's'}
          {findings.filter(f => f.bbox_norm).length < findings.length &&
            ` · ${findings.filter(f => !f.bbox_norm).length} without location data`}
        </Typography>
      )}
    </Box>
  );
};

export default ScanViewer;
