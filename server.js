const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Path to songs JSON database
const songsFilePath = path.join(__dirname, 'songs.json');

// Helper function to read songs
function getSongs() {
    if (!fs.existsSync(songsFilePath)) {
        return [];
    }
    try {
        const data = fs.readFileSync(songsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Helper function to save songs
function saveSongs(songs) {
    fs.writeFileSync(songsFilePath, JSON.stringify(songs, null, 2));
}

// API: Get all songs
app.get('/api/songs', (req, res) => {
    const songs = getSongs();
    res.json(songs);
});

// API: Add a new song via Direct URLs
app.post('/api/add-song', (req, res) => {
    try {
        const { title, artist, url, image } = req.body;

        if (!title || !artist || !url || !image) {
            return res.status(400).json({ success: false, message: 'Sabhi fields bharna zaroori hai!' });
        }

        const songs = getSongs();
        const newSong = {
            id: Date.now(),
            title,
            artist,
            url,
            image
        };

        songs.push(newSong);
        saveSongs(songs);

        res.json({ success: true, message: 'Gaana safaltapoorvak add ho gaya!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
