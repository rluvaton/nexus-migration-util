// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SwaggerClient from 'swagger-client';

const clientsInstance = {};

export const getNexus = async (url) => {
    if(!clientsInstance[url]) {
        clientsInstance[url] = await SwaggerClient(url + '/service/rest/swagger.json');
    }

    return clientsInstance[url].apis;
}
