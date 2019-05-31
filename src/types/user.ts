export { User } from '../models/user';

export interface RegisterInput {
  email: string;
  firebaseUid: string;
  role?: string;
  permissions?: string[];
  created?: Date;
}
