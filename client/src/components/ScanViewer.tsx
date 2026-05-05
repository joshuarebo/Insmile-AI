import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
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

type SeverityFilter = 'all' | 'severe' | 'moderate' | 'mild';

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
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const containerRef = useRef<HTMLDivElement>(null);
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

  const filtered = useMemo(() => {
    return findings
      .map((f, i) => ({ ...f, _i: i }))
      .filter((f) => (filter === 'all' ? true : f.severity === filter));
  }, [findings, filter]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label="Severe" sx={{ bgcolor: SEVERITY_COLOR.severe, color: 'white' }} />
          <Chip size="small" label="Moderate" sx={{ bgcolor: SEVERITY_COLOR.moderate, color: 'white' }} />
          <Chip size="small" label="Mild" sx={{ bgcolor: SEVERITY_COLOR.mild, color: 'white' }} />
        </Stack>
        <ToggleButtonGroup
          size="small"
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="severe">Severe</ToggleButton>
          <ToggleButton value="moderate">Moderate</ToggleButton>
          <ToggleButton value="mild">Mild</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        ref={containerRef}
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
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
            {imageDims &&
              filtered.map((f, idx) => {
                const bbox = f.bbox_norm;
                if (!bbox) return null;
                const [x, y, w, h] = bbox;
                const color = SEVERITY_COLOR[f.severity] || '#6b7280';
                const isSelected = selectedIndex === f._i;
                const labelOffset = -22 - (idx % 3) * 18;
                return (
                  <Box
                    key={f._i}
                    onClick={() => onSelectFinding && onSelectFinding(isSelected ? null : f._i)}
                    sx={{
                      position: 'absolute',
                      left: `${x * 100}%`,
                      top: `${y * 100}%`,
                      width: `${w * 100}%`,
                      height: `${h * 100}%`,
                      border: `2px solid ${color}`,
                      borderRadius: 1,
                      boxShadow: isSelected ? `0 0 0 3px ${color}55` : 'none',
                      transition: 'box-shadow 120ms, opacity 120ms',
                      cursor: onSelectFinding ? 'pointer' : 'default',
                      backgroundColor: isSelected ? `${color}22` : 'transparent',
                      opacity: selectedIndex !== null && !isSelected ? 0.4 : 1,
                      zIndex: isSelected ? 10 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: `${labelOffset}px`,
                        left: 0,
                        bgcolor: color,
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 600,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '4px 4px 4px 0',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        opacity: isSelected || selectedIndex === null ? 1 : 0.5,
                        pointerEvents: 'none',
                      }}
                    >
                      {f.tooth ? `#${f.tooth} ` : ''}
                      {f.label}
                    </Box>
                  </Box>
                );
              })}
          </Box>
        )}
      </Box>
      {imageDims && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {imageDims.w}×{imageDims.h} px · {findings.length} finding{findings.length === 1 ? '' : 's'} detected
        </Typography>
      )}
    </Box>
  );
};

export default ScanViewer;
