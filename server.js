const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Configure CORS to only allow your frontend
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test endpoint for 1 rupee payment
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  
  // Razorpay minimum amount is 1 rupee (100 paise)
  const paymentAmount = Math.max(amount, 1) * 100;

  const options = {
    amount: paymentAmount,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1 // Auto-capture payment
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ 
      success: true, 
      order: {
        ...order,
        amount: paymentAmount
      } 
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ 
      success: false, 
      error: {
        message: err.error?.description || 'Payment failed',
        code: err.statusCode
      }
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
