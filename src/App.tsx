import { Route, Switch } from 'wouter';
import { CartProvider } from './context/CartContext';
import Nav from './components/Nav';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Bookings from './pages/Bookings';
import CheckoutSuccess from './pages/CheckoutSuccess';
import NewArrivals from './pages/NewArrivals';
import Membership from './pages/Membership';
import Events from './pages/Events';
import Social from './pages/Social';

export default function App() {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/new-arrivals" component={NewArrivals} />
            <Route path="/products/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/bookings" component={Bookings} />
            <Route path="/membership" component={Membership} />
            <Route path="/events" component={Events} />
            <Route path="/social" component={Social} />
            <Route path="/checkout/success" component={CheckoutSuccess} />
            <Route>
              <div className="max-w-xl mx-auto py-32 px-4 text-center">
                <h1 className="text-3xl font-bold mb-2">Page not found</h1>
                <a href="/" className="text-sm underline">Back to home</a>
              </div>
            </Route>
          </Switch>
        </main>
        <footer className="border-t py-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} My Store. Powered by Gentry Commerce.
        </footer>
      </div>
    </CartProvider>
  );
}
