import { withSSRAuth } from "@/utils/withSSRAuth";
import { setupApiClient } from "@/services/api";
import { GetServerSidePropsContext } from "next";

export default function Metrics(){
  return (
    <>
      <h1>Metrics</h1>


    </>
  )
}

export const getServerSideProps = withSSRAuth(async (context: GetServerSidePropsContext) => {
  const apiClient = setupApiClient(context);
  const response = await apiClient.get('/me');
  
  console.log(response.data);

  return {
    props: {}
  }
}, {
  permissions: ['metrics.list'],
  roles: ['administrator'],
})