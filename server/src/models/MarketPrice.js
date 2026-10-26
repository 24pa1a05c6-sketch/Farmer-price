import mongoose from 'mongoose';

const marketPriceSchema = new mongoose.Schema({
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
    index: true
  },
  market: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    required: true,
    index: true
  },
  commodityName: {
    type: String,
    required: true,
    trim: true
  },
  variety: {
    type: String,
    required: true,
    default: 'Common',
    trim: true
  },
  minimumPrice: {
    type: Number,
    required: true,
    min: [0, 'Minimum price cannot be negative']
  },
  maximumPrice: {
    type: Number,
    required: true,
    min: [0, 'Maximum price cannot be negative']
  },
  modalPrice: {
    type: Number,
    required: true,
    min: [0, 'Modal price cannot be negative']
  },
  unit: {
    type: String,
    enum: ['INR/Quintal', 'INR/Kg'],
    default: 'INR/Quintal'
  },
  observationDate: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['AGMARKNET_API', 'AGMARKNET_CSV', 'APMC_ADMIN_MANUAL', 'DEMO_SEED'],
    required: true,
    default: 'DEMO_SEED'
  },
  dataStatus: {
    type: String,
    enum: ['OFFICIAL', 'MANUALLY_VERIFIED', 'DEMO_SAMPLE', 'STALE'],
    required: true,
    default: 'DEMO_SAMPLE',
    index: true
  },
  importTimestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound unique index to prevent duplicate price records for the same crop, variety, market, and observation date
marketPriceSchema.index(
  { crop: 1, market: 1, variety: 1, observationDate: 1 },
  { unique: true }
);

export default mongoose.model('MarketPrice', marketPriceSchema);
