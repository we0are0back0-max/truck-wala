require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json());
app.use(express.static('public'));

const CONFIG_FILE = './config.json';
const SONGS_FILE = './songs.json';

let defaultConfig = {
    bannerTitle: "ट्रक वाला",
    bgImage: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1000"
};

let defaultSongs = [];

if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
if (!fs.existsSync(SONGS_FILE)) fs.writeFileSync(SONGS_FILE, JSON.stringify(defaultSongs, null, 2));

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (fileBuffer, folder = 'truck_wala') => {
    return new Promise((resolve, reject) => {
        const cldStream = cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: "auto" },
            (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(cldStream);
    });
};

app.get('/api/config', (req, res) => res.json(JSON.parse(fs.readFileSync(CONFIG_FILE))));

app.post('/api/config', upload.single('bgFile'), async (req, res) => {
    try {
        let config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        if (req.body.bannerTitle) config.bannerTitle = req.body.bannerTitle;
        if (req.file) config.bgImage = await uploadToCloudinary(req.file.buffer, 'truck_wala/backgrounds');
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        io.emit('configUpdated', config);
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/songs', (req, res) => res.json(JSON.parse(fs.readFileSync(SONGS_FILE))));

app.post('/api/songs', upload.fields([{ name: 'audioFile', maxCount: 1 }, { name: 'coverFile', maxCount: 1 }]), async (req, res) => {
    try {
        let songs = JSON.parse(fs.readFileSync(SONGS_FILE));
        let audioUrl = '';
        let coverArtUrl = 'https://i.postimg.cc/442v42s0/bobby.jpg';

        if (req.files && req.files['audioFile']) audioUrl = await uploadToCloudinary(req.files['audioFile'][0].buffer, 'truck_wala/audio');
        if (req.files && req.files['coverFile']) coverArtUrl = await uploadToCloudinary(req.files['coverFile'][0].buffer, 'truck_wala/covers');

        let fallbackName = req.files && req.files['audioFile'] ? req.files['audioFile'][0].originalname.replace(/\.[^/.]+$/, "") : "New Song";

        const newSong = {
            id: Date.now().toString(),
            title: req.body.title || fallbackName,
            artist: req.body.artist || 'Truck Wala Mix',
            url: audioUrl,
            coverArt: coverArtUrl
        };

        songs.push(newSong);
        fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
        io.emit('songsUpdated', songs);
        res.json({ success: true, song: newSong });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/songs/:id', (req, res) => {
    let songs = JSON.parse(fs.readFileSync(SONGS_FILE)).filter(s => s.id !== req.params.id);
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
    io.emit('songsUpdated', songs);
    res.json({ success: true });
});

let activeUsers = 0;
io.on('connection', (socket) => {
    activeUsers++;
    io.emit('userCount', activeUsers);
    socket.on('disconnect', () => {
        activeUsers = Math.max(0, activeUsers - 1);
        io.emit('userCount', activeUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server active on Port ${PORT}`);
});
