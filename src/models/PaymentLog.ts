import mongoose, { Schema, Document, Model, models } from "mongoose";

export type PaymentLogType = "received" | "sent";
export type PaymentMode = "cash" | "card" | "bank_transfer" | "upi" | "cheque" | "other";

export interface IPaymentLog extends Document {
  paymentId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  type: PaymentLogType;
  mode: PaymentMode;
  notes?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    type: { type: String, enum: ["received", "sent"], required: true },
    mode: { type: String, enum: ["cash", "card", "bank_transfer", "upi", "cheque", "other"], required: true, default: "cash" },
    notes: { type: String, trim: true },
    user: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
  },
  { timestamps: true }
);

PaymentLogSchema.index({ paymentId: 1, date: -1 });
PaymentLogSchema.index({ date: -1 });

export const PaymentLog = (models.PaymentLog as Model<IPaymentLog>) || mongoose.model<IPaymentLog>("PaymentLog", PaymentLogSchema);

