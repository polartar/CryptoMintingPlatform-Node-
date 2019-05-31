import * as mongoose from 'mongoose';

export interface User extends mongoose.Document {
  email: string;
  firebaseUid: string;
  role: string;
  created: Date;
  permissions: string[];
  id: string;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  firebaseUid: {
    type: String,
    unique: true,
    trim: true,
    index: true,
  },
  role: String,
  created: { type: Date, index: true },
  permissions: [String],
  id: { type: String, index: true },
});

userSchema.post('save', function(doc: User) {
  if (!doc._id) {
    return;
  }
  const id = doc._id.toString();
  if (doc.id !== id) {
    doc.id = id;
    doc.save();
  }
});

const User = mongoose.model<User>('users', userSchema);

export default User;
