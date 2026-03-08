
import type { ModuleProps } from "../../../interfaces/interfaces";




export default function Module({ title, description, icon: Icon }: ModuleProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 hover:shadow-lg transition text-center">
            <h3 className="text-lg font-semibold mb-3 text-black flex flex-col items-center">
                <Icon className="text-red-600 w-12 h-12" />
                {title}
            </h3>
            <p className="text-gray-600">
                {description}
            </p>
        </div>
    )
}
