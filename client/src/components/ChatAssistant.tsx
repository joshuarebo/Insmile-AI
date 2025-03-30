import React, { useState, useEffect, useRef } from 'react';
import { ai } from '../services/ai';
import { Box, Card, CardContent, Typography, TextField, IconButton, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface ChatAssistantProps {
  patientId: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ patientId }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '0', 
      role: 'assistant', 
      content: 'Hello! I\'m your dental assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiSource, setApiSource] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Preserve scroll position when new messages are added
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 1) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        // Auto-scroll only if user was already at the bottom
        scrollToBottom();
      } else {
        // If user has scrolled up, maintain their position
        setShowScrollButton(true);
      }
    }
  }, [messages]);

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    // Add to messages and clear input
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      console.log(`Sending message to AI: ${userMessage.content}`);
      
      // Get chat history (last 5 messages maximum)
      const chatHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Send to AI service 
      const response = await ai.sendChatMessage(userMessage.content, patientId, chatHistory);
      console.log('Received response:', response);
      
      // Add AI response to chat
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || "I'm sorry, I couldn't process your request.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Track where the response came from (for debugging)
      setApiSource(response.source || 'unknown');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to the AI service right now. Please try again in a moment.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setApiSource('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, position: 'relative' }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Chat Assistant
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            bgcolor: 'success.main',
            mr: 1 
          }} />
          <Typography variant="body2">Online</Typography>
          
          {apiSource && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              Source: {apiSource}
            </Typography>
          )}
        </Box>
        
        <Box 
          ref={messagesContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            pr: 1,
            pl: 1,
            pt: 1,
            height: '350px',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888', 
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}
        >
          {messages.map((message) => (
            <Box 
              key={message.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  maxWidth: '80%',
                  bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                  borderRadius: '8px'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: '8px' }}>
                <Typography variant="body2">Typing...</Typography>
              </Paper>
            </Box>
          )}
          
          <div ref={endOfMessagesRef} />
        </Box>
        
        {showScrollButton && (
          <IconButton 
            size="small" 
            color="primary" 
            onClick={scrollToBottom}
            sx={{ 
              position: 'absolute', 
              bottom: 80, 
              right: 20, 
              zIndex: 2,
              backgroundColor: 'white',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'grey.100',
              }
            }}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 'auto' }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a dental question..."
            disabled={isLoading}
            InputProps={{
              endAdornment: (
                <IconButton 
                  type="submit"
                  color="primary"
                  disabled={isLoading || !input.trim()}
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

export default ChatAssistant; 