import * as path from 'path';
import curl from '../helper/curl';
import {createPromisePool} from '../helper/promise-pool';
import {isExistsSync, readFile, writeFile} from '../helper/files'

const parseIndexFile = async (indexFilePath) => {
    if (!indexFilePath || !(isExistsSync(indexFilePath))) {
        throw new Error('indexFilePath not exist');
    }

    const artifactsMetadataContent = await readFile(indexFilePath);
    let artifactsMetadata = JSON.parse(artifactsMetadataContent);

    artifactsMetadata = Object.keys(artifactsMetadata).map((fileName) => ({fileName, ...artifactsMetadata[fileName]}))

    return artifactsMetadata;
};

const upload = async ({
    indexFilePath,
    artifactsDirPath,
    nexusUrl,
    nexusUser,
    nexusPassword
} = {}) => {
    const failed = [];

    const runUpload = async (fileName, repo, blob) => {
        console.debug(`upload ${repo}/${blob}`);
        try {
            await curl(`-s -u "${nexusUser}:${nexusPassword}" --upload-file "${path.join(artifactsDirPath, fileName)}" "${nexusUrl}/repository/${repo}/${blob}"`)
        } catch (e) {
            failed.push({fileName, blob, repo, e});
            console.error(`Upload ${fileName} - ${blob} of ${repo} failed`, e);
        }
    }

    const artifactsMetadata = await parseIndexFile(indexFilePath);

    const uploadTasks = artifactsMetadata.map(({repo, blob, fileName}) => () => runUpload(fileName, repo, blob));

    try {
        await createPromisePool(uploadTasks, 3);
    } catch (e) {
        console.error('Failed running the upload tasks.', e);
    }

    if (failed.length > 0) {
        await writeFile('./failed.json', JSON.stringify(failed));
    }

    console.log('completed!');
};


export default upload;
