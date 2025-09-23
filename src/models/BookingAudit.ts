import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IAuditChange {
  key: string;
  oldValue: any;
  newValue: any;
}

export interface IBookingAudit extends Document {
  bookingId: mongoose.Types.ObjectId;
  action: "created" | "updated" | "payment_received" | "refunded";
  changes: IAuditChange[];
  user?: { id: string; email: string; role?: string };
  note?: string;
  createdAt: Date;
}

const AuditChangeSchema = new Schema<IAuditChange>({
  key: { type: String, required: true },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
});

const BookingAuditSchema = new Schema<IBookingAudit>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    action: { type: String, enum: ["created", "updated", "payment_received", "refunded"], required: true },
    changes: { type: [AuditChangeSchema], default: [] },
    user: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BookingAudit = (models.BookingAudit as Model<IBookingAudit>) || mongoose.model<IBookingAudit>("BookingAudit", BookingAuditSchema);


