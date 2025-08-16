import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const router = express.Router();

// ✅ Գրանցում
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 🔒 Ստուգում ենք՝ բոլոր դաշտերը լրացված են
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Բոլոր դաշտերը պարտադիր են։' });
    }

    // 🔍 Ստուգում ենք՝ կա՞ արդյոք արդեն օգտատեր այդ email-ով
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Այս email-ով օգտատեր արդեն գոյություն ունի։' });
    }

    // 🔐 Գաղտնաբառի hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧾 Ստեղծում ենք նոր օգտատեր
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 🔑 Թոքեն ստեղծում
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      token,
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ message: 'Սերվերում սխալ է տեղի ունեցել։' });
  }
});

// ✅ Մուտք
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Ստուգում՝ լրացված են դաշտերը
    if (!email || !password) {
      return res.status(400).json({ message: 'Մուտք գործելու բոլոր դաշտերը պարտադիր են։' });
    }

    // 🔍 Օգտատիրոջ ստուգում
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Օգտատերը չի գտնվել։' });
    }

    // 🧪 Գաղտնաբառի համեմատում
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Սխալ գաղտնաբառ կամ email։' });
    }

    // 🔐 Թոքեն
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Սերվերում սխալ է տեղի ունեցել։' });
  }
});

export default router;
