// auth.d.ts
declare module '#auth-utils' {
    interface User {
        id: string
        email: string
        firstname: string
        lastname: string
    }

    interface UserSession {
        // Add your own fields
    }
}

export { }