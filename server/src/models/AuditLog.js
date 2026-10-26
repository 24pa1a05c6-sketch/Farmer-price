import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['Crop', 'Market', 'MarketPrice', 'ImportJob', 'User'],
    required: true
  },
  entityId: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
