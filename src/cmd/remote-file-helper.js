import fs from 'fs';
import axios from 'axios';
import ProgressBar from 'progress';
import {noop} from '../constants';
import FormData from 'form-data';

import concat from 'concat-stream';

export async function downloadFile(url, destPath, doneCb = noop) {
    const {data, headers} = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const totalLength = headers['content-length'];
    if (!totalLength) {
        console.warn('totalLength is falsy!', {totalLength, url});
    }

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

export async function uploadFile({method, url, username, password, format, filePath, fileReadStream}) {
    return new Promise((resolve, reject) => {
        let usedPromise = false;
        const fd = new FormData();

        fd.append(`${format}.asset`, fileReadStream, {
            filepath: filePath,
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
