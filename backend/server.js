require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Store conversation history for each user session
const sessions = {};

app.post("/start-session", async (req, res) => {
  const { leetCodeUrl } = req.body;
  const sessionId = Date.now().toString();
  
  console.log("Starting new session with URL:", leetCodeUrl);
  
  if (!leetCodeUrl) {
    return res.status(400).json({ error: "LeetCode URL is required" });
  }
  
  // Initialize session with system prompts
  sessions[sessionId] = {
    history: [
      { 
        role: "system", 
        content: `You are a DSA mentor who helps users understand and solve LeetCode problems. 
        Follow these guidelines:
        1. First, help the user understand the problem clearly
        2. Guide them to identify the key concepts and patterns involved
        3. Ask questions to assess their understanding
        4. Provide hints progressively, starting with conceptual hints
        5. If they're stuck, suggest a high-level approach
        6. For implementation issues, offer debugging tips
        7. NEVER provide a complete solution
        8. Encourage the user to think through each step
        9. Validate their thinking process and redirect when necessary
        10. Use Socratic method to guide rather than tell
        11. If the user writes something distracting or off-topic, gently bring them back to the LeetCode problem
        
        IMPORTANT: Never reveal your internal analysis process to the user. After analyzing the problem, 
        immediately engage with the user as if you already understand the problem.
        Do not tell the user what you know about the problem - instead, ask them what they understand about it
        and guide them from there. Start by asking what specific part of the problem they're struggling with.`
      },
      {
        role: "system",
        content: `You are helping with the LeetCode problem at: ${leetCodeUrl}
        Always reference this problem in your responses. Assume the user has read the problem but may need guidance.
        Never explain what YOU understand about the problem directly. Instead, guide the user to better understand it themselves.
        Your first response should be conversational and ask the user what part of the problem they're struggling with.`
      }
    ],
    leetCodeUrl: leetCodeUrl
  };
  
  // Send the first assistant message immediately
  const firstMessage = "Hi! I'll help you solve this LeetCode problem. What specific part of the problem are you having trouble with?";
  
  // Add this message to history
  sessions[sessionId].history.push({ role: "assistant", content: firstMessage });
  
  res.json({ 
    sessionId,
    firstMessage
  });
});

app.post("/message", async (req, res) => {
  const { sessionId, message, leetCodeUrl } = req.body;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: "Invalid session" });
  }
  
  const session = sessions[sessionId];
  
  // Double-check URL handling
  if (leetCodeUrl && !session.leetCodeUrl) {
    session.leetCodeUrl = leetCodeUrl;
    session.history.push({
      role: "system",
      content: `You are helping with the LeetCode problem at: ${leetCodeUrl}
      Always reference this problem in your responses. Assume the user has read the problem but may need guidance.`
    });
  }
  
  // Add user message to history
  session.history.push({ role: "user", content: message });
  
  try {
    // Create a simplified version of history for the API
    // This ensures we're not sending too much context
    const simplifiedHistory = [];
    
    // Add all system messages at the beginning
    session.history
      .filter(msg => msg.role === "system")
      .forEach(msg => {
        simplifiedHistory.push({
          role: "user",
          parts: [{ text: `[SYSTEM INSTRUCTION]: ${msg.content}` }]
        });
      });
    
    // Add the last 10 messages from the conversation
    const conversationMessages = session.history
      .filter(msg => msg.role !== "system")
      .slice(-10);
      
    conversationMessages.forEach(msg => {
      simplifiedHistory.push({
        role: msg.role,
        parts: [{ text: msg.content }]
      });
    });
    
    // Extra context reminder at the end
    simplifiedHistory.push({
      role: "user",
      parts: [{ text: `[REMINDER]: You're helping with the LeetCode problem at ${session.leetCodeUrl}. Respond to the user's last message without revealing your own analysis - guide them to understand and solve it step by step. Don't say "Based on my analysis" or similar phrases.` }]
    });
    
    // Gemini API request
    const response = await axios.post(GEMINI_API_URL, {
      contents: simplifiedHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    }, {
      headers: { "Content-Type": "application/json" }
    });
    
    const assistantResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Sorry, I couldn't generate a response.";
    
    // Add assistant response to history
    session.history.push({ role: "assistant", content: assistantResponse });
    
    // Return the response
    res.json({ response: assistantResponse });
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    
    // Provide detailed error information
    res.status(500).json({ 
      error: "Failed to communicate with Gemini API", 
      details: error.message,
      requestBody: error.config?.data
    });
  }
});

app.get("/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: "Invalid session" });
  }
  
  const userMessages = sessions[sessionId].history.filter(msg => msg.role === "user").length;
  
  let progress = "initial";
  if (userMessages > 10) progress = "advanced";
  else if (userMessages > 5) progress = "intermediate";
  else if (userMessages > 2) progress = "beginning";
  
  res.json({ 
    progress, 
    messageCount: userMessages,
    leetCodeUrl: sessions[sessionId].leetCodeUrl
  });
});

app.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: "Invalid session" });
  }
  
  res.json({ 
    history: sessions[sessionId].history.filter(msg => msg.role !== "system"),
    leetCodeUrl: sessions[sessionId].leetCodeUrl
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));