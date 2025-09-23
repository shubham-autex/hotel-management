import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: string;
  type: "received" | "refund";
  amount: number;
  mode: "cash" | "online";
  images: string[]; // store URLs or file IDs
  notes?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ["received", "refund"], required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["cash", "online"], required: true },
    images: { type: [String], validate: [(arr: string[]) => arr && arr.length >= 1, "At least 1 image is required"], required: true },
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Payment = (models.Payment as Model<IPayment>) || mongoose.model<IPayment>("Payment", PaymentSchema);


