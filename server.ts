import express from "express";
import path from "path";
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Ensure db is initialized
const db = new Database('task_buddy_95.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    first_login INTEGER DEFAULT 1
  );
`);

// Safe migration for older users
try {
  db.exec('ALTER TABLE users ADD COLUMN first_login INTEGER DEFAULT 1;');
} catch (e) {
  // Column already exists
}

db.exec(`

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL,
    is_completed INTEGER DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id TEXT UNIQUE NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notes_v2 (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Gemini client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

let activeModel = 'gemini-1.5-flash';

async function initGemini() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment. Fallback responses will be used.");
      return;
    }
    const response = await ai.models.list();
    if (response) {
      const modelsList = [];
      for await (const m of response) {
        modelsList.push(m);
      }
      const candidates = modelsList.filter(m => {
        const name = m.name?.toLowerCase() || '';
        const isNotSpecial = !name.includes('embedding') && 
                             !name.includes('image') && 
                             !name.includes('video') && 
                             !name.includes('audio');
        const matchesType = name.includes('flash') || name.includes('pro') || name.includes('latest');
        return isNotSpecial && matchesType;
      });
      if (candidates.length > 0) {
        const rawName = candidates[0].name || 'gemini-1.5-flash';
        activeModel = rawName.startsWith('models/') ? rawName.substring(7) : rawName;
        console.log(`Selected Gemini model: ${activeModel}`);
      }
    }
  } catch (error) {
    console.error("Error listing models, using default:", error);
  }
}

initGemini();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SECRET = process.env.SECRET_KEY || "task_buddy_95_secret_key_1337";

interface AuthenticatedRequest extends express.Request {
  user?: {
    userId: string;
    username: string;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  jwt.verify(token, SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User does not exist. Please register or log in again.' });
    }
    req.user = decoded as { userId: string; username: string };
    next();
  });
};

