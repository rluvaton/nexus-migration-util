import {_getFileNameFromPath} from './';

describe('Download', () => {
    describe('#_getFileNameFromPath', () => {
        it('should return the last portion of the file path', () => {
           const filePath = 'pool/universe/c/containerd/containerd_1.3.3-0ubuntu1~18.04.2_amd64.deb';

           expect(_getFileNameFromPath(filePath)).toEqual('containerd_1.3.3-0ubuntu1~18.04.2_amd64.deb');
        });
    });
});
