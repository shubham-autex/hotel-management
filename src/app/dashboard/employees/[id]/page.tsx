import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";

export default async function EmployeeViewPage({ params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const { id } = await params;
  const emp = await Employee.findById(id).lean();
  if (!emp) return notFound();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200">
          {emp.photo ? <img src={emp.photo as string} className="h-20 w-20 object-cover" /> : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{emp.name}</h1>
          <p className="text-gray-500">{emp.employeeCode} • {emp.department}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white/80 backdrop-blur border border-purple-200/50 rounded-2xl p-4">
          <h2 className="font-semibold mb-2">Personal</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="text-gray-500">Phone:</span> {emp.phoneNumber || "—"}</div>
            <div><span className="text-gray-500">Age:</span> {emp.age ?? "—"}</div>
            <div><span className="text-gray-500">Gender:</span> {emp.gender || "—"}</div>
            <div><span className="text-gray-500">Date of Joining:</span> {emp.dateOfJoining ? new Date(emp.dateOfJoining as Date).toLocaleDateString() : "—"}</div>
            <div><span className="text-gray-500">Status:</span> {emp.isActive ? "Active" : "Inactive"}</div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-purple-200/50 rounded-2xl p-4">
          <h2 className="font-semibold mb-2">Address</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <div>{emp.address || "—"}</div>
            <div><span className="text-gray-500">Pincode:</span> {emp.pincode || "—"}</div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-purple-200/50 rounded-2xl p-4 sm:col-span-2">
          <h2 className="font-semibold mb-2">ID Proof</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div><span className="text-gray-500">Type:</span> {emp.idProofType || "—"}</div>
            <div><span className="text-gray-500">Number:</span> {emp.idProofNumber || "—"}</div>
            <div className="flex gap-2 flex-wrap mt-2">
              {(emp.idProofPhotos as string[] | undefined)?.map((b64, i) => (
                <img key={i} src={b64} className="h-20 w-20 rounded object-cover" />
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-purple-200/50 rounded-2xl p-4 sm:col-span-2">
          <h2 className="font-semibold mb-2">Bank</h2>
          <div className="text-sm text-gray-700 grid sm:grid-cols-3 gap-2">
            <div><span className="text-gray-500">Name:</span> {emp.bankDetail?.name || "—"}</div>
            <div><span className="text-gray-500">IFSC:</span> {emp.bankDetail?.ifscCode || "—"}</div>
            <div><span className="text-gray-500">Account:</span> {emp.bankDetail?.accountNumber || "—"}</div>
          </div>
          {emp.bankDetail?.passbookPhoto ? (
            <div className="mt-3">
              <img src={emp.bankDetail.passbookPhoto as string} className="h-32 rounded object-cover border" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


