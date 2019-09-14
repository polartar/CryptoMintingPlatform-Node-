import { createConnection, Connection } from 'mongoose';
import { config } from 'dotenv';
config();
import { offersSchema } from '../models/offers';

const {
  MONGODB_URI_CONNECT: mongoConnect,
  MONGODB_URI_CODEX: mongoCodex,
  MONGODB_URI_ARCADE: mongoArcade,
  MONGODB_URI_GREEN: mongoGreen,
} = process.env;

function buildModel(connection: Connection) {
  return connection.model('offer', offersSchema);
}

const connectOffer = {
  name: 'connect_wallet',
  enabled: false,
  title: 'Connect Wallet',
};

const codexOffer = {
  name: 'codex_wallet',
  enabled: false,
  title: 'Codex Wallet',
};

const arcadeOffer = {
  name: 'arcade_wallet',
  enabled: false,
  title: 'Arcade Wallet',
};

const greenOffer = {
  name: 'green_wallet',
  enabled: false,
  title: 'Green Wallet',
};

void (async () => {
  const [connectConx, codexConx, arcadeConx, greenConx] = await Promise.all([
    createConnection(mongoConnect),
    createConnection(mongoCodex),
    createConnection(mongoArcade),
    createConnection(mongoGreen),
  ]);
  const update = [
    {
      model: buildModel(connectConx),
      offers: [connectOffer, codexOffer, greenOffer, arcadeOffer],
    },
    {
      model: buildModel(codexConx),
      offers: [codexOffer],
    },
    {
      model: buildModel(arcadeConx),
      offers: [arcadeOffer],
    },
    {
      model: buildModel(greenConx),
      offers: [greenOffer],
    },
  ];
  const results = await Promise.all(
    update.map(brand => {
      brand.model.insertMany(brand.offers);
    }),
  );
  console.log(results);
})();
