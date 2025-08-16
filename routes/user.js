import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/user.model.js';

const router = express.Router();

// 📌 Protected Route Example: Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
