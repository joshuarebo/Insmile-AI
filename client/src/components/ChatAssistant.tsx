import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { sendChatMessage, ChatMessage } from '../services/ai';

interface Props {
  patientId: string;
}

const starters = [
  'What should a patient with moderate cavities in Kenya expect to pay at a county hospital?',
  'Explain SHA coverage for a dental extraction.',
  'What are the signs of early gum disease?',
  'Outline post-op care after a composite filling in simple English and Kiswahili.',
];

const ChatAssistant: React.FC<Props> = ({ patientId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content:
        'Habari! I am Insmile, your Kenya-focused dental assistant. Ask me about findings, treatments, SHA coverage, or patient education.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const user: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, user]);
    setInput('');
    setLoading(true);
    try {
      const { message } = await sendChatMessage(text.trim(), patientId, messages);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: message || 'I did not catch that, please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'I am having trouble reaching the AI right now. Please check your connection and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: 620, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <SmartToyOutlinedIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Insmile — dental assistant
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tailored for Kenyan clinics · SHA-aware · KES pricing
            </Typography>
          </Box>
        </Stack>

        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            bgcolor: 'grey.50',
            borderRadius: 2,
            p: 2,
            mb: 2,
          }}
        >
          <Stack spacing={1.5}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <Stack key={m.id || i} direction="row" spacing={1.25} justifyContent={isUser ? 'flex-end' : 'flex-start'}>
                  {!isUser && (
                    <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                      <SmartToyOutlinedIcon fontSize="small" />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '78%',
                      bgcolor: isUser ? 'primary.main' : 'white',
                      color: isUser ? 'white' : 'text.primary',
                      borderRadius: 2,
                      px: 1.75,
                      py: 1.25,
                      border: isUser ? 'none' : '1px solid',
                      borderColor: 'divider',
                      '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                      '& ul, & ol': { pl: 2.5, m: 0, mb: 1 },
                      '& li': { mb: 0.25 },
                      '& h1, & h2, & h3, & h4': {
                        mt: 1,
                        mb: 0.5,
                        fontSize: '0.95rem',
                        fontWeight: 700,
                      },
                      '& code': {
                        bgcolor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                        px: 0.5,
                        py: 0.1,
                        borderRadius: 0.5,
                        fontSize: '0.85em',
                      },
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        my: 1,
                        fontSize: '0.85rem',
                      },
                      '& th, & td': {
                        border: '1px solid',
                        borderColor: isUser ? 'rgba(255,255,255,0.3)' : 'divider',
                        px: 0.75,
                        py: 0.5,
                        textAlign: 'left',
                      },
                      '& th': { bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'action.hover' },
                      '& a': { color: isUser ? 'white' : 'primary.main', textDecoration: 'underline' },
                      '& strong': { fontWeight: 700 },
                      '& hr': { my: 1, border: 0, borderTop: '1px solid', borderColor: 'divider' },
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {isUser ? (
                      <Typography variant="body2">{m.content}</Typography>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    )}
                  </Box>
                  {isUser && (
                    <Avatar sx={{ bgcolor: 'grey.400', width: 28, height: 28 }}>
                      <PersonOutlineIcon fontSize="small" />
                    </Avatar>
                  )}
                </Stack>
              );
            })}
            {loading && (
              <Stack direction="row" spacing={1.25}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                  <SmartToyOutlinedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ bgcolor: 'white', borderRadius: 2, px: 1.75, py: 1.25, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    thinking…
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>
        </Box>

        {messages.length <= 1 && (
          <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mb: 1.5 }}>
            {starters.map((s) => (
              <Box
                key={s}
                onClick={() => send(s)}
                sx={{
                  px: 1.25,
                  py: 0.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="caption">{s}</Typography>
              </Box>
            ))}
          </Stack>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about findings, procedures, SHA cover, Kiswahili patient instructions…"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" color="primary" disabled={loading || !input.trim()}>
                  <SendIcon />
                </IconButton>
              ),
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChatAssistant;
