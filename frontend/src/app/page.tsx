import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🎫 Tickr
        </h1>
        <p className="text-3xl font-semibold text-gray-800 mb-4">
          Billetterie en Ligne
        </p>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Réservez vos billets pour les meilleurs événements en Tunisie.
          Concerts, festivals, spectacles et bien plus encore.
        </p>
        
        <div className="flex gap-6 justify-center mb-16">
          <Link
            href="/events"
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Découvrir les événements
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white text-gray-800 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-gray-200 shadow-lg hover:shadow-xl"
          >
            Se connecter
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">Concerts</h3>
            <p className="text-gray-600">
              Les meilleurs concerts de musique live
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-2">Spectacles</h3>
            <p className="text-gray-600">
              Théâtre, comédie et arts vivants
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎪</div>
            <h3 className="text-xl font-semibold mb-2">Festivals</h3>
            <p className="text-gray-600">
              Les plus grands festivals de Tunisie
            </p>
          </div>
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>Plateforme de billetterie moderne et sécurisée</p>
          <p className="mt-2">Powered by Next.js 16 • React 19 • TypeScript</p>
        </div>
      </div>
    </main>
  );
}
