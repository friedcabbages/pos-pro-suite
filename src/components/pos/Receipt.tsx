import { forwardRef } from "react";
import { format } from "date-fns";
import { Business, Branch, Sale, Product } from "@/types/database";

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  stock: number;
}

interface ReceiptProps {
  business: Business | null;
  branch: Branch | null;
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  customerName?: string;
  invoiceNumber?: string;
  date?: Date;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({
    business,
    branch,
    cart,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    paymentMethod,
    paymentAmount,
    customerName,
    invoiceNumber,
    date = new Date(),
  }, ref) => {
    const formatCurrency = (value: number) => {
      const currency = business?.currency || 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
      }).format(value);
    };

    return (
      <div
        ref={ref}
        className="w-[300px] bg-white text-black p-4 font-mono text-sm"
        style={{ fontFamily: 'Courier, monospace' }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">{business?.name || "Store"}</h2>
          {branch && <p className="text-xs">{branch.name}</p>}
          {business?.address && <p className="text-xs">{business.address}</p>}
          {business?.phone && <p className="text-xs">Tel: {business.phone}</p>}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Invoice Info */}
        <div className="text-xs mb-2">
          <div className="flex justify-between">
            <span>Invoice:</span>
            <span>{invoiceNumber || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(date, "dd/MM/yyyy HH:mm")}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Items */}
        <div className="space-y-1 mb-2">
          {cart.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between">
                <span className="truncate max-w-[180px]">{item.product.name}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>
                  {item.quantity} x {formatCurrency(item.product.sell_price)}
                </span>
                <span>{formatCurrency(item.quantity * item.product.sell_price)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="border-t border-gray-400 my-1" />
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment ({paymentMethod.toUpperCase()})</span>
            <span>{formatCurrency(paymentAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change</span>
            <span>{formatCurrency(paymentAmount - total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-4" />

        {/* Footer */}
        <div className="text-center text-xs">
          <p>Thank you for your purchase!</p>
          <p className="mt-1 text-gray-500">Powered by VeloPOS</p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
