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

module.exports = router;