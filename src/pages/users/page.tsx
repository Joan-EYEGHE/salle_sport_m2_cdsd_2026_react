import { useEffect, useState } from "react";
import usersService, { type User } from "../../services/users.service"

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [filteredUsers] = useState<User[]>([]);
  const [statusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  let i =0;
  const getUsers = async (filters:any={}) => {
    console.log(i++)
    try {
      const response = await usersService.getAll(filters);
      setPaginatedUsers(response.data.items);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getUsers({search:search});
  },[search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    setSearch(e.target.value);
  }
  const handleFilterChange = (_type:string)=>{}
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Utilisateurs</h2>
          <p className="text-sm text-gray-500">
            Gérer les comptes utilisateurs de la salle de sport
          </p>
        </div>

        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition">
          + Ajouter un utilisateur
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={(e)=>handleSearchChange(e)}
              placeholder="Rechercher par nom, email ou rôle..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* FILTER */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "ALL"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Tous
            </button>

            <button
              onClick={() => handleFilterChange("ACTIVE")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "ACTIVE"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Actifs
            </button>

            <button
              onClick={() => handleFilterChange("DISABLED")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "DISABLED"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Désactivés
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Nom complet</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Rôle</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Statut</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-500">ID: #{user.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {user.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center">
                          <i className="ri-eye-line text-gray-700"></i>
                        </button>
                        <button className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center">
                          <i className="ri-pencil-line text-gray-700"></i>
                        </button>
                        <button className="w-9 h-9 rounded-lg border border-red-200 hover:bg-red-50 flex items-center justify-center">
                          <i className="ri-delete-bin-line text-red-600"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER / PAGINATION */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-4 bg-white">
          <p className="text-sm text-gray-500">
            Affichage de{" "}
            <span className="font-semibold text-gray-800">{paginatedUsers.length}</span> sur{" "}
            <span className="font-semibold text-gray-800">{filteredUsers.length}</span> utilisateur(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>

            {Array.from({ length: totalPages || 1 }).map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium ${currentPage === page
                      ? "bg-red-600 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
