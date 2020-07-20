import PromisePool from 'es6-promise-pool';

/**
 * Create Promise Pool that execute promises in concurrent
 * @param {(function(): Promise)[]} tasks Tasks to run
 * @param {number} maxConcurrentTasks The number of concurrent tasks to run
 * @returns {PromiseLike<unknown>} Promise that resolved when all promises resolved and reject when one promise reject
 */
export const createPromisePool = (tasks, maxConcurrentTasks) => {

    const promiseProducer = () => {
        if (tasks.length) {
            const task = tasks.shift();
            return task();
        }

        return null;
    }

    const pool = new PromisePool(promiseProducer, maxConcurrentTasks); // concurrent Promises set to maxConcurrentTasks

    return pool.start();
};
