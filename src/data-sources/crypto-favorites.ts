import { RESTDataSource } from 'apollo-datasource-rest';
import { config } from '../common';

class CryptoFavorites extends RESTDataSource {
  baseURL = 'https://min-api.cryptocompare.com/data';

  public async getUserFavorites(userFavorites: string[]) {
    const { cryptoSymbolToNameMap } = config;
    const currency = 'USD';
    const { RAW: rawFavorites } = await this.get('/pricemultifull', {
      fsyms: userFavorites.join(','),
      tsyms: currency,
    });

    return Object.values(rawFavorites).map(({ [currency]: fav }) => {
      const {
        CHANGEPCT24HOUR: changePercent24Hour,
        PRICE: price,
        FROMSYMBOL: symbol,
        IMAGEURL: imageUrl,
        SUPPLY: supply,
        MKTCAP: marketCap,
      } = fav;
      return {
        changePercent24Hour,
        price,
        symbol,
        imageUrl: `https://cryptocompare.com${imageUrl}`,
        supply,
        marketCap,
        name: cryptoSymbolToNameMap.get(symbol),
      };
    });
  }
}

export default CryptoFavorites;
