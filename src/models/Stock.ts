import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IStock extends Document {
  name: string;
  quantity: number;
  unit?: string; // e.g., "kg", "liters", "pieces", "boxes"
  description?: string;
  minThreshold?: number; // Alert when quantity falls below this
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: "pieces" },
    description: { type: String, trim: true },
    minThreshold: { type: Number, min: 0 },
  },
  { timestamps: true }
);

StockSchema.index({ name: 1 });

export const Stock = (models.Stock as Model<IStock>) || mongoose.model<IStock>("Stock", StockSchema);

