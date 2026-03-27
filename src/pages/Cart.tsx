import { useLocation } from 'wouter';
import { useCart } from '../context/CartContext';
import { createCheckout } from '../api';

export default function Cart() {
  const { items, remove, updateQty, clear } = useCart();
  const [, navigate] = useLocation();

  // Cart stores price as a dollar-string (e.g. "29.99")
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    try {
      const result = await createCheckout(
        items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      );
      clear();
      window.location.href = result.url;
    } catch {
      alert('Checkout failed. Please try again.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-32 px-4 text-center">
        <p className="text-2xl font-bold mb-2">Your cart is empty</p>
        <a href="/" className="text-sm underline text-gray-500">Continue shopping</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Your Cart</h1>
      <div className="space-y-4">
        {items.map(item => (
          <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex gap-4 items-center border-b pb-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug">{item.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.productId, item.variantId, item.quantity - 1)} className="w-8 h-8 border rounded-lg flex items-center justify-center hover:bg-gray-100">−</button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button onClick={() => updateQty(item.productId, item.variantId, item.quantity + 1)} className="w-8 h-8 border rounded-lg flex items-center justify-center hover:bg-gray-100">+</button>
            </div>
            <button onClick={() => remove(item.productId, item.variantId)} className="text-gray-400 hover:text-red-500 transition-colors text-lg ml-2">✕</button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Subtotal</p>
          <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
        </div>
        <button
          onClick={handleCheckout}
          className="bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Checkout →
        </button>
      </div>
    </div>
  );
}
