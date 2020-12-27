import * as path from 'path';
import {isExistsSync, readFile, writeFile} from '../../helper/fs-helper'
import {uploadFile} from '../remote-file-helper';
import * as fs from "fs";
import {fileExtensionsForFormat} from './asset-map';

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
            const {repository, format, fileName} = asset;

            const filePath = path.join(outputDir, format, repository, fileName);
            console.debug(`⏱ Upload ${repository}/${filePath}`);

            const uploadUrl = `${nexusUrl}/service/rest/v1/components?repository=${repositoryMapper[repository] || repository}`;
            const formDataAppend = {};
            const fileExtensions = fileExtensionsForFormat[format];

            try {
                if (!fileExtensions) {
                    throw new Error(`upload not supported for this format (${format})`);
                }

                if (!fileExtensions.some(extension => filePath.endsWith(extension))) {
                    throw new Error(`format ${format} should be with one of these file extensions - ${fileExtensions.join(', ')}`);
                }

                formDataAppend[`${format}.asset`] = fs.createReadStream(filePath);

                await uploadFile({
                    method: 'post',
                    url: uploadUrl,
                    username: nexusUser,
                    password: nexusPassword,
                    formDataAppend
                });
            } catch (error) {
                failed.push({...asset, outputDir, filePath, error});
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


export default upload;