// Signup
app.post(['/signup', '/api/signup'], (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const userId = crypto.randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const createdAt = new Date().toISOString();

    db.prepare('INSERT INTO users (id, username, hashed_password, created_at) VALUES (?, ?, ?, ?)').run(
      userId, username, hashedPassword, createdAt
    );

    const noteId = crypto.randomUUID();
    db.prepare('INSERT INTO notes (id, content, user_id, updated_at) VALUES (?, ?, ?, ?)').run(
      noteId, '', userId, createdAt
    );

    const noteIdV2 = crypto.randomUUID();
    db.prepare('INSERT INTO notes_v2 (id, title, content, user_id, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      noteIdV2, 'Welcome Note', 'This is your first persistent memory block note! Feel free to edit this or create multiple notes.', userId, createdAt
    );

    res.status(201).json({ id: userId, username });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post(['/login', '/api/login'], (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isValid = bcrypt.compareSync(password, user.hashed_password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET, { expiresIn: '24h' });

    // Check first login status and reset it to 0
    const isFirstLogin = user.first_login !== 0;
    if (isFirstLogin) {
      db.prepare('UPDATE users SET first_login = 0 WHERE id = ?').run(user.id);
    }

    res.json({
      access_token: token,
      token_type: 'bearer',
      is_first_login: isFirstLogin
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tasks
app.get(['/tasks', '/api/tasks'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const tasks = db.prepare('SELECT id, title, description, priority, is_completed FROM tasks WHERE user_id = ?').all(userId);
    const formatted = tasks.map((t: any) => ({
      ...t,
      is_completed: t.is_completed === 1
    }));
    res.json(formatted);
  } catch (err) {
    console.error("GET tasks error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(['/tasks', '/api/tasks'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { title, description = '', priority = 2 } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const taskId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const p = parseInt(priority, 10) || 2;

    db.prepare('INSERT INTO tasks (id, title, description, priority, is_completed, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      taskId, title, description, p, 0, userId, createdAt
    );

    res.status(201).json({
      id: taskId,
      title,
      description,
      priority: p,
      is_completed: false
    });
  } catch (err) {
    console.error("POST task error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put(['/tasks/:id', '/api/tasks/:id'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, description, priority, is_completed } = req.body;

    const task: any = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTitle = title !== undefined ? title : task.title;
    const updatedDesc = description !== undefined ? description : task.description;
    const updatedPriority = priority !== undefined ? parseInt(priority, 10) : task.priority;
    const updatedCompleted = is_completed !== undefined ? (is_completed ? 1 : 0) : task.is_completed;

    db.prepare('UPDATE tasks SET title = ?, description = ?, priority = ?, is_completed = ? WHERE id = ?').run(
      updatedTitle, updatedDesc, updatedPriority, updatedCompleted, id
    );

    res.json({
      id,
      title: updatedTitle,
      description: updatedDesc,
      priority: updatedPriority,
      is_completed: updatedCompleted === 1
    });
  } catch (err) {
    console.error("PUT task error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete(['/tasks/:id', '/api/tasks/:id'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error("DELETE task error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notes
app.get(['/notes', '/api/notes'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    let notes = db.prepare('SELECT id, title, content, updated_at FROM notes_v2 WHERE user_id = ? ORDER BY updated_at DESC').all(userId);

    // If no notes, create a default welcome note so the user isn't blank
    if (notes.length === 0) {
      const noteId = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO notes_v2 (id, title, content, user_id, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        noteId, 'Welcome Note', 'This is your first persistent memory block note! Feel free to edit this or create multiple notes.', userId, now
      );
      notes = [{
        id: noteId,
        title: 'Welcome Note',
        content: 'This is your first persistent memory block note! Feel free to edit this or create multiple notes.',
        updated_at: now
      }];
    }

    res.json(notes);
  } catch (err) {
    console.error("GET notes error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(['/notes', '/api/notes'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { title = 'New Note', content = '' } = req.body;
    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO notes_v2 (id, title, content, user_id, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      noteId, title, content, userId, now
    );

    res.status(201).json({
      id: noteId,
      title,
      content,
      updated_at: now
    });
  } catch (err) {
    console.error("POST note error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put(['/notes/:id', '/api/notes/:id'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, content } = req.body;

    const note: any = db.prepare('SELECT * FROM notes_v2 WHERE id = ? AND user_id = ?').get(id, userId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedTitle = title !== undefined ? title : note.title;
    const updatedContent = content !== undefined ? content : note.content;
    const now = new Date().toISOString();

    db.prepare('UPDATE notes_v2 SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
      updatedTitle, updatedContent, now, id
    );

    res.json({
      id,
      title: updatedTitle,
      content: updatedContent,
      updated_at: now
    });
  } catch (err) {
    console.error("PUT note error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete(['/notes/:id', '/api/notes/:id'], authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const note = db.prepare('SELECT * FROM notes_v2 WHERE id = ? AND user_id = ?').get(id, userId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    db.prepare('DELETE FROM notes_v2 WHERE id = ?').run(id);
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error("DELETE note error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI assistance
app.post(['/ai-assist', '/api/ai-assist'], authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { task_title, task_description = '' } = req.body;
    if (!task_title) {
      return res.status(400).json({ error: 'task_title is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        status: "success",
        data: {
          explanation: `Let's work on "${task_title}"! (To activate live AI assistance, please configure GEMINI_API_KEY in Settings > Secrets).`,
          clickable_links: [
            { title: "YouTube: Search guides for " + task_title, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(task_title)}` },
            { title: "Google: Search resources for " + task_title, url: `https://www.google.com/search?q=${encodeURIComponent(task_title)}` },
            { title: "Wikipedia: Search definitions", url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(task_title)}` }
          ],
          next_steps: ["Break down the task into smaller chunks", "Set up your workspace tools", "Write the initial code structure"]
        }
      });
    }

    const prompt = `You are a helpful task-accomplishment assistant. Give concise, general guidance and web-resource recommendations for:
Title: "${task_title}"
Description: "${task_description || 'No description provided.'}"

Generate a helpful learning payload. Deliver a JSON object with:
- "explanation": 2-3 sentences of clear, practical overview.
- "clickable_links": An array of exactly 3 relevant web resources, websites, articles, tutorials, or YouTube search queries. Each item MUST have:
  * "title": A concise, natural label for the resource (e.g. "YouTube: [Topic] Video Search", "Wikipedia: [Topic]", "Google search on [Topic]").
  * "url": A real, valid web link (e.g. a YouTube search query link like "https://www.youtube.com/results?search_query=..." or an official website URL like Wikipedia, MDN, StackOverflow, etc.).
- "next_steps": exactly 3 clear, actionable next-step items as simple strings.

Output must be ONLY JSON. No markdown wrappers.`;

    const geminiResponse = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            clickable_links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["title", "url"]
              }
            },
            next_steps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["explanation", "clickable_links", "next_steps"]
        }
      }
    });

    let text = geminiResponse.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);

    res.json({
      status: "success",
      data
    });
  } catch (err: any) {
    console.error("Gemini AI API error:", err);
    res.json({
      status: "success",
      data: {
        explanation: `Let's tackle "${req.body.task_title}" with systematic steps.`,
        clickable_links: [
          { title: "YouTube: Search guides for " + req.body.task_title, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(req.body.task_title)}` },
          { title: "Google: Search resources for " + req.body.task_title, url: `https://www.google.com/search?q=${encodeURIComponent(req.body.task_title)}` }
        ],
        next_steps: ["Prepare outline of steps", "Develop task increments", "Test and verify completion"]
      }
    });
  }
});

// AI Chatbot endpoint
app.post('/api/ai/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `Beep boop! 💾 I am Task Assistant 95, your local helper! Currently, I am running in local offline mode. Please configure GEMINI_API_KEY in Settings > Secrets to boot my virtual AI core. How can I help you locally?`
      });
    }

    // Format history for Gemini API
    const contents = [];
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'model') {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text || '' }]
        });
      }
    }
    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const systemInstruction = `You are "Task Assistant 95", a clever, supportive, and nostalgic desktop companion built into the Task Buddy 95 Operating System (for user "${req.user?.username || 'Guest'}"). 
Help the user manage tasks, organize ideas, provide technical tips, or draft notes. 
Keep your tone retro-tech, warm, and helpful, using terms like 'Buffer', 'Tracks & Sectors', 'System RAM', or 'Floppy Drive' when fitting, but keep the core advice highly clear, concise, and practical.
Use simple formatting (bullet points, bold) to render beautifully in the terminal chat window.`;

    const geminiResponse = await ai.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction
      }
    });

    const reply = geminiResponse.text || "No response received.";
    res.json({ reply });
  } catch (err: any) {
    console.error("Gemini Chat API error:", err);
    res.status(500).json({ error: 'Failed to query AI assistant' });
  }
});

// Vite middleware for development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
