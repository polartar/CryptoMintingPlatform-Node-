import { logger, ResolverBase } from 'src/common';
import { Context } from 'src/types/context';
import {
  ILicenseTypeMapping,
  ILicenseTypeMappingInput,
  ILicenseTypeMappingFull,
} from 'src/types';
import {
  LicenseTypeMappingModel,
  LisenceTypeMappingsFullPipeline,
  LicenseTypeModel,
} from 'src/models';

class Resolvers extends ResolverBase {
  getAllFullLicenseTypeMapping = async (
    parent: any,
    args: {},
    ctx: Context,
  ): Promise<ILicenseTypeMappingFull[]> => {
    const { user } = ctx;
    this.requireAdmin(user);
    let allMaps: ILicenseTypeMappingFull[];
    try {
      allMaps = await LicenseTypeModel.aggregate<ILicenseTypeMappingFull>(
        LisenceTypeMappingsFullPipeline,
        () => {
          return;
        },
      );
    } catch (err) {
      logger.warn(
        `resolvers.licenseTypeMapping.getAllLicenseTypeMapping.catch: ${err}`,
      );
      throw err;
    }
    return allMaps;
  };
  addLicenseTypeMapping = async (
    parent: any,
    args: { toMapp: ILicenseTypeMappingInput },
    ctx: Context,
  ): Promise<ILicenseTypeMapping> => {
    const { user } = ctx;
    this.requireAdmin(user);
    const { toMapp } = args;

    const toMapModel = new LicenseTypeMappingModel({
      ...toMapp,
      created: new Date(),
    });
    let retMapp: ILicenseTypeMapping;
    try {
      retMapp = await toMapModel.save();
    } catch (err) {
      logger.warn(
        `resolvers.licenseTypeMapping.addLicenseTypeMapping.catch: ${err}`,
      );
      throw err;
    }
    return retMapp;
  };

  remLicenseTypeMapping = async (
    parent: any,
    args: { toUnmapp: ILicenseTypeMapping },
    ctx: Context,
  ): Promise<{ success: boolean; message: string }> => {
    const { user } = ctx;
    this.requireAdmin(user);
    const { toUnmapp } = args;
    try {
      const ret = await LicenseTypeMappingModel.deleteOne(toUnmapp);
      if (ret.deletedCount === 1)
        return {
          success: true,
          message: 'Mapp removed succesfully',
        };
      return {
        success: false,
        message: "Mapped pair didn't find",
      };
    } catch (err) {
      logger.warn(
        `resolvers.licenseTypeMapping.addLicenseTypeMapping.catch: ${err}`,
      );
      return {
        success: false,
        message: err,
      };
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    getAllFullLicenseTypeMapping: resolvers.getAllFullLicenseTypeMapping,
  },
  Mutation: {
    addLicenseTypeMapping: resolvers.addLicenseTypeMapping,
    remLicenseTypeMapping: resolvers.remLicenseTypeMapping,
  },
};
