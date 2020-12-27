
import fs from 'fs';
import axios from 'axios';
import ProgressBar from 'progress';
import {noop} from '../constants';
import FormData from 'form-data';

import concat from 'concat-stream';

export async function downloadFile(url, destPath, doneCb = noop) {
    console.debug('Connecting …')
    const {data, headers} = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const totalLength = headers['content-length'];
    if(!totalLength) {
        debugger;
    }
    console.log(totalLength)

    console.debug('Start downloading')
    const progressBar = new ProgressBar('-> downloading [:bar] :percent :etas', {
        width: 40,
        complete: '=',
        incomplete: ' ',
        renderThrottle: 1,
        total: parseInt(totalLength)
    })

    const writer = fs.createWriteStream(destPath)

    data.on('data', (chunk) => progressBar.tick(chunk.length))
    data.pipe(writer)
    data.on('end', doneCb);
}

export async function uploadFile({method, url, username, password, formDataAppend}) {
    return new Promise((resolve, reject) => {

        let usedPromise = false;
        const fd = new FormData()

        Object.entries(formDataAppend).forEach(([key, value]) => {
            fd.append(key, value);
        });
        fd.pipe(concat({encoding: 'buffer'}, data => {
            axios({
                method,
                url,
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
                    ...fd.getHeaders()
                },
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
                data: data
            }).then((response) => {
                usedPromise = true;
                resolve(response);
            }).catch(err => {
                usedPromise = true;
                reject(err);
            });
        }));

        fd.on("finish", () => !usedPromise && resolve());
        fd.on("error", (err) => !usedPromise && reject(err));
    });
}
