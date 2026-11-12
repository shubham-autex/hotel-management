import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createEmployee, generateNextEmployeeCode, listEmployees } from "@/db/employees";
import { createUser, findUserByEmail } from "@/db/users";
import { DEPARTMENTS, ID_PROOF_TYPES } from "@/lib/constants/employee";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const bankSchema = z
  .object({
    name: z.string().optional(),
    ifscCode: z.string().optional(),
    accountNumber: z.string().optional(),
    passbookPhoto: z.string().optional(),
  })
  .optional();

const bodySchema = z.object({
  name: z.string().min(1),
  department: z.enum(DEPARTMENTS),
  age: z.number().int().min(14).max(100).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  isActive: z.boolean().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  idProofType: z.enum(ID_PROOF_TYPES).optional(),
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

    const shouldCreateUser = data.department === "Management" && data.email && (data.createUser ?? true);
    if (shouldCreateUser && data.email) {
      const existing = await findUserByEmail(data.email);
      if (existing) {
        return NextResponse.json({ error: "Email already exists for a user" }, { status: 409 });
      }
    }

    const employeeCode = await generateNextEmployeeCode();
    const created = await createEmployee({
      name: data.name,
      employeeCode,
      department: data.department,
      age: data.age,
      gender: data.gender,
      isActive: data.isActive ?? true,
      phoneNumber: data.phoneNumber,
      address: data.address,
      pincode: data.pincode,
      idProofType: data.idProofType,
      idProofNumber: data.idProofNumber,
      idProofPhotos: data.idProofPhotos,
      dateOfJoining: data.dateOfJoining,
      bankDetail: data.bankDetail,
      photo: data.photo,
    });

    let managerCredentials: { email?: string; password: string } | undefined;
    if (shouldCreateUser && data.email) {
      const password = crypto.randomBytes(12).toString("base64url").slice(0, 12);
      const passwordHash = await bcrypt.hash(password, 10);
      await createUser({ email: data.email, passwordHash, role: "manager" });
      managerCredentials = { email: data.email, password };
    }

    return NextResponse.json({ id: created._id, employeeCode, managerCredentials });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Failed to create employee", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);
    const department = searchParams.get("department") || undefined;
    const q = searchParams.get("q") || undefined;

    const { items, total } = await listEmployees({ page, limit, department, q });
    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Failed to fetch employees", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
