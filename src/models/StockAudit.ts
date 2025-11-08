import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IStockAudit extends Document {
  stockId: mongoose.Types.ObjectId;
  action: "created" | "updated" | "deleted";
  changes: Array<{
    key: string;
    oldValue: any;
    newValue: any;
  }>;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  note?: string;
  createdAt: Date;
}

const StockAuditSchema = new Schema<IStockAudit>(
  {
    stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
    action: { type: String, enum: ["created", "updated", "deleted"], required: true },
    changes: [
      {
        key: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    user: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    note: { type: String },
  },
  { timestamps: true }
);

StockAuditSchema.index({ stockId: 1, createdAt: -1 });

export const StockAudit = (models.StockAudit as Model<IStockAudit>) || mongoose.model<IStockAudit>("StockAudit", StockAuditSchema);

