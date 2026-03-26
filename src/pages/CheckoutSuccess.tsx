export default function CheckoutSuccess() {
  return (
    <div className="max-w-xl mx-auto py-32 px-4 text-center">
      <p className="text-4xl mb-4">🎉</p>
      <h1 className="text-3xl font-bold mb-2">Order confirmed!</h1>
      <p className="text-gray-500 mb-8">
        Thanks for your purchase. A confirmation email is on its way.
      </p>
      <a
        href="/"
        className="inline-block bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Continue shopping
      </a>
    </div>
  );
}
