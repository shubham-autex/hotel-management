import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface ICompanyProfile extends Document {
  name: string;
  address: string;
  contactPersonName: string;
  contactPhone: string;
  logo?: string; // base64 or URL
  gstin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyProfileSchema = new Schema<ICompanyProfile>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    contactPersonName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    logo: { type: String },
    gstin: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure single document by unique dummy key (optional) - or we can enforce via API
CompanyProfileSchema.index({ name: 1 });

export const CompanyProfile = (models.CompanyProfile as Model<ICompanyProfile>) || mongoose.model<ICompanyProfile>("CompanyProfile", CompanyProfileSchema);


