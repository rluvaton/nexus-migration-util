import * as fs from 'fs';
import makeDir from 'make-dir';

export const readFile = (path) => new Promise((resolve, reject) =>
    fs.readFile(path, (err, data) => err ? reject(err) : resolve(data.toString()))
);

export const isExistsSync = (path) => fs.existsSync(path);

export const writeFile = (path, content) => new Promise((resolve, reject) =>
    fs.writeFile(path, content, (err) => err ? reject(err) : resolve())
);

export const createDirectory = async (path) => {
    return makeDir(path);
}
