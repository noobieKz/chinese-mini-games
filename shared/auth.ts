export type Teacher = { id: string; email: string; name: string };
export type AuthView = { teacher: Teacher | null; clientId: string | null; csrfToken?: string };
