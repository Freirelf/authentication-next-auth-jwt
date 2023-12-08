import { AuthTokenError } from "@/services/errors/AuthTokenError"
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { destroyCookie, parseCookies } from "nookies"
import { jwtDecode } from "jwt-decode";
import { validateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
  permissions?: string[],
  roles?: string[],
}

export function withSSRAuth<P extends { [key: string]: any}>(
    fn: GetServerSideProps<P>, 
    options?: WithSSRAuthOptions
  ){ 
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context)
    const token = cookies['nextAuth.token']

    if(!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        }
      }
    }

    if (options) {
      const user = jwtDecode<{permissions: string[], roles: string[],}>(token)

      const { permissions, roles} = options || {};
  
      const userHasValidPermissions = validateUserPermissions({ user, permissions, roles})

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false,
          }
        }
      }
    }

    try {
      return await Promise.resolve(fn(context))
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(context, 'nextAuth.token')
        destroyCookie(context, 'nextAuth.refreshToken')
  
        return {
        redirect: {
          destination: '/',
          permanent: false,
         }
        }
      }

      throw err;
    }
  }
}

