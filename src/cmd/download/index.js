import * as path from 'path';
import {createPromisePool} from '../../helper/promise-pool';
import {createDirectory, writeFile} from '../../helper/fs-helper'
import {downloadFile} from '../remote-file-helper';
import {getNexus} from '../../nexus';

let nexusSdk;


async function getAllAssetsForSingleRepository(repository) {
    let componentsAssets = [];
    let continuationToken;
    do {
        /**
         * Asset example:
         * {
         *       "id": "bnBtOjkwNDM3NTRiNjhmMzUwMTgwYzUyMzlkNTMzOTE3YjJk",
         *       "repository": "npm",
         *       "format": "npm",
         *       "group": "firebase",
         *       "name": "messaging-types",
         *       "version": "0.3.4",
         *       "assets": [{
         *          "downloadUrl": "http://npm.registry.moah/@firebase/messaging-types/-/messaging-types-0.3.4.tgz",
         *          "path": "@firebase/messaging-types/-/messaging-types-0.3.4.tgz",
         *          "id": "bnBtOmZlZjE4NzYyY2U5MjFhODAxYWExZWQ2NGJmY2NjOTY5",
         *          "repository": "npm",
         *          "format": "npm",
         *          "checksum": {
         *              "sha1": "8154d731355194f8de9a6cbcd33b84c696b5f2ba"
         *           }
         *        }]
         * }
         */
        let {items, continuationToken: paginationToken} = (await (nexusSdk.Components || nexusSdk.components).getComponents({
            repository,
            continuationToken
        })).obj;
        continuationToken = paginationToken;
        componentsAssets = componentsAssets.concat(
            ...items.reduce((assets, component) => assets.concat(...component.assets), [])
        );
    } while (continuationToken);

    return componentsAssets;
}

/**
 *
 * @param repositories
 * @return {Promise<{[format: string]: {[repository: string]: any}}>}
 */
async function getAllAssetsForRepositories(repositories) {
    const repositoriesAssets = {};

    for (const repository of repositories) {
        const assets = await getAllAssetsForSingleRepository(repository);
        const format = assets.length > 0 ? assets[0].format : undefined;

        if (!format) {
            delete repositories[repository];
            continue;
        }
        repositoriesAssets[format] = repositoriesAssets[format] || {};
        repositoriesAssets[format][repository] = assets;
    }

    return repositoriesAssets;
}


async function createDirectoryStructureForExporting(repositoriesAssets, outputDir) {
    for (const format of Object.keys(repositoriesAssets)) {
        await createDirectory(path.join(outputDir, format));

        for (const repository of Object.keys(repositoriesAssets[format])) {
            await createDirectory(path.join(outputDir, format, repository));
        }
    }
}

const download = async ({
    nexusUrl,
    nexusUser,
    nexusPassword,
    nexusVersion,
    indexFilePath,
    outputDir,
    ignoreRepositories = [],
    includeRepositories = []
} = {}) => {
    const failed = [];

    const downloadsMetadata = {};

    nexusSdk = await getNexus(nexusUrl);

    // Meaning that we need to fetch the repositories list
    if (includeRepositories.length === 0) {
        includeRepositories = includeRepositories.concat(
            (await (nexusSdk.Repositories || nexusSdk.repositories).getRepositories_1()).obj
                .map(({name}) => name)
        );
    }

    if (ignoreRepositories.length > 0) {
        includeRepositories = includeRepositories.filter(name => !ignoreRepositories.includes(name));
    }

    const repositoriesAssets = await getAllAssetsForRepositories(includeRepositories);
    await createDirectoryStructureForExporting(repositoriesAssets, outputDir);

    function createDownloadTask(asset, outputDir) {
        return async () => {
            const {repository, downloadUrl, id} = asset;
            console.debug(`download ${repository}/${downloadUrl} - id`);
            const fileName = id + path.extname(downloadUrl);

            try {
                await downloadFile(downloadUrl, path.join(outputDir, fileName))
                downloadsMetadata[fileName] = asset;
            } catch (error) {
                failed.push({...asset, outputDir, error});
                console.error(`Downloading ${asset.path} of ${asset.repository} failed`, error);
            }
        }
    }

    const downloadTasks = [];
    Object.values(repositoriesAssets).forEach(repositoriesForFormat =>
        Object.values(repositoriesForFormat).forEach(assetsForRepository =>
            assetsForRepository.forEach(asset =>
                downloadTasks.push(createDownloadTask(asset, path.join(outputDir, asset.format, asset.repository)))
            )
        )
    )

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
