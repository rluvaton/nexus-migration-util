import * as fs from 'fs';
import glob from 'glob';
import makeDir from 'make-dir';

export const readFile = (path) => new Promise((resolve, reject) =>
    fs.readFile(path, (err, data) => err ? reject(err) : resolve(data.toString()))
);

export const isExistsSync = (path) => fs.existsSync(path);

export const getFiles = (cwd, pattern) => new Promise((resolve, reject) =>
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    glob(pattern, { cwd }, (err, files) => err ? reject(err) : resolve(files))
);


export const writeFile = (path, content) => new Promise((resolve, reject) =>
    fs.writeFile(path, content, (err) => err ? reject(err) : resolve())
);

export const createDirectory = async (path) => {
    console.log(makeDir);
    return makeDir(path);
}
