require('dotenv').config();
import { createConnection, Schema, Document } from 'mongoose';
import { config } from '../common';
import autoBind = require('auto-bind');
// import { Schema, Document } from 'mongoose'

// const { green, connect, arcade, codex } = config.dbConnectionStrings;
const green = {
  local: process.env.GREEN_LOCAL_MONGODB_URI,
  stage: process.env.GREEN_STAGE_MONGODB_URI,
  prod: process.env.GREEN_PROD_MONGODB_URI,
};
const connect = {
  local: process.env.CONNECT_LOCAL_MONGODB_URI,
  stage: process.env.CONNECT_STAGE_MONGODB_URI,
  prod: process.env.CONNECT_PROD_MONGODB_URI,
};
const arcade = {
  local: process.env.ARCADE_LOCAL_MONGODB_URI,
  stage: process.env.ARCADE_STAGE_MONGODB_URI,
  prod: process.env.ARCADE_PROD_MONGODB_URI,
};
const codex = {
  local: process.env.CODEX_LOCAL_MONGODB_URI,
  stage: process.env.CODEX_STAGE_MONGODB_URI,
  prod: process.env.CODEX_PROD_MONGODB_URI,
};

class Connections {
  constructor() {
    autoBind(this);
  }
  green = {
    local: {
      connect() {
        return createConnection(green.local, { useNewUrlParser: true });
      },
    },
    stage: {
      connect() {
        return createConnection(green.stage, { useNewUrlParser: true });
      },
    },
    prod: {
      connect() {
        return createConnection(green.prod, { useNewUrlParser: true });
      },
    },
  };
  arcade = {
    local: {
      connect() {
        return createConnection(arcade.local, { useNewUrlParser: true });
      },
    },
    stage: {
      connect() {
        return createConnection(arcade.stage, { useNewUrlParser: true });
      },
    },
    prod: {
      connect() {
        return createConnection(arcade.prod, { useNewUrlParser: true });
      },
    },
  };
  codex = {
    local: {
      connect() {
        return createConnection(codex.local, { useNewUrlParser: true });
      },
    },
    stage: {
      connect() {
        return createConnection(codex.stage, { useNewUrlParser: true });
      },
    },
    prod: {
      local: {
        connect() {
          return createConnection(connect.local, { useNewUrlParser: true });
        },
      },
      connect() {
        return createConnection(codex.prod, { useNewUrlParser: true });
      },
    },
  };
  connect = {
    local: {
      connect() {
        return createConnection(connect.local, { useNewUrlParser: true });
      },
    },
    stage: {
      connect() {
        return createConnection(connect.stage, { useNewUrlParser: true });
      },
    },
    prod: {
      connect() {
        return createConnection(connect.prod, { useNewUrlParser: true });
      },
    },
  };
  allStage = {
    connect: () => {
      return Promise.all([
        // this.arcade.stage.connect(),
        this.connect.stage.connect(),
        this.green.stage.connect(),
        this.codex.stage.connect(),
      ]);
    },
  };
  allProd = {
    connect: () => {
      return Promise.all([
        this.arcade.prod.connect(),
        this.codex.prod.connect(),
        this.connect.prod.connect(),
        this.green.prod.connect(),
      ]);
    },
  };
  allLocal = {
    connect: () => {
      return Promise.all([
        this.arcade.local.connect(),
        this.codex.local.connect(),
        this.connect.local.connect(),
        this.green.local.connect(),
      ]);
    },
  };
  allConnections = {
    connect: () => {
      return Promise.all([
        this.arcade.stage.connect(),
        this.arcade.prod.connect(),
        this.codex.stage.connect(),
        this.codex.prod.connect(),
        this.connect.stage.connect(),
        this.connect.prod.connect(),
        this.green.stage.connect(),
        this.green.prod.connect(),
      ]);
    },
  };

  async prodModels<T extends Document>(collectionName: string, schema: Schema) {
    const connections = await this.allProd.connect();
    return connections.map(connection => {
      return connection.model<T>(collectionName, schema);
    });
  }
}

export default new Connections();
