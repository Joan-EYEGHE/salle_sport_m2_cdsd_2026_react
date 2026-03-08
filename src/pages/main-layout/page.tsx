import { Outlet } from "react-router-dom";
import SideBar from "../../components/base/SideBar";
import NavBar from "../../components/base/NavBar";


export default function MainLayout() {

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <SideBar/>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col">
                <NavBar/>

                {/* PAGE CONTENT */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-128px)] p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}