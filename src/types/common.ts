import { Document } from 'mongoose';

export interface AnyObj {
  [key: string]: any;
}

export interface AnyMongooseDoc extends Document, AnyObj {}
