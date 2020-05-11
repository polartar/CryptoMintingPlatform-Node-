import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '.env') });

export default process.env;
