import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, default: 'system' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
