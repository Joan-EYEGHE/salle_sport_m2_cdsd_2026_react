import { useNavigate } from "react-router-dom"

export default function Hero() {
    const navigate = useNavigate();
    return (
        <section className="text-center py-24 px-6 bg-black text-white">
            <h1 className="text-4xl font-bold mb-4">
                Gestion de Salle de Sport
            </h1>

            <p className="text-gray-300 max-w-xl mx-auto mb-8">
                Gérez facilement vos membres, abonnements et activités
                depuis une seule application.
            </p>

            <button onClick={() => navigate('/login')} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold cursor-pointer">
                Se connecter
            </button>
        </section>
    )
}
