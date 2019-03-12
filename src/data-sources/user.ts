import Db from './db';
import { User } from '../models';

class UserAPI extends Db {
  model = User;

  constructor() {
    super();
  }
}

export default UserAPI;
