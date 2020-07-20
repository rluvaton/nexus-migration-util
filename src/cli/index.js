import * as yargs from 'yargs';
import download from '../cmd/download';
import upload from '../cmd/upload';

const downloadCmd = {
    command: 'download',
    desc: 'Download from Nexus',
    builder: (yargs) =>
        yargs
            .option('i', {
                alias: 'index',
                string: true,
                normalize: true,
                default: './index.json',
                description: 'Path for the index file (for uploading the files)'
            })
            .option('o', {
                alias: 'output',
                string: true,
                normalize: true,
                default: './',
                description: 'Directory path for the downloaded files'
            })
            .option('b', {
                alias: 'blob-dir',
                normalize: true,
                type: 'string',
                description: 'Path to the blob dir',
                demandOption: true,
            })
            .option('r', {
                alias: 'ignore-repo',
                type: 'array',
                description: 'Repositories to ignore',
                default: [],
                demandOption: false,
            }),
    handler: (argv) => {
        if (!argv._handled) {
            download({
                indexFilePath: argv.index,
                blobDir: argv.b,
                outputDir: argv.output,
                ignoreRepositories: argv.r,
                nexusUrl: argv.u,
                nexusUser: argv.user,
                nexusPassword: argv.pass
            });
        }
        argv._handled = true
    }
}

const uploadCmd = {
    command: 'upload',
    desc: 'Upload to nexus',
    builder: (yargs) => yargs
        .option('i', {
            alias: 'index-path',
            normalize: true,
            type: 'string',
            description: 'Path for the index file',
            demandOption: true,
        })
        .option('artifact', {
            alias: 'artifact-dir-path',
            normalize: true,
            type: 'string',
            description: 'Path for the directory containing all the artifact downloaded',
            demandOption: true,
        }),
    handler: (argv) => {
        if (!argv._handled) {
            upload({
                indexFilePath: argv.i,
                artifactsDirPath: argv.artifact,
                nexusUrl: argv.u,
                nexusUser: argv.user,
                nexusPassword: argv.pass
            });
        }
        argv._handled = true
    }
}

const start = () => yargs
    .scriptName('nexus-migration-util')
    .usage('Usage: $0 <command> [options]')
    .option('u', {
        alias: 'url',
        type: 'string',
        description: 'URL of the nexus',
        demandOption: true,
        global: true // Must be set in all options
    })
    .option('user', {
        alias: 'nexus-user',
        type: 'string',
        description: 'The username for nexus',
        demandOption: true,
        global: true // Must be set in all options
    })
    .option('pass', {
        alias: 'nexus-pass',
        type: 'string',
        description: 'The password for the nexus username',
        demandOption: true,
        global: true // Must be set in all options
    })
    .command(downloadCmd)
    .command(uploadCmd)
    .help('h')
    .alias('h', 'help')
    .wrap(null)
    .argv;

export default start;
