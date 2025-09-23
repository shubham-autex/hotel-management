import mongoose, { Schema, Document, Model } from "mongoose";

export const DEPARTMENTS = ["Cleaning", "Management", "Electicity"] as const;
export type Department = typeof DEPARTMENTS[number];

export const ID_PROOF_TYPES = ["Aadhar", "PAN", "Rasgan Card", "Voter Id"] as const;
export type IdProofType = typeof ID_PROOF_TYPES[number];

export interface IEmployee extends Document {
  name: string;
  employeeCode: string; // E001, E002 etc
  department: Department;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  isActive: boolean;
  phoneNumber?: string;
  address?: string;
  pincode?: string;
  idProofType?: IdProofType;
  idProofNumber?: string;
  idProofPhotos?: string[]; // base64 strings
  dateOfJoining?: Date;
  bankDetail?: {
    name?: string;
    ifscCode?: string;
    accountNumber?: string;
    passbookPhoto?: string; // base64
  };
  photo?: string; // base64 avatar
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, unique: true, match: /^[A-Z][0-9]{3}$/ },
    department: { type: String, enum: DEPARTMENTS, required: true },
    age: { type: Number },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    isActive: { type: Boolean, default: true },
    phoneNumber: { type: String },
    address: { type: String },
    pincode: { type: String },
    idProofType: { type: String, enum: ID_PROOF_TYPES },
    idProofNumber: { type: String },
    idProofPhotos: { type: [String], default: [] },
    dateOfJoining: { type: Date },
    bankDetail: {
      name: { type: String },
      ifscCode: { type: String },
      accountNumber: { type: String },
      passbookPhoto: { type: String },
    },
    photo: { type: String },
  },
  { timestamps: true }
);

export const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

export async function generateNextEmployeeCode(): Promise<string> {
  // Pattern E001, E002 ... up to E999 then roll to A??? if needed
  // We will keep prefix constant 'E' for simplicity per spec
  const last = await Employee.findOne({ employeeCode: /^E\d{3}$/ }).sort({ employeeCode: -1 }).lean();
  const lastNum = last ? parseInt(last.employeeCode.slice(1), 10) : 0;
  const nextNum = Math.min(lastNum + 1, 999);
  const code = `E${String(nextNum).padStart(3, "0")}`;
  return code;
}


