import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ai } from '../services/ai';
import { 
  Box, Typography, TextField, Button, Card, CardContent, 
  Paper, Alert, CircularProgress, IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

interface ChatAssistantProps {
  patientId: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

// Mock responses for demo mode
const MOCK_RESPONSES = [
  'Based on your dental scan, I recommend scheduling a cleaning appointment.',
  'Your cavity on tooth #14 should be treated within the next 2-3 weeks.',
  'Gum disease is at an early stage and can be managed with proper oral hygiene.',
  'I suggest using a soft-bristled toothbrush and fluoride toothpaste.',
  'Regular flossing will help with your gum health significantly.',
  'You should see improvements within 2 weeks of following the recommended treatment plan.',
  'Would you like me to explain the filling procedure in more detail?',
  'I recommend scheduling a follow-up appointment in 3 months.'
];

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ patientId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your dental AI assistant. How can I help you today?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [useLocalMock, setUseLocalMock] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);

  // Check API availability when component mounts
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
        setApiAvailable(true);
      } catch (err) {
        console.log('API not available, using mock responses');
        setApiAvailable(false);
        setUseLocalMock(true);
      }
    };
    
    checkApiAvailability();
  }, []);

  // Automatically use demo mode if patient ID starts with "demo"
  useEffect(() => {
    if (patientId.startsWith('demo') || !apiAvailable) {
      setUseLocalMock(true);
    }
  }, [patientId, apiAvailable]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      // If using mock mode or API unavailable, return mock response
      if (useLocalMock) {
        console.log('Using mock response for chat');
        // Simulate a delay for a more realistic experience
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      }
      
      // Otherwise use the real API with chat history
      console.log(`Sending chat message to API for patient ${patientId}`);
      
      // Include the last 5 messages for context
      const contextHistory = messages
        .slice(-5)
        .map(msg => ({
          role: msg.sender,
          content: msg.content
        }));
      
      return ai.askQuestion(patientId, message, contextHistory);
    },
    onSuccess: (response) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      
      // If API fails and we're not already in mock mode, switch to mock mode
      if (!useLocalMock) {
        setUseLocalMock(true);
        // Add error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: `Sorry, I'm having trouble connecting to the server. I'll switch to demo mode.`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Retry with mock mode
        setTimeout(() => {
          chatMutation.mutate(lastUserMessage);
        }, 1000);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setLastUserMessage(input);
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput('');
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          AI Dental Assistant {useLocalMock && "(Demo Mode)"}
        </Typography>
        
        {useLocalMock && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Running in demo mode with simulated responses.
          </Alert>
        )}

        <Paper 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            height: '400px', 
            mb: 2, 
            p: 2,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '75%',
                  bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  borderRadius: '8px'
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
                <Typography variant="caption" color={message.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          ))}
          
          {chatMutation.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <CircularProgress size={12} />
                  <CircularProgress size={12} sx={{ animationDelay: '0.2s' }} />
                  <CircularProgress size={12} sx={{ animationDelay: '0.4s' }} />
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a dental question..."
            disabled={chatMutation.isPending}
            InputProps={{
              endAdornment: (
                <IconButton 
                  type="submit"
                  color="primary"
                  disabled={chatMutation.isPending || !input.trim()}
                >
                  <SendIcon />
                </IconButton>
              )
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}; 