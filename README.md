# LeetCode Helper

LeetCode Helper is a chat-based assistant designed to guide users through solving LeetCode problems. It provides hints, explanations, and discussions without giving direct answers.

## Features

- **LeetCode URL Parsing**: Users can paste a LeetCode problem link to start a session.
- **Chat-based Assistance**: Interact with the assistant by asking doubts related to the problem.
- **Persistent Sessions**: Session history is saved in `localStorage` for continuity.
- **Dark/Light Mode**: Toggle between dark and light themes.
- **Code Formatting**: Supports syntax highlighting for code blocks using `react-markdown` and `react-syntax-highlighter`.
- **Auto Scroll & Input Focus**: Chat automatically scrolls to the latest message and focuses on input.

## Tech Stack

- **Frontend**: React.js, Axios, React Icons, React Markdown, Prism for syntax highlighting.
- **Backend**: Node.js, Express.js, Gemini API.
- **Storage**: LocalStorage for session persistence.

## Installation

### Prerequisites

- Node.js installed on your system.
- A running backend server that supports the chat functionality.

### Steps

1. Clone the repository:

   ```
   git clone https://github.com/KKartikay-27/leetcode-helper
   cd leetcode-helper
   ```

2. Install dependencies:

   ```
   npm run install-all
   ```

3. Start the development server:

   ```
   npm run start
   ```

The app will be available at `http://localhost:5173`.

## Backend Setup

Ensure you have a backend running that supports the `/start-session` and `/message` API endpoints.

- `/start-session` expects a `leetCodeUrl` in the request body and returns a `sessionId`.
- `/message` expects `sessionId`, `message`, and `leetCodeUrl` in the request body and returns a response.

## Usage

1. Enter a LeetCode problem URL.
2. Ask questions related to the problem.
3. View responses with syntax-highlighted code.
4. Toggle between dark and light mode.
5. Start a new session anytime.
