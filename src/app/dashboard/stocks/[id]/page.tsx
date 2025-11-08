import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { StockAudit } from "@/models/StockAudit";
import { Package, History, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Unauthorized access. Please log in.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const stock = await Stock.findById(id).lean();
  
  if (!stock) {
    return <div className="p-4">Stock item not found</div>;
  }

  const audits = await StockAudit.find({ stockId: id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const isLowStock = (stock.quantity <= 0) || (stock.minThreshold && stock.quantity <= stock.minThreshold);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/stocks/list"
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Stock Details</h2>
          <p className="text-gray-500 mt-1">View stock item information and edit history</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Information */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{stock.name}</h3>
              {isLowStock ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200 mt-1">
                  Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800 border border-green-200 mt-1">
                  In Stock
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stock.quantity} {stock.unit || "pieces"}
              </p>
            </div>

            {stock.minThreshold !== undefined && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Min Threshold</label>
                <p className="text-lg font-semibold text-gray-700 mt-1">
                  {stock.minThreshold} {stock.unit || "pieces"}
                </p>
              </div>
            )}

            {stock.description && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                <p className="text-sm text-gray-700 mt-1">{stock.description}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                {payload.role === "admin" && (
                  <Link
                    href={`/dashboard/stocks/${id}/edit`}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
                  >
                    Edit
                  </Link>
                )}
                <Link
                  href="/dashboard/stocks/list"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Edit History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Edit History</h3>
          </div>

          {audits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No edit history available</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {audits.map((audit: any) => (
                <div key={audit._id.toString()} className="border-l-2 border-purple-200 pl-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{audit.action}</p>
                      {audit.user && (
                        <p className="text-xs text-gray-500">
                          by {audit.user.email} ({audit.user.role})
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(audit.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {audit.note && (
                    <p className="text-sm text-gray-600 mb-2">{audit.note}</p>
                  )}
                  {audit.changes && audit.changes.length > 0 && (
                    <div className="space-y-1">
                      {audit.changes.map((change: any, idx: number) => (
                        <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                          <span className="font-medium">{change.key}:</span>{" "}
                          <span className="text-red-600">{String(change.oldValue || "—")}</span> →{" "}
                          <span className="text-green-600">{String(change.newValue || "—")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

