import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BedrockChatService } from '../services/ai/nlp/bedrockChatService';

const router = express.Router();

// In-memory storage for MVP (replace with database later)
const chatSessions: any[] = [];

// Get all chat sessions for a patient
router.get('/patient/:patientId', (req, res) => {
  const patientSessions = chatSessions.filter(
    s => s.patientId === req.params.patientId && s.userId === req.user?.userId
  );
  res.json(patientSessions);
});

// Get a single chat session
router.get('/:id', (req, res) => {
  const session = chatSessions.find(s => s.id === req.params.id && s.userId === req.user?.userId);
  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }
  res.json(session);
});

// Create a new chat session
router.post('/sessions', (req, res) => {
  const { patientId, initialContext } = req.body;

  const session = {
    id: uuidv4(),
    userId: req.user?.userId,
    patientId,
    messages: [],
    context: initialContext || {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  chatSessions.push(session);
  res.status(201).json(session);
});

// Send a message in a chat session
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const sessionIndex = chatSessions.findIndex(
      s => s.id === req.params.id && s.userId === req.user?.userId
    );

    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const { content } = req.body;
    const session = chatSessions[sessionIndex];

    // Add user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    session.messages.push(userMessage);

    // Initialize chat service
    const chatService = new BedrockChatService();

    // Generate AI response
    const aiResponse = await chatService.generateResponse(content, session.context);

    // Add AI message
    const aiMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };

    session.messages.push(aiMessage);
    session.updatedAt = new Date();

    res.json({
      userMessage,
      aiMessage
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Update chat session context
router.put('/sessions/:id/context', (req, res) => {
  const sessionIndex = chatSessions.findIndex(
    s => s.id === req.params.id && s.userId === req.user?.userId
  );

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  const session = chatSessions[sessionIndex];
  session.context = {
    ...session.context,
    ...req.body
  };
  session.updatedAt = new Date();

  res.json(session);
});

// Delete a chat session
router.delete('/sessions/:id', (req, res) => {
  const sessionIndex = chatSessions.findIndex(
    s => s.id === req.params.id && s.userId === req.user?.userId
  );

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  chatSessions.splice(sessionIndex, 1);
  res.json({ message: 'Chat session deleted successfully' });
});

export default router; 