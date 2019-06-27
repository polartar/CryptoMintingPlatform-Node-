import { RESTDataSource } from 'apollo-datasource-rest';
import { config } from '../common';

class CryptoFavorites extends RESTDataSource {
  baseURL = 'https://min-api.cryptocompare.com/data';

  public async getUserFavorites(userFavorites: string[]) {
    const { cryptoSymbolToNameMap } = config;
    const { RAW: rawFavorites } = await this.get('/pricemultifull', {
      fsyms: userFavorites.join(','),
      tsyms: 'USD',
    });

    return Object.values(rawFavorites).map(({ USD: fav }) => {
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
