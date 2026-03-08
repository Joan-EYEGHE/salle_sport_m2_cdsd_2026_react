import { API_ENDPOINTS } from "../config/api";
import apiService from "./api.service";
import type { UserRole } from "./auth.service";


export interface PaginateResponseType<T> {
    success: boolean,
    data: {
        items: T[],
        total: number,
        page: number,
        limit: number,
        totalPages: number
    }
}

export interface User {
    id: string;
    fullName: string;
    passwordHash: string;
    email: string;
    role: UserRole;
    createdAt?: string;
    updatedAt?: string;
    firstConnection?: boolean;
    isActive: boolean
}
export interface CreateUserDto {
    fullName: string;
    email: string;
    password: string;
    role: UserRole
}

class UserService {
    async getAll(filters: any = {}): Promise<PaginateResponseType<User>> {
        return apiService.get<PaginateResponseType<User>>(API_ENDPOINTS.users.list, { ...filters })
    }
}

const usersService = new UserService();
export default usersService;