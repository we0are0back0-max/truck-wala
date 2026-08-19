const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const songsFilePath = path.join(__dirname, 'songs.json');

function getSongs() {
    if (!fs.existsSync(songsFilePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(songsFilePath, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveSongs(songs) {
    fs.writeFileSync(songsFilePath, JSON.stringify(songs, null, 2));
}

app.get('/api/songs', (req, res) => {
    res.json(getSongs());
});

app.post('/api/add-song', (req, res) => {
    try {
        const { title, artist, url, image } = req.body;
        if (!title || !artist || !url || !image) {
            return res.status(400).json({ success: false, message: 'Sabhi fields bharna zaroori hai!' });
        }

        const songs = getSongs();
        const newSong = { id: Date.now(), title, artist, url, image };
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
