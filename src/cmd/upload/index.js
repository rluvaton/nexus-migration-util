import * as path from 'path';
import {isExistsSync, readFile, writeFile} from '../../helper/fs-helper'
import {uploadFile} from '../remote-file-helper';
import * as fs from "fs";

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
    mapperPath,
    nexusUser,
    nexusPassword
} = {}) => {
    const failed = [];

    let repositoryMapper = {};
    try {
        repositoryMapper = mapperPath ? JSON.parse(await readFile(mapperPath)) : {};
    } catch (e) {
        console.error('Failed to read mapperPath', {mapperPath}, e);
    }

    function createUploadTask(asset, outputDir) {
        return async () => {
            const {repository, format, id, downloadUrl, path: filePath} = asset;

            const realFilePath = path.join(outputDir, format, repository, id);
            console.debug(`⏱ Upload ${repository}/${realFilePath}`);

            const uploadUrl = `${nexusUrl}/service/rest/v1/components?repository=${repositoryMapper[repository] || repository}`;
            try {
                const fileReadStream = fs.createReadStream(realFilePath);

                await uploadFile({
                    method: 'post',
                    url: uploadUrl,
                    username: nexusUser,
                    password: nexusPassword,
                    format,
                    filePath,
                    fileReadStream,
                });
            } catch (error) {
                failed.push({...asset, outputDir, filePath: realFilePath, error: error.message});
                const status = error && error.response ? error.response.statusText : undefined;
                const message = error && error.response ? error.response.data : undefined;
                const errorObj = status && message !== undefined ? {status, message} : error;
                console.error(`❌ Upload ${asset.path} of ${asset.repository} failed with`, errorObj);
            }
        }
    }

    const artifactsMetadata = await parseIndexFile(indexFilePath);

    const uploadTasks = artifactsMetadata.map((asset) => createUploadTask(asset, artifactsDirPath));

    try {
        await Promise.all(uploadTasks.map((uploadTask) => uploadTask()));
    } catch (e) {
        console.error('Failed running the upload tasks.', e);
    }

    if (failed.length > 0) {
        await writeFile('./failed.json', JSON.stringify(failed));
    }

    console.log('completed!');
};

/**
 * Get file name with extension from file path
 * @param filePath
 * @return {string}
 * @private
 * @internal
 */
export function _getFileNameFromPath(filePath) {
    return filePath.slice(filePath.lastIndexOf('/') + 1)
}



export default upload;
