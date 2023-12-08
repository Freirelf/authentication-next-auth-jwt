import { ReactNode, createContext, useEffect, useState } from "react";
import Router from "next/router";

import { api } from "@/services/apiClient";

import { setCookie, parseCookies, destroyCookie } from "nookies"


type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthProviderProps = {
  children: ReactNode;
}

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  user: User;
  isAuthenticated: boolean;
};

export const AuthContext = createContext({} as AuthContextData)

let authChannel:  BroadcastChannel;

export function signOut() {
  destroyCookie(undefined, 'nextAuth.token')
  destroyCookie(undefined, 'nextAuth.refreshToken')

  authChannel.postMessage('signOut');

  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser ] = useState<User | undefined>()
  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel('auth');

    authChannel.onmessage = (message) => {
      console.log(message);
    }
  }, [])

  useEffect(() => {
    const {'nextAuth.token': token} = parseCookies();

    if(token) {
      api.get('/me').then(response => {
        const { email, permissions, roles } = response.data;

        setUser({email, permissions, roles})
      })
      .catch(() => {
        signOut();
      })  

    }

  }, [])
  
  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,

      })
      
      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, 'nextAuth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      })

      setCookie(undefined, 'nextAuth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      })

      setUser({
        email,
        permissions,
        roles,
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`

      Router.push('/dashboard')
    } catch (err) {

    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user, signOut}}>
      { children }
    </AuthContext.Provider>
  )

}