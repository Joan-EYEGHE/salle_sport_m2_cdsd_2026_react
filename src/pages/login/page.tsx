import { useState } from "react";
import authService from "../../services/auth.service";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const defaultPassword = 'password1234';
  const demoUsers = [
    { email: 'admin@example.com', color: 'blue', role: 'ADMIN' },
    { email: 'cashier@example.com', color: 'gray', role: 'CASHIER' },
    { email: 'controller@example.com', color: 'red', role: 'CONTROLLER' },
  ];

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const response = await authService.login(formData);
      console.log(response)
    } catch (error) {
      const errorObj = error as { message?: string }
      setErrorMessage(errorObj.message ? errorObj.message : 'Erreur lors de la connexion!')
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">

      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">

        <h1 className="text-center text-3xl font-bold text-red-600 mb-2 bg-bl">
          {'< DEV.GYM />'}
        </h1>
        <h2 className="text-xl font-bold text-center text-black mb-6">
          Connexion
        </h2>

        {errorMessage && <div className="mb-4 bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
          {errorMessage}
        </div>}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>

            <input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              type="email"
              placeholder="exemple@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>

            <div className="relative">
              <input
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                type={showPassword ? "text" : "password"}
                placeholder="********"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {!showPassword ?
                  <Eye className="w-4 h-4 cursor-pointer" /> :
                  <EyeOff className="w-4 h-4 cursor-pointer" />}
              </button>
            </div>
          </div>

          {/* bouton */}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition cursor-pointer"
          >
            Se connecter
          </button>

          {/* lien */}
          <p className="text-center text-sm text-gray-600">
            Mot de passe oublié ?
          </p>

        </form>

        <div className="mt-8">
          <p className="text-center text-sm text-gray-500 mb-4">
            Comptes de démonstration
          </p>

          <div className="grid grid-cols-1 gap-3">

            {/* ADMIN */}
            {demoUsers.map(user => (
              <button
                key={user.email}
                onClick={() => { setFormData({ email: user.email, password: defaultPassword }) }}
                className={`p-3 rounded-lg text-center bg-${user.color}-100 border border-${user.color}-300 cursor-pointer hover:shadow`}>
                <p className={`text-sm font-bold text-${user.color}-700`}>
                  {user.role}
                </p>
                <p className={`text-xs text-${user.color}-600`}>
                  {user.email}
                </p>
              </button>
            ))}


          </div>
        </div>


      </div>

    </div>
  );
}