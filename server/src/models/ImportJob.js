import mongoose from 'mongoose';

const importJobSchema = new mongoose.Schema({
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceType: {
    type: String,
    enum: ['CSV_UPLOAD', 'AGMARKNET_API_SYNC', 'SEED_SCRIPT'],
    required: true
  },
  fileName: { type: String, default: '' },
  totalRows: { type: Number, default: 0 },
  insertedCount: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  validationErrors: [{
    rowNumber: Number,
    reason: String,
    rawRow: mongoose.Schema.Types.Mixed
  }],
  status: {
    type: String,
    enum: ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'],
    default: 'COMPLETED'
  }
}, { timestamps: true });

export default mongoose.model('ImportJob', importJobSchema);
