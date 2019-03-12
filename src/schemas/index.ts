import { fileLoader, mergeTypes } from 'merge-graphql-schemas';
import * as path from 'path';

const typesArray: string[] = fileLoader(path.join(__dirname, './'));

export default mergeTypes(typesArray, { all: true });
