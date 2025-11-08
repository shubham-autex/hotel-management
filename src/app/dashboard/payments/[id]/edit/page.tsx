import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import EditPaymentClient from "./EditPaymentClient";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload || payload.role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Only admins can edit payments.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const payment = await Payment.findById(id).lean();

  if (!payment) {
    return <div className="p-4">Payment not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Payment</h2>
        <p className="text-gray-500">Update payment details</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-8 shadow-sm">
        <EditPaymentClient payment={JSON.parse(JSON.stringify(payment))} />
      </div>
    </div>
  );
}

