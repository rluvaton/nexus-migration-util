// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SwaggerClient from 'swagger-client';

const clientsInstance = {};

export const getNexus = async (url, {user, pass} = {}) => {
    if (!clientsInstance[url]) {
        clientsInstance[url] = await SwaggerClient({
                url: url + '/service/rest/swagger.json',
                requestInterceptor: req => {
                    if (!user || !pass) {
                        return;
                    }
                    if (!req.headers) {
                        req.headers = {};
                    }

                    // Because in the swagger specification (at least for version 3.29.2-02)
                    // there is no securitySchemes for the requests we manually adding the authentication
                    req.headers.Authorization = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64')
                }
            }
        );
    }

    return clientsInstance[url].apis;
}
