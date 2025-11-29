const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Add balance (for practice purposes, no actual money)
router.post('/add-balance', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;

        if(!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await User.findById(req.userId);
        user.balance += amount;
        await user.save();

        res.json({ balance: user.balance });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Get balance
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ balance: user.balance });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Leaderboard (Top 10 By Balance)
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await User.find()
            .sort({ balance: -1 })
            .limit(10)
            .select('username balance freeSpins totalWagered biggestMultiplier avatar');

        res.json(leaderboard);
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Get User Statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        const stats = {
            // User
            username: user.username,
            joinDate: user.createdAt || new Date(),
            // Economy
            balance: user.balance,
            freeSpins: user.freeSpins,
            // Gameplay stats
            totalSpins: user.totalSpins || 0,
            totalWins: user.totalWins || 0,
            totalWagered: user.totalWagered || 0,
            highestWin: user.highestWin || 0,
            biggestMultiplier: user.biggestMultiplier || 0,
            lastWin: user.lastWin || 0,
            lastSpinAt: user.lastSpinAt
        };

        res.json(stats);
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;