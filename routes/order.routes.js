import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/order.model.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Auth
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Մուտք գործելու համար անհրաժեշտ է token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    console.error('🔒 auth error:', e);
    return res.status(403).json({ message: 'Անվավեր token' });
  }
};

function buildTransporter() {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('✋ SMTP creds missing: email will be skipped');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // ✅ Վերահսկում ենք տրամադրված կարգավորումները
  transporter.verify((error, success) => {
    if (error) {
      console.error('📡 SMTP connection failed:', error);
    } else {
      console.log('📡 SMTP connection verified ✅ Ready to send emails');
    }
  });

  return transporter;
}



router.post('/', authMiddleware, async (req, res) => {
  const { lat, lng, name, email, phone, address } = req.body;

  // Validation
  if (!lat || !lng || !name || !email || !phone || !address) {
    return res.status(400).json({ message: 'Բոլոր դաշտերը պարտադիր են' });
  }

  try {
    // 1) Save to DB
    const order = await Order.create({
      userId: req.userId,
      lat, lng, name, email, phone, address,
    });
    console.log('💾 Order saved:', order._id);

    // 2) Try email (non-fatal)
    const transporter = buildTransporter();
    if (transporter) {
      try {
        const mailOptions = {
          from: `"GraveCare App" <${process.env.SMTP_USER}>`,
          to: process.env.TO_EMAIL || process.env.SMTP_USER,
          subject: 'Նոր պատվեր է ստացվել',
          html: `
            <h3>📌 Նոր Պատվեր</h3>
            <ul>
              <li><strong>👤 Անուն Ազգանուն:</strong> ${name}</li>
              <li><strong>📧 Էլ․ հասցե:</strong> ${email}</li>
              <li><strong>📞 Հեռախոսահամար:</strong> ${phone}</li>
              <li><strong>📫 Հասցե:</strong> ${address}</li>
              <li><strong>🌍 Կոորդինատներ:</strong> ${lat}, ${lng}</li>
              <li><strong>🆔 Order ID:</strong> ${order._id}</li>
            </ul>
          `,
        };
        console.log('📨 Sending email to:', mailOptions.to);
        await transporter.verify();
        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent');
        return res.status(201).json({ message: 'Պահպանվեց և email-ը ուղարկվեց', order });
      } catch (mailErr) {
        console.error('📨 Email send failed:', mailErr);
        // Չենք գցում 500 — պարզապես տեղեկացնում ենք, որ պատվերը պահվել է, email չուղարկվեց
        return res.status(201).json({ message: 'Պահպանվեց (email չուղարկվեց)', order });
      }
    } else {
      // Transporter չկա => email skip
      return res.status(201).json({ message: 'Պահպանվեց (email չուղարկվեց՝ SMTP չկարգավորված)', order });
    }
  } catch (err) {
    console.error('💥 Order save failed:', err);
    // Եթե Mongo validation error է, վերադարձնենք հստակ պատճառ
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Սխալ տվյալներ (ValidationError)', details: err.errors });
    }
    return res.status(500).json({ message: err?.message || 'Պատվերը չհաջողվեց' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    console.error('💥 orders list error:', e);
    res.status(500).json({ message: 'Չհաջողվեց բերել պատվերների ցուցակը' });
  }
});

export default router;
