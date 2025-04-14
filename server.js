require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://uptimerobot.com', // For monitoring
  'http://localhost:3000'    // For local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} catch (err) {
  console.error('Razorpay initialization failed:', err);
  process.exit(1);
}

// Instant health endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Optimized root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: 'Happy Doctors Backend'
  });
});

// Payment endpoint with enhanced validation
app.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least 1 INR'
      });
    }

    const paymentAmount = Math.floor(amount) * 100; // Ensure integer

    const order = await razorpay.orders.create({
      amount: paymentAmount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: paymentAmount,
        currency: order.currency,
        status: order.status,
        created_at: order.created_at
      }
    });

  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: err.statusCode || 500,
        message: err.error?.description || 'Payment processing failed',
        details: process.env.NODE_ENV === 'development' ? err : undefined
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated');
    process.exit(0);
  });
});
