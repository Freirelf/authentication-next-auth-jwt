import axios, {AxiosError, AxiosRequestConfig} from "axios";
import {  parseCookies, setCookie } from "nookies"
import { signOut } from "../contexts/AuthContext";
import { GetServerSidePropsContext } from "next";
import { AuthTokenError } from "./errors/AuthTokenError";


let isRefreshing = false;
let failedRequestQueue: FailedRequest[]= [];

interface ErrorResponse {
  code: string;
}

interface FailedRequest {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
}

export function setupApiClient(context?:  GetServerSidePropsContext) {
  let cookies = parseCookies(context);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies['nextAuth.token']}`,
    }
  })
  
  api.interceptors.response.use(response => {
    return response
  }, (error: AxiosError<ErrorResponse>) => {
    if(error.response?.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        cookies = parseCookies(context);
  
        const { 'nextAuth.refreshToken': refreshToken } = cookies; 
        const originalConfig: AxiosRequestConfig = error.config || {};
  
       if(!isRefreshing) {
        isRefreshing = true;

        api.post('/refresh', {
          refreshToken, 
        }).then(response => {
          const { token } = response.data;
  
          setCookie(context, 'nextAuth.token', token, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/'
          })
    
          setCookie(context, 'nextAuth.refreshToken', response.data.refreshToken, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/'
          })
  
          api.defaults.headers['Authorization'] = `Bearer ${token}`
  
          failedRequestQueue.forEach(request => request.onSuccess(token));
          failedRequestQueue = [];
  
        }).catch(err => {
          failedRequestQueue.forEach(request => request.onFailure(err));
          failedRequestQueue = [];
  
          if(typeof window !== 'undefined') {
            signOut();
          }
        }).finally(() => {
          isRefreshing = false;
        })
       }
  
       return new Promise((resolve, reject ) => {
        failedRequestQueue.push({
          onSuccess: (token: string) => {
            originalConfig.headers = originalConfig.headers || {};
            originalConfig.headers['Authorization'] = `Bearer ${token}`
  
            resolve(api(originalConfig))
          },
          onFailure: (err: AxiosError) => {
            reject(err)
          }
        })
       })
      } else {
          if(typeof window !== 'undefined') {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError())
          }
        }
    }
  
    return Promise.reject(error);
  })

  return api; 
}