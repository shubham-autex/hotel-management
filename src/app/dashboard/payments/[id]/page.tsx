import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { PaymentLog } from "@/models/PaymentLog";
import { DollarSign, ArrowLeft, ArrowDownRight, ArrowUpRight, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import PaymentLogsClient from "./PaymentLogsClient";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload || payload.role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Only admins can view payments.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const payment = await Payment.findById(id).lean();

  if (!payment) {
    return <div className="p-4">Payment not found</div>;
  }

  const logs = await PaymentLog.find({ paymentId: id })
    .sort({ date: -1 })
    .lean();

  const formatFrequency = (freq?: string) => {
    if (!freq) return "";
    const map: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      half_yearly: "6-Monthly",
      yearly: "Yearly",
    };
    return map[freq] || freq;
  };

  const totalReceived = logs
    .filter((log: any) => log.type === "received")
    .reduce((sum: number, log: any) => sum + (log.amount || 0), 0);
  const totalSent = logs
    .filter((log: any) => log.type === "sent")
    .reduce((sum: number, log: any) => sum + (log.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/payments/list"
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Payment Details</h2>
          <p className="text-gray-500 mt-1">View payment information and transaction logs</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Information */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              payment.direction === "received" ? "bg-green-100" : "bg-red-100"
            }`}>
              {payment.direction === "received" ? (
                <ArrowDownRight className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowUpRight className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{payment.name}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 ${
                payment.direction === "received"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}>
                {payment.direction === "received" ? "Received" : "Sent"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{payment.amount.toFixed(2)}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
              <p className="text-lg font-semibold text-gray-700 mt-1">
                {payment.type === "one_time" ? "One Time" : formatFrequency(payment.frequency)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</label>
              <p className="text-sm text-gray-700 mt-1">
                {formatDateDDMMYYYY(payment.startDate)}
              </p>
            </div>

            {payment.endDate && (
              <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</label>
              <p className="text-sm text-gray-700 mt-1">
                {formatDateDDMMYYYY(payment.endDate)}
              </p>
            </div>
            )}

            {payment.description && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                <p className="text-sm text-gray-700 mt-1">{payment.description}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
              <p className="mt-1">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                  payment.isActive
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}>
                  {payment.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/payments/${id}/edit`}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
                >
                  Edit Payment
                </Link>
                <Link
                  href="/dashboard/payments/list"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Logs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Transaction Logs</h3>
            </div>
            <Link
              href={`/dashboard/payments/${id}/logs/add`}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Log
            </Link>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Received</p>
              <p className="text-lg font-bold text-green-900 mt-1">₹{totalReceived.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Total Sent</p>
              <p className="text-lg font-bold text-red-900 mt-1">₹{totalSent.toFixed(2)}</p>
            </div>
          </div>

          <PaymentLogsClient paymentId={id} initialLogs={JSON.parse(JSON.stringify(logs))} />
        </div>
      </div>
    </div>
  );
}

