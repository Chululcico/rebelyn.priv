import { CartProvider } from "@/components/store/cart-context";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CookieBanner } from "@/components/store/cookie-banner";
import { WelcomeModal } from "@/components/store/welcome-modal";
import { PresenceHeartbeat } from "@/components/store/presence-heartbeat";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <PresenceHeartbeat />
      <WelcomeModal />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
    </CartProvider>
  );
}
