import mongoose, { Schema, Document, Model, models } from "mongoose";
import { PRICE_TYPES, type PriceType } from "@/lib/constants/service";

export interface IPricingElement {
  type: PriceType;
  price?: number; // optional for custom
}

export interface IServiceVariant {
  name: string;
  pricingElements: IPricingElement[];
}

export interface IService extends Document {
  name: string;
  description?: string;
  variants: IServiceVariant[];
  isActive: boolean;
  allowOverlap?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PricingElementSchema = new Schema<IPricingElement>({
  type: { type: String, enum: PRICE_TYPES, required: true },
  price: { type: Number, min: 0 },
});

const ServiceVariantSchema = new Schema<IServiceVariant>({
  name: { type: String, required: true, trim: true },
  pricingElements: [PricingElementSchema],
});

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    variants: [ServiceVariantSchema],
    isActive: { type: Boolean, default: true },
    allowOverlap: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Service = (models.Service as Model<IService>) || mongoose.model<IService>("Service", ServiceSchema);
