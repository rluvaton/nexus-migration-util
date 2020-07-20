import * as path from 'path';
import curl from '../helper/curl';
import {createPromisePool} from '../helper/promise-pool';
import {getFiles, isExistsSync, readFile, writeFile} from '../helper/files'

/**
 * Scan blob directory
 * @param {string} blobDir Path for the blob directory
 * @param {string[]} ignoreRepositories Array of ignored repositories
 * @returns {Promise<(*|{blob: *, repo: *})[]>} Repos and blob names
 */
const scanBlob = async (blobDir, ignoreRepositories = []) => {
    if (!blobDir || !(isExistsSync(blobDir))) {
        throw new Error('blobDir not exist');
    }

    const files = (await getFiles(blobDir, '**/*.properties')).map(file => path.join(blobDir, file));

    return (await Promise.all(files.map(file => parsePropertyFile(file, ignoreRepositories)))).filter(Boolean);
};

const parsePropertyFile = async (propertiesFilePath, ignoreRepositories = []) => {
    const fileContent = await readFile(propertiesFilePath);
    const lines = fileContent.split('\n');

    const properties = {
        repoName: {
            keyInFile: '@Bucket.repo-name',
            value: undefined
        },
        blobName: {
            keyInFile: '@BlobStore.blob-name',
            value: undefined
        }
    }

    Object.keys(properties).forEach(key =>
        properties[key].value = findValueInPropertyFile(lines, properties[key].keyInFile)
    );

    const blob = properties.blobName.value;
    const repo = properties.repoName.value;

    if (!blob || !repo) {
        return undefined
    }

    if (ignoreRepositories.includes(repo)) {
        console.debug(`Ignore repository - ${repo}`);
        return undefined;
    }

    return {repo, blob}
};

const findValueInPropertyFile = (lines, key) => {
    const line = lines.find(line => {
        return (line || '').startsWith(key);
    });
    if (!line) {
        return undefined;
    }

    let [searchedKey, value] = line.split('=');
    if (!value) {
        return undefined;
    }
    value = value.trim();
    return value.length > 0 ? value : undefined;
};


const download = async ({
    indexFilePath,
    outputDir,
    blobDir,
    nexusUrl,
    nexusUser,
    nexusPassword,
    ignoreRepositories = []
} = {}) => {
    const failed = [];

    const downloadsMetadata = {};

    let index = 1;

    const runDownload = async (repo, blob) => {
        console.debug(`download ${repo}/${blob}`);
        const fileName = index++ + '';
        try {
            await curl(`-s -o "${path.join(outputDir, fileName)}" -u "${nexusUser}:${nexusPassword}" "${nexusUrl}/repository/${repo}/${blob}"`)
            downloadsMetadata[fileName] = {blob, repo};
        } catch (e) {
            failed.push({blob, repo, e});
            console.error(`Downloading ${blob} of ${repo} failed`, e);
        }
    }

    const repoAndBlobNames = await scanBlob(blobDir, ignoreRepositories);

    const downloadTasks = repoAndBlobNames.map(({repo, blob}) => () => runDownload(repo, blob));

    try {
        await createPromisePool(downloadTasks, 3);
    } catch (e) {
        console.error('Failed running the download tasks.', e);
    }

    await writeFile(indexFilePath, JSON.stringify(downloadsMetadata));

    if (failed.length > 0) {
        await writeFile('./failed.json', JSON.stringify(failed));
    }

    console.log('completed!');
};


export default download;
