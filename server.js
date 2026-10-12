const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

let notes = [
  {
    id: 1,
    text: "Review project milestones",
    dueDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16) // 1 hour from now
  }
];

// Get all notes
app.get('/api/notes', (req, res) => {
  res.json(notes);
});

// Add a note with text and optional due date
app.post('/api/notes', (req, res) => {
  const { text, dueDate } = req.body;
  if (!text) return res.status(400).json({ error: "Note text required" });

  const newNote = {
    id: Date.now(),
    text,
    dueDate: dueDate || null
  };
  notes.push(newNote);
  res.status(201).json(newNote);
});

// Delete a note
app.delete('/api/notes/:id', (req, res) => {
  const noteId = Number(req.params.id);
  notes = notes.filter(n => n.id !== noteId);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});