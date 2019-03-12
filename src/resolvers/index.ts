import { fileLoader, mergeResolvers } from 'merge-graphql-schemas';
import { IResolvers } from 'graphql-tools';
import * as path from 'path';

const resolversArray: IResolvers[] = fileLoader(path.join(__dirname, './'));

export default mergeResolvers(resolversArray);
