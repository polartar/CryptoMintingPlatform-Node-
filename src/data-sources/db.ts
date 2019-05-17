// This is a base class for DataSources that allow direct access to a specified mongo model

import { DataSource } from 'apollo-datasource';
import { Model } from 'mongoose';
import { FilterQuery } from 'mongodb';
import { AnyObj, AnyMongooseDoc } from '../types/common';

abstract class Db extends DataSource {
  abstract model: Model<AnyMongooseDoc>;

  constructor() {
    super();
  }

  async create(object: AnyObj) {
    const doc = new this.model(object);
    const res = await doc.save();
    return res ? res : {};
  }

  async findById(id: string) {
    const res = await this.model.findById(id);
    return res ? res : {};
  }

  async findOne(query: FilterQuery<AnyObj>) {
    const res = await this.model.findOne(query);
    return res ? res : {};
  }

  async find(query: FilterQuery<AnyObj>) {
    const res = await this.model.find(query);
    return Array.isArray(res) ? res.filter(r => r) : [];
  }

  async updateById(id: string, updates: AnyObj) {
    const res = await this.model.findByIdAndUpdate(id, updates);
    return res ? res : {};
  }

  async updateOne(query: FilterQuery<AnyObj>, updates: AnyObj) {
    const res = await this.model.updateOne(query, updates);
    return res ? res : {};
  }

  async updateMany(query: FilterQuery<AnyObj>, updates: AnyObj) {
    const res = await this.model.updateMany(query, updates);
    return Array.isArray(res) ? res.filter(r => r) : [];
  }

  async deleteById(id: string) {
    const res = await this.model.findByIdAndDelete(id);
    return res ? res : {};
  }

  async aggregate(pipeline: AnyObj[]) {
    const res = await this.model.aggregate(pipeline);
    return Array.isArray(res) ? res.filter(r => r) : [];
  }
}

export default Db;
