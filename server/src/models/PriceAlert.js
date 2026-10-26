import mongoose from 'mongoose';

const priceAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
    index: true
  },
  market: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    default: null
  },
  targetPrice: {
    type: Number,
    required: true,
    min: [1, 'Target price must be positive']
  },
  unit: {
    type: String,
    enum: ['INR/Quintal', 'INR/Kg'],
    default: 'INR/Quintal'
  },
  condition: {
    type: String,
    enum: ['ABOVE_OR_EQUAL', 'BELOW_OR_EQUAL'],
    required: true,
    default: 'ABOVE_OR_EQUAL'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'TRIGGERED', 'PAUSED'],
    default: 'ACTIVE',
    index: true
  },
  lastEvaluatedObservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketPrice',
    default: null
  },
  lastObservedPrice: {
    type: Number,
    default: null
  },
  triggeredTimestamp: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('PriceAlert', priceAlertSchema);
