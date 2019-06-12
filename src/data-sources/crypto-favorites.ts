// Basic full crud interface for adding, editing, and deleting accounts for a specific user.

import { DataSource } from 'apollo-datasource';
import { config } from '../common';
import axios from 'axios';

class CryptoFavorites extends DataSource {
  public async getUserFavorites(userFavorites: string[]) {
    const reqUrl = `${
      config.cryptoFavoritesBaseUrl
    }/pricemultifull?fsyms=${userFavorites.join(',')}&tsyms=USD`;
    const {
      data: { RAW: rawFavorites },
    } = await axios.get(reqUrl);
    return Object.values(rawFavorites).map(({ USD: fav }) => {
      const {
        CHANGE24HOUR: change24Hour,
        PRICE: price,
        FROMSYMBOL: symbol,
        IMAGEURL: imageUrl,
        SUPPLY: supply,
        MKTCAP: marketCap,
      } = fav;
      const fullImageUrl = 'https://cryptocompare.com' + imageUrl;
      return {
        change24Hour,
        price,
        symbol,
        imageUrl: fullImageUrl,
        supply,
        marketCap,
      };
    });
  }
}

export default CryptoFavorites;
