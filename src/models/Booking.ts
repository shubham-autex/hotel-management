import mongoose, { Schema, Document, Model, models } from "mongoose";

export type BookingItemPriceType = "per_unit" | "fixed" | "custom" | "per_hour";

export interface IBookingItem {
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  allowOverlap: boolean;
  variantName?: string;
  priceType: BookingItemPriceType;
  unitPrice?: number; // for per_unit and fixed
  units?: number; // for per_unit
  customPrice?: number; // for custom
  discountAmount?: number; // line-level discount amount
  total: number; // computed line total after discount
}

export interface IBooking extends Document {
  customerName: string;
  customerPhone?: string;
  eventName: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  items: IBookingItem[];
  subtotal: number;
  discountAmount?: number; // booking-level discount if no line discounts used
  total: number;
  notes?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingItemSchema = new Schema<IBookingItem>({
  serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
  serviceName: { type: String, required: true },
  allowOverlap: { type: Boolean, required: true },
  variantName: { type: String },
  priceType: { type: String, enum: ["per_unit", "fixed", "custom", "per_hour"], required: true },
  unitPrice: { type: Number, min: 0 },
  units: { type: Number, min: 0 },
  customPrice: { type: Number, min: 0 },
  discountAmount: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, required: true },
});

const BookingSchema = new Schema<IBooking>(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    eventName: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    items: { type: [BookingItemSchema], default: [] },
    subtotal: { type: Number, min: 0, required: true },
    discountAmount: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, required: true },
    notes: { type: String, trim: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ startAt: 1, endAt: 1 });

export const Booking = (models.Booking as Model<IBooking>) || mongoose.model<IBooking>("Booking", BookingSchema);


