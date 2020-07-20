import {exec} from 'child_process';

const curl = (curlArgs) => new Promise((resolve, reject) =>
    exec('curl ' + curlArgs, (error, stdout, stderr) => error ? reject(error) : resolve(stdout.toString()))
);

export default curl;
