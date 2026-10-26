import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceAlert',
    required: true
  },
  observation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketPrice',
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent duplicate notification for the same alert and price observation event
notificationSchema.index({ alert: 1, observation: 1 }, { unique: true });

export default mongoose.model('Notification', notificationSchema);
