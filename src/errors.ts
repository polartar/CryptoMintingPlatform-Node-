import { logger } from './common';

class ErrorHander {
    handleError = async (error: Error) => {
        try {
            logger.error("Uncaught exception. Caught on application.", error);
        } catch (er) {
            const message = `Unable to log catch-all logging. Bubbling to kill process. Including ErrorUncaught ----${error.message} , and FailureToLogError ----${er.message} `;
            logger.crit(message,  [error, er]);
            throw er;
        }
    };

    isTrustedError = async (error: Error) => {
        //TODO : mechanism to establish error severity
        return true;
    };
}


export default new ErrorHander();
