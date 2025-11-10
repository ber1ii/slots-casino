const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if(existingUser) {
            return res
                .status(400)
                .json({ error: "Username or email already exists" });
        }

        // Create user
        const user = new User({ username, email, password });
        await user.save();

        // Create token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn : '7d',
        });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
            },
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if(!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if(!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn : '7d',
        });

        res.json({
            token,
            user: {
                id: user._id,
                username : user.username,
                email : user.email,
                balance: user.balance,
            },
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user (protected route)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;