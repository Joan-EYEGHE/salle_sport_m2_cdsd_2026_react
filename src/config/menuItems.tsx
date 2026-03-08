import { Dumbbell, LayoutDashboard, Settings, ShieldUser, Ticket, UsersRound } from "lucide-react";



export const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", path: "/clients", icon: UsersRound },
    { name: "Utilisateurs", path: "/users", icon: Settings },
    { name: "Activités", path: "/activities", icon: Dumbbell },
    { name: "Billeteries", path: "/tickets", icon: Ticket },
    { name: "Rôles", path: "/roles", icon: ShieldUser },
];