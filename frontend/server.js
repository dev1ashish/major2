const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = new sqlite3.Database(path.join(__dirname, '../crash_database.db'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the crash database');
  }
});

// API Routes
app.get('/api/crashes', (req, res) => {
  const sql = `
    SELECT camera_id, frame_id, city, district, crash_time
    FROM crash_images
    ORDER BY crash_time DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get the latest crash
app.get('/api/crashes/latest', (req, res) => {
  const sql = `
    SELECT camera_id, frame_id, city, district, crash_time
    FROM crash_images
    ORDER BY crash_time DESC
    LIMIT 1
  `;
  
  db.get(sql, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'No crash records found' });
    }
    
    // Return with image URL for convenience
    row.imageUrl = `/api/crashes/${row.camera_id}/${row.frame_id}/image`;
    res.json(row);
  });
});

// Get a specific crash image by camera_id and frame_id
app.get('/api/crashes/:camera_id/:frame_id/image', (req, res) => {
  const { camera_id, frame_id } = req.params;
  
  const sql = `
    SELECT image
    FROM crash_images
    WHERE camera_id = ? AND frame_id = ?
  `;
  
  db.get(sql, [camera_id, frame_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row || !row.image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Convert blob to buffer and send as image
    const imageBuffer = Buffer.from(row.image);
    res.contentType('image/jpeg');
    res.end(imageBuffer);
  });
});

// Get crash details by camera_id and frame_id
app.get('/api/crashes/:camera_id/:frame_id', (req, res) => {
  const { camera_id, frame_id } = req.params;
  
  const sql = `
    SELECT camera_id, frame_id, city, district, crash_time
    FROM crash_images
    WHERE camera_id = ? AND frame_id = ?
  `;
  
  db.get(sql, [camera_id, frame_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Crash record not found' });
    }
    
    res.json(row);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
}); 