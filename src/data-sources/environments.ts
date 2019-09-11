import db from './db';
import { Environment } from '../models';

export default class EnvironmentsDB extends db {
  model = Environment;
}
