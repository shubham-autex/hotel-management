"use client";

import { useState } from "react";
import { PRICE_TYPES, type PriceType } from "@/lib/constants/service";

interface PricingElement {
  type: PriceType;
  price: number;
}

interface ServiceVariant {
  name: string;
  pricingElements: PricingElement[];
}

interface ServiceFormData {
  name: string;
  description: string;
  variants: ServiceVariant[];
  isActive: boolean;
  allowOverlap: boolean;
}

export default function ServiceForm() {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    variants: [{ name: "", pricingElements: [{ type: "per_unit", price: 0 }] }],
    isActive: true,
    allowOverlap: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { name: "", pricingElements: [{ type: "per_unit", price: 0 }] }]
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index: number, field: keyof ServiceVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => i === index ? { ...v, [field]: value } : v)
    }));
  };

  const addPricingElement = (variantIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === variantIndex 
          ? { ...v, pricingElements: [...v.pricingElements, { type: "per_unit", price: 0 }] }
          : v
      )
    }));
  };

  const removePricingElement = (variantIndex: number, elementIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === variantIndex 
          ? { ...v, pricingElements: v.pricingElements.filter((_, ei) => ei !== elementIndex) }
          : v
      )
    }));
  };

  const updatePricingElement = (variantIndex: number, elementIndex: number, field: keyof PricingElement, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === variantIndex 
          ? { 
              ...v, 
              pricingElements: v.pricingElements.map((pe, ei) => 
                ei === elementIndex ? { ...pe, [field]: value } : pe
              )
            }
          : v
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create service");
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        variants: [{ name: "", pricingElements: [{ type: "per_unit", price: 0 }] }],
        isActive: true,
        allowOverlap: false,
      });
      
      alert("Service created successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter service name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter description (optional)"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Variants</h3>
          <button
            type="button"
            onClick={addVariant}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add Variant
          </button>
        </div>

        <div className="space-y-6">
          {formData.variants.map((variant, variantIndex) => (
            <div key={variantIndex} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Variant {variantIndex + 1}</h4>
                {formData.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(variantIndex)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={variant.name}
                    onChange={(e) => updateVariant(variantIndex, "name", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter variant name"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pricing Elements
                    </label>
                    <button
                      type="button"
                      onClick={() => addPricingElement(variantIndex)}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      + Add Element
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {variant.pricingElements.map((element, elementIndex) => (
                  <div key={elementIndex} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={element.type}
                        onChange={(e) => updatePricingElement(variantIndex, elementIndex, "type", e.target.value as PriceType)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {PRICE_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                    {element.type !== "custom" && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={element.price ?? 0}
                          onChange={(e) => updatePricingElement(variantIndex, elementIndex, "price", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                    {variant.pricingElements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePricingElement(variantIndex, elementIndex)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="ml-2 text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.allowOverlap}
            onChange={(e) => setFormData(prev => ({ ...prev, allowOverlap: e.target.checked }))}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="ml-2 text-sm text-gray-700">Allow overlapping bookings</span>
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
        >
          {loading ? "Creating..." : "Create Service"}
        </button>
        <button
          type="button"
          onClick={() => setFormData({
            name: "",
            description: "",
            variants: [{ name: "", pricingElements: [{ type: "per_unit", price: 0 }] }],
            isActive: true,
            allowOverlap: false,
          })}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
