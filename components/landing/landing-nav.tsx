import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
            Y
          </span>
          <span className="font-extrabold tracking-tight">
            Yelha<span className="text-primary">Delivery</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-500 md:flex">
          <a href="#fonctionnalites" className="hover:text-[#1A1A1A]">Fonctionnalités</a>
          <a href="#comment" className="hover:text-[#1A1A1A]">Comment ça marche</a>
          <a href="#tarifs" className="hover:text-[#1A1A1A]">Tarifs</a>
          <a href="#faq" className="hover:text-[#1A1A1A]">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 md:inline-flex"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-[0_2px_10px_rgb(255,92,26,0.35)] transition-all hover:bg-primary-dark active:scale-[0.98]"
          >
            Démarrer gratuitement
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
