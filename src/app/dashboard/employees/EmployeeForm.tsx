"use client";
import { useMemo, useState } from "react";

type EmployeeFormValues = {
  name: string;
  department: "Cleaning" | "Management" | "Electicity";
  age?: number;
  gender?: "Male" | "Female" | "Other";
  phoneNumber?: string;
  address?: string;
  pincode?: string;
  idProofType?: "Aadhar" | "PAN" | "Rasgan Card" | "Voter Id";
  idProofNumber?: string;
  idProofPhotos: string[]; // base64
  dateOfJoining?: string; // ISO
  bankDetail?: { name?: string; ifscCode?: string; accountNumber?: string; passbookPhoto?: string };
  photo?: string; // base64
  email?: string; // required if Management
};

async function fileToBase64Compressed(file: File, maxBytes = 200 * 1024): Promise<string> {
  // load image
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  // Keep original size; browser will compress via quality
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  let quality = 0.92;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length * 0.75 > maxBytes && quality > 0.4) {
    quality -= 0.07;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  return result;
}

export default function EmployeeForm({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const [values, setValues] = useState<EmployeeFormValues>({
    name: "",
    department: "Cleaning",
    idProofPhotos: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [managerCreds, setManagerCreds] = useState<{ email: string; password: string } | null>(null);

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!values.name) missing.push("Name");
    if (!values.department) missing.push("Department");
    if (!values.idProofPhotos || values.idProofPhotos.length < 2) missing.push("Min 2 ID photos");
    return missing;
  }, [values]);

  function update<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handlePhotoChange(files: FileList | null, multi: boolean, field: "photo" | "idProofPhotos") {
    if (!files) return;
    const arr = Array.from(files);
    const b64s = await Promise.all(arr.map((f) => fileToBase64Compressed(f)));
    if (field === "photo") {
      update("photo", b64s[0]);
    } else {
      update("idProofPhotos", multi ? [...(values.idProofPhotos || []), ...b64s] : b64s.slice(0, 2));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    if (requiredMissing.length) {
      setSaving(false);
      setError(`Please complete: ${requiredMissing.join(", ")}`);
      return;
    }
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, createUser: values.department === "Management" && Boolean(values.email) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess(`Employee created with code ${data.employeeCode}`);
      onSuccess?.(data.id);
      if (data.managerCredentials) setManagerCreds(data.managerCredentials);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      {success ? <p className="text-green-600 text-sm">{success}</p> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input disabled={saving} placeholder="Full name" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.name} onChange={(e) => update("name", e.target.value)} required />
        </div>
        {values.department === "Management" ? (
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Manager Email</label>
            <input disabled={saving} type="email" placeholder="manager@example.com" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.email || ""} onChange={(e) => update("email", e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Required for Management to create login credentials.</p>
          </div>
        ) : null}
        <div>
          <label className="text-sm font-medium">Department</label>
          <select disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.department} onChange={(e) => update("department", e.target.value as any)}>
            <option>Cleaning</option>
            <option>Management</option>
            <option>Electicity</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Age</label>
          <input disabled={saving} type="number" min={14} max={100} placeholder="Age" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.age || ""} onChange={(e) => update("age", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-sm font-medium">Gender</label>
          <select disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.gender || ""} onChange={(e) => update("gender", e.target.value as any)}>
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Phone Number</label>
          <input disabled={saving} inputMode="tel" pattern="[0-9]{10}" placeholder="10-digit number" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.phoneNumber || ""} onChange={(e) => update("phoneNumber", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Pincode</label>
          <input disabled={saving} inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit pincode" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.pincode || ""} onChange={(e) => update("pincode", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Address</label>
          <input disabled={saving} placeholder="Street, area, city" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.address || ""} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">ID Proof Type</label>
          <select disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.idProofType || ""} onChange={(e) => update("idProofType", e.target.value as any)}>
            <option value="">Select</option>
            <option>Aadhar</option>
            <option>PAN</option>
            <option>Rasgan Card</option>
            <option>Voter Id</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">ID Proof Number</label>
          <input disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.idProofNumber || ""} onChange={(e) => update("idProofNumber", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">ID Proof Photos (min 2)</label>
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,_minmax(96px,_1fr))] gap-3">
            {(values.idProofPhotos || []).map((b64, i) => (
              <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border bg-white shadow-sm group">
                <img src={b64} className="h-full w-full object-cover" />
                <button type="button" onClick={() => update("idProofPhotos", values.idProofPhotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 border rounded-md p-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            <label className="h-24 w-24 border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center text-purple-600 cursor-pointer hover:border-purple-400 hover:bg-purple-50">
              <input disabled={saving} className="hidden" type="file" accept="image/*" multiple onChange={(e) => handlePhotoChange(e.target.files, true, "idProofPhotos")} />
              <span className="flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Add
              </span>
            </label>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Date of Joining</label>
          <input disabled={saving} type="date" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.dateOfJoining || ""} onChange={(e) => update("dateOfJoining", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Bank Name</label>
          <input disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.bankDetail?.name || ""} onChange={(e) => update("bankDetail", { ...values.bankDetail, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">IFSC Code</label>
          <input disabled={saving} className="w-full border rounded-lg px-3 py-2 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.bankDetail?.ifscCode || ""} onChange={(e) => update("bankDetail", { ...values.bankDetail, ifscCode: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className="text-sm font-medium">Account Number</label>
          <input disabled={saving} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" value={values.bankDetail?.accountNumber || ""} onChange={(e) => update("bankDetail", { ...values.bankDetail, accountNumber: e.target.value })} />
        </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Passbook/Cancelled Cheque Photo</label>
        <div className="mt-2">
          {values.bankDetail?.passbookPhoto ? (
            <div className="h-28 w-48 rounded-xl overflow-hidden border bg-white shadow-sm relative">
              <img src={values.bankDetail.passbookPhoto} className="h-full w-full object-cover" />
              <label className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center text-white cursor-pointer transition">
                <input disabled={saving} className="hidden" type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const b64 = await fileToBase64Compressed(f);
                  update("bankDetail", { ...values.bankDetail, passbookPhoto: b64 });
                }} />
                <span className="px-2 py-1 text-xs bg-white/20 rounded">Change</span>
              </label>
            </div>
          ) : (
            <label className="h-28 w-48 border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center text-purple-600 cursor-pointer hover:border-purple-400 hover:bg-purple-50">
              <input disabled={saving} className="hidden" type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const b64 = await fileToBase64Compressed(f);
                update("bankDetail", { ...values.bankDetail, passbookPhoto: b64 });
              }} />
              <span className="flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Add
              </span>
            </label>
          )}
        </div>
      </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Photo</label>
          <div className="mt-2">
            {values.photo ? (
              <div className="h-28 w-28 rounded-xl overflow-hidden border bg-white shadow-sm relative">
                <img src={values.photo} className="h-full w-full object-cover" />
                <label className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center text-white cursor-pointer transition">
                  <input disabled={saving} className="hidden" type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files, false, "photo")} />
                  <span className="px-2 py-1 text-xs bg-white/20 rounded">Change</span>
                </label>
              </div>
            ) : (
              <label className="h-28 w-28 border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center text-purple-600 cursor-pointer hover:border-purple-400 hover:bg-purple-50">
                <input disabled={saving} className="hidden" type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files, false, "photo")} />
                <span className="flex items-center gap-1 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                  </svg>
                  Add
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={saving} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          {saving ? "Saving..." : "Save Employee"}
        </button>
        <span className="text-xs text-gray-500">Employee code will be generated automatically</span>
      </div>
      {managerCreds ? (
        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
          <div className="font-semibold text-purple-800 mb-2">Manager Credentials</div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div>
              <div><span className="text-gray-500">Email:</span> {managerCreds.email}</div>
              <div className="mt-1"><span className="text-gray-500">Password:</span> {managerCreds.password}</div>
            </div>
            <button type="button" className="px-3 py-1.5 rounded border border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => navigator.clipboard.writeText(`Email: ${managerCreds.email}\nPassword: ${managerCreds.password}`)}>
              Copy
            </button>
          </div>
          <p className="text-xs text-purple-700 mt-2">Share these with the manager securely. They should change password after first login.</p>
        </div>
      ) : null}
    </form>
  );
}


