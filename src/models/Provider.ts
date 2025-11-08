import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IProviderMember {
  name: string;
  phoneNumber?: string;
  isHead?: boolean;
}

export interface IProvider extends Document {
  name: string;
  service: mongoose.Types.ObjectId;
  members: IProviderMember[];
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderMemberSchema = new Schema<IProviderMember>({
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String },
  isHead: { type: Boolean, default: false },
});

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true, trim: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    members: { type: [ProviderMemberSchema], default: [] },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export const Provider = (models.Provider as Model<IProvider>) || mongoose.model<IProvider>("Provider", ProviderSchema);


