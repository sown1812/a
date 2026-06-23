import express from 'express';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request body
app.use(express.json());

// Enable CORS for frontend integration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /chat endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required in request body.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not defined in environment variables.');
    return res.status(500).json({ error: 'Anthropic API key is missing. Please set ANTHROPIC_API_KEY in your .env file.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });

    const reply = response.content[0].text;
    res.json({ reply });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with Anthropic API.', 
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
