import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiSend, FiCode, FiMoon, FiSun } from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [leetCodeUrl, setLeetCodeUrl] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [pinnedTab, setPinnedTab] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Load session history from local storage on initial load
  useEffect(() => {
    const savedSession = localStorage.getItem('leetcodeHelperSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setSessionId(session.sessionId);
        setMessages(session.messages);
        setLeetCodeUrl(session.leetCodeUrl);
        setShowUrlInput(false);
        setPinnedTab(session.leetCodeUrl);
      } catch (error) {
        console.error("Error loading saved session:", error);
      }
    }
  }, []);
  
  // Save session data whenever it changes
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      const sessionData = {
        sessionId,
        messages,
        leetCodeUrl,
      };
      localStorage.setItem('leetcodeHelperSession', JSON.stringify(sessionData));
    }
  }, [sessionId, messages, leetCodeUrl]);

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Validate LeetCode URL
  const isValidLeetCodeUrl = (url) => {
    const leetCodeRegex = /^https?:\/\/(www\.)?leetcode\.com\/(problems|contest|explore)\/[\w-]+/i;
    return leetCodeRegex.test(url);
  };
  
  // Start a new session
  const startSession = async () => {
    if (!leetCodeUrl) {
      alert("Please enter a LeetCode problem URL");
      return;
    }
    
    if (!isValidLeetCodeUrl(leetCodeUrl)) {
      alert("Please enter a valid LeetCode URL");
      return;
    }
    
    try {
      setLoading(true);
      
      // Send the leetCodeUrl in the initial request
      const response = await axios.post("http://localhost:5000/start-session", {
        leetCodeUrl: leetCodeUrl
      });
      
      setSessionId(response.data.sessionId);
      setShowUrlInput(false);
      setPinnedTab(leetCodeUrl);
      
      // Add the first message from the backend
      if (response.data.firstMessage) {
        setMessages([
          {
            role: "assistant",
            content: response.data.firstMessage
          }
        ]);
      } else {
        // Fallback message if firstMessage isn't provided
        setMessages([
          {
            role: "assistant",
            content: "Hi! I'll help you solve this LeetCode problem. What part are you having trouble with?"
          }
        ]);
      }
      
      // Focus on the message input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      setLoading(false);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session. Please try again.");
      setLoading(false);
    }
  };
  
  // Send a message
  const sendMessage = async (messageText = null) => {
    if (!sessionId) return;
    
    const userMessage = messageText || message;
    if (!userMessage) return;
    
    // Add user message to UI
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setLoading(true);
    
    try {
      const response = await axios.post("http://localhost:5000/message", {
        sessionId,
        message: userMessage,
        leetCodeUrl // Always send the URL with each message as a backup
      });
      
      // Add assistant response to UI
      setMessages(prev => [...prev, { role: "assistant", content: response.data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };
  
  // Reset chat to start a new session
  const resetChat = () => {
    // Clear local storage
    localStorage.removeItem('leetcodeHelperSession');
    
    setShowUrlInput(true);
    setMessages([]);
    setLeetCodeUrl("");
    setSessionId(null);
    setPinnedTab(null);
  };
  
  // Handle key press for multiline input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Using Shift+Enter will naturally create a new line
  };
  
  // Custom renderer for code blocks
  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={darkMode ? atomDark : oneLight}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };
  
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <div className="header">
        <div className="logo">
          <FiCode className="logo-icon" />
          <h1>LeetCode Helper</h1>
        </div>
        <div className="header-actions">
          {pinnedTab && (
            <div className="pinned-tab" onClick={() => window.open(pinnedTab, '_blank')}>
              <FiCode className="tab-icon" />
              <span className="tab-title">{new URL(pinnedTab).pathname.split('/').pop()}</span>
            </div>
          )}
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div className="chat-container" ref={chatContainerRef}>
          {/* Messages are always shown */}
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.role === "user" ? "user-message" : "assistant-message"}`}
              >
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-content">
                  <ReactMarkdown
                    components={{
                      code: CodeBlock
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="message assistant-message">
                <div className="message-avatar">🤖</div>
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Fixed bottom input area */}
        <div className="input-area">
          {/* Conditionally show URL input or message form */}
          {showUrlInput ? (
            <div className="url-input-container">
              <h2>Get step-by-step guidance for solving LeetCode problems</h2>
              
              <div className="url-form">
                <input
                  type="text"
                  placeholder="Paste LeetCode Problem URL"
                  value={leetCodeUrl}
                  onChange={(e) => setLeetCodeUrl(e.target.value)}
                  className="leetcode-url-input"
                />
                <button 
                  onClick={startSession}
                  className="start-session-btn"
                  disabled={loading}
                >
                  {loading ? "Starting..." : "Start Session"} <FiCode />
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="input-form">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question about the problem... (Shift+Enter for new line)"
                  disabled={loading}
                  className="message-input"
                  rows={1}
                />
                <button type="submit" disabled={loading || !message}>
                  <FiSend />
                </button>
              </form>
              
              <div className="chat-actions">
                <button onClick={resetChat} className="reset-btn">
                  New Problem
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;