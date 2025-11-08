import mongoose, { Schema, Document, Model, models } from "mongoose";

export type PaymentType = "one_time" | "recurring";
export type PaymentFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly";
export type PaymentDirection = "received" | "sent";

export interface IPayment extends Document {
  name: string;
  description?: string;
  amount: number;
  type: PaymentType;
  frequency?: PaymentFrequency; // Only for recurring payments
  direction: PaymentDirection; // received or sent
  startDate: Date;
  endDate?: Date; // For recurring payments, when it should end
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["one_time", "recurring"], required: true },
    frequency: { type: String, enum: ["monthly", "quarterly", "half_yearly", "yearly"], required: false },
    direction: { type: String, enum: ["received", "sent"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ startDate: -1 });
PaymentSchema.index({ direction: 1 });
PaymentSchema.index({ type: 1 });

export const Payment = (models.Payment as Model<IPayment>) || mongoose.model<IPayment>("Payment", PaymentSchema);
