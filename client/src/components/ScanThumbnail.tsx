import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../services/ai';
import { getToken } from '../lib/tokenManager';

interface Props {
  scanId: string;
  maxHeight?: number;
}

export const ScanThumbnail: React.FC<Props> = ({ scanId, maxHeight = 150 }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/scans/${scanId}/image`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          redirect: 'follow',
        });
        if (!res.ok) throw new Error('load failed');
        const blob = await res.blob();
        if (!cancelled) setUrl(URL.createObjectURL(blob));
      } catch {
        // silently fail — show nothing
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: maxHeight }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!url) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: maxHeight, color: 'text.secondary', fontSize: 12 }}>
        No preview
      </Box>
    );
  }

  return (
    <img
      src={url}
      alt="Dental scan"
      style={{ maxHeight, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
    />
  );
};
