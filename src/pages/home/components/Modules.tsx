import { Crown, Dumbbell, Users } from "lucide-react";
import Module from "./Module";
import type { ModuleProps } from "../../../interfaces/interfaces";

export default function Modules() {
    const modules: ModuleProps[] = [
        {
            title: "Gestion des membres",
            description: "Ajouter, modifier et suivre tous les membres de votre salle.",
            icon: Users,
        },
        {
            title: "Gestion des abonnements",
            description: "Gérez les abonnements mensuels ou annuels des membres.",
            icon: Crown,
        },
        {
            title: "Suivi des activités",
            description: "Organisez et suivez toutes les activités sportives.",
            icon: Dumbbell,
        }
    ]
    return (
        <section className="py-16 px-6">
            <h2 className="text-2xl font-bold text-center mb-12 text-gray-800">
                Fonctionnalités principales
            </h2>
            

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

                {modules.map(module => (
                    <Module title={module.title} description={module.description} icon={module.icon}/>
                ))}

            </div>
        </section>
    )
}
