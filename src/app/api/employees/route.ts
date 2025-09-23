import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Employee, DEPARTMENTS, ID_PROOF_TYPES, generateNextEmployeeCode } from "@/models/Employee";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import crypto from "crypto";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const bankSchema = z.object({
  name: z.string().optional(),
  ifscCode: z.string().optional(),
  accountNumber: z.string().optional(),
  passbookPhoto: z.string().optional(),
}).optional();

const bodySchema = z.object({
  name: z.string().min(1),
  department: z.enum(DEPARTMENTS as unknown as ["Cleaning","Management","Electicity"]),
  age: z.number().int().min(14).max(100).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  isActive: z.boolean().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  idProofType: z.enum(ID_PROOF_TYPES as unknown as ["Aadhar","PAN","Rasgan Card","Voter Id"]).optional(),
  idProofNumber: z.string().optional(),
  idProofPhotos: z.array(z.string()).min(2).optional(),
  dateOfJoining: z.coerce.date().optional(),
  bankDetail: bankSchema,
  photo: z.string().optional(),
  email: z.string().email().optional(),
  createUser: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // simple auth check
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const data = bodySchema.parse(json);

    const employeeCode = await generateNextEmployeeCode();

    const created = await Employee.create({
      ...data,
      employeeCode,
      dateOfJoining: data.dateOfJoining,
      isActive: data.isActive ?? true,
    });

    let managerCredentials: { email?: string; password: string } | undefined;
    const shouldCreateUser = data.department === "Management" && data.email && (data.createUser ?? true);
    if (shouldCreateUser) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        return NextResponse.json({ error: "Email already exists for a user" }, { status: 409 });
      }
      const password = crypto.randomBytes(12).toString("base64url").slice(0, 12);
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({ email: data.email, passwordHash, role: "manager" });
      managerCredentials = { email: data.email, password };
    }

    return NextResponse.json({ id: created.id, employeeCode, managerCredentials });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);
    const department = searchParams.get("department") || undefined;
    const q = searchParams.get("q") || undefined;

    const filter: any = {};
    if (department) filter.department = department;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { employeeCode: { $regex: q, $options: "i" } },
        { phoneNumber: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Employee.find(filter, { name: 1, employeeCode: 1, department: 1, phoneNumber: 1, photo: 1, isActive: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


