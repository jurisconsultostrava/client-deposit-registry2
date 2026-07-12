
import { GoldPrice } from "@/entities/GoldPrice";
import { getGoldPrice } from "@/functions/getGoldPrice";

class GoldPriceService {
  static TROY_OUNCE_IN_GRAMS = 31.1035;
  static UPDATE_INTERVAL_MINUTES = 30;

  static async fetchFromGoldAPI() {
    try {
      const { data: response, error } = await getGoldPrice({});
      
      if (error || !response) {
        throw new Error(error?.message || "Backendová funkce pro získání ceny nevrátila data.");
      }

      if (response.price_czk === null || response.price_usd === null) {
        throw new Error("API volání nevrátilo kompletní data. Odpověď: " + JSON.stringify(response));
      }

      if (response.price_czk <= 10000 || response.price_usd <= 1000) {
        throw new Error(`API vrátilo podezřele nízké hodnoty. CZK: ${response.price_czk}, USD: ${response.price_usd}`);
      }
      
      const exchange_rate = response.price_czk / response.price_usd;
      
      const pricesToStore = {
        price_czk_oz: parseFloat(response.price_czk.toFixed(2)),
        price_usd_oz: parseFloat(response.price_usd.toFixed(3)),
        exchange_rate_usd_czk: parseFloat(exchange_rate.toFixed(4)),
        last_updated: new Date().toISOString(),
        source: "goldapi",
        api_response: JSON.stringify(response)
      };
      
      await this.storePrices(pricesToStore);
      console.log("Úspěšně získány ceny z GoldAPI přes backend funkci:", pricesToStore);
      return pricesToStore;

    } catch (error) { // Removed : any
      console.error("Chyba při volání backend funkce pro získání ceny zlata:", error);
      // Přidání specifické chybové zprávy pro rate limit
      if (error.message && typeof error.message === 'string' && error.message.toLowerCase().includes('rate limit')) {
        throw new Error(`Překročen limit volání na GoldAPI. Zkuste to prosím později.`);
      }
      throw new Error(`Nepodařilo se získat cenu zlata. Důvod: ${error.message}`);
    }
  }

  static async fetchHistoricalPrice(dateString) { // Removed : string
    if (!dateString) return null;

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error("Neplatný formát data.");
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}${month}${day}`;

        const { data: response, error } = await getGoldPrice({ date: formattedDate });

        if (error || !response) {
            // Přidání specifické chybové zprávy pro rate limit
            if (error?.message && typeof error.message === 'string' && error.message.toLowerCase().includes('rate limit')) {
                throw new Error(`Překročen limit volání na GoldAPI pro historická data.`);
            }
            throw new Error(error?.message || "Historická cena nebyla nalezena nebo je neplatná.");
        }

        if (typeof response.price_usd === 'number' && response.price_usd > 0) {
            return response.price_usd;
        }

        throw new Error("Historická cena nebyla nalezena nebo je neplatná.");
    } catch (error) { // Removed : any
        console.error(`Chyba při získávání historické ceny pro ${dateString}:`, error);
        return null;
    }
  }

  static async storePrices(priceData) { // Removed : any
    try {
      const goldPriceRecords = await GoldPrice.list("-created_date", 1);
      
      if (goldPriceRecords.length > 0) {
        await GoldPrice.update(goldPriceRecords[0].id, priceData);
      } else {
        await GoldPrice.create(priceData);
      }
    } catch (error) {
      console.error("Chyba při ukládání cen:", error);
      throw error;
    }
  }

  static async getCurrentPrices() {
    try {
      const goldPriceRecords = await GoldPrice.list("-created_date", 1);
      
      if (goldPriceRecords.length > 0) {
        const lastRecord = goldPriceRecords[0];
        const lastUpdate = new Date(lastRecord.last_updated || lastRecord.created_date);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

        // Aktualizuj pouze pokud jsou data starší než 30 minut
        if (minutesSinceUpdate > this.UPDATE_INTERVAL_MINUTES) {
          try {
            console.log(`Ceny jsou staré ${minutesSinceUpdate.toFixed(1)} minut, pokouším se aktualizovat...`);
            const newPrices = await this.fetchFromGoldAPI();
            return newPrices;
          } catch (error) { // Removed : any
            console.warn("Nepodařilo se aktualizovat ceny, používám poslední známé hodnoty:", error.message);
            return lastRecord;
          }
        }
        
        console.log("Používám uložené ceny (aktuální)");
        return lastRecord;
      } else {
        // Pokud nemáme žádné ceny, zkus získat nové
        console.log("Nemáme žádné uložené ceny, pokouším se získat z API...");
        try {
          const newPrices = await this.fetchFromGoldAPI();
          return newPrices;
        } catch (error) { // Removed : any
          console.warn("Nepodařilo se získat ceny z API, používám rozumné výchozí hodnoty");
          
          // Uložit a vrátit rozumné výchozí ceny
          const defaultPrices = {
            price_czk_oz: 62000,  // Aktuální přibližná cena zlata v CZK
            price_usd_oz: 2650,   // Aktuální přibližná cena zlata v USD
            exchange_rate_usd_czk: 23.4,
            last_updated: new Date().toISOString(),
            source: "default",
            api_response: "Výchozí hodnoty - API nedostupné"
          };
          
          try {
            await this.storePrices(defaultPrices);
          } catch (storeError) {
            console.warn("Nepodařilo se uložit výchozí ceny:", storeError);
          }
          
          return defaultPrices;
        }
      }
    } catch (error) {
      console.error("Kritická chyba při získávání cen:", error);
      
      // Nouzové hodnoty
      return {
        price_czk_oz: 62000,
        price_usd_oz: 2650,
        exchange_rate_usd_czk: 23.4,
        last_updated: new Date().toISOString(),
        source: "emergency",
        api_response: "Nouzové hodnoty kvůli chybě"
      };
    }
  }

  static async updatePricesManually(price_czk_oz, price_usd_oz = null, exchange_rate = null) { // Removed type annotations
    try {
      let finalPriceUsdOz = price_usd_oz;
      let finalExchangeRate = exchange_rate;

      // Pokud není zadán USD kurz, vypočítej ho
      if (!finalPriceUsdOz && !finalExchangeRate) {
        // Použij přibližný kurz
        finalExchangeRate = 23.4;
        finalPriceUsdOz = price_czk_oz / finalExchangeRate;
      } else if (!finalExchangeRate && finalPriceUsdOz) {
        finalExchangeRate = price_czk_oz / finalPriceUsdOz;
      } else if (!finalPriceUsdOz && finalExchangeRate) {
        finalPriceUsdOz = price_czk_oz / finalExchangeRate;
      }

      const pricesToStore = {
        price_czk_oz: parseFloat(price_czk_oz.toFixed(2)),
        price_usd_oz: finalPriceUsdOz ? parseFloat(finalPriceUsdOz.toFixed(3)) : null,
        exchange_rate_usd_czk: finalExchangeRate ? parseFloat(finalExchangeRate.toFixed(4)) : null,
        last_updated: new Date().toISOString(),
        source: "manual",
        api_response: "Manuálně zadáno uživatelem"
      };

      await this.storePrices(pricesToStore);
      console.log("Manuálně aktualizované ceny:", pricesToStore);
      return pricesToStore;
    } catch (error) {
      console.error("Chyba při manuální aktualizaci cen:", error);
      throw error;
    }
  }

  static calculateValueCZK(investment_amount_grams, price_data, commodity = "Au") { // Removed type annotations
    // Kontrola vstupních parametrů
    if (!investment_amount_grams || investment_amount_grams <= 0) {
      return 0;
    }
    
    // Počítej hodnotu pouze pro zlato (Au)
    if (commodity !== "Au") {
      return 0;
    }
    
    if (!price_data || typeof price_data.price_czk_oz !== 'number' || price_data.price_czk_oz <= 0) {
      return 0;
    }
    
    try {
      const price_czk_gram = price_data.price_czk_oz / this.TROY_OUNCE_IN_GRAMS;
      const total_value = investment_amount_grams * price_czk_gram;
      return parseFloat(total_value.toFixed(2));
    } catch (error) {
      console.error("Chyba při výpočtu hodnoty CZK:", error);
      return 0;
    }
  }

  static formatLastUpdate(price_data) { // Removed type annotation
    if (!price_data || !price_data.last_updated) {
      return "Neznámé";
    }
    
    try {
      const date = new Date(price_data.last_updated);
      if (isNaN(date.getTime())) {
        return "Neplatné datum";
      }
      
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (minutesAgo < 1) return "Právě teď";
      if (minutesAgo === 1) return "Před 1 minutou";
      if (minutesAgo < 60) return `Před ${minutesAgo} minutami`;
      
      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo === 1) return "Před 1 hodinou";
      if (hoursAgo < 24) return `Před ${hoursAgo} hodinami`;
      
      return date.toLocaleString("cs-CZ");
    } catch (error) {
      console.error("Chyba při formátování času:", error);
      return "Neznámé";
    }
  }
}

export default GoldPriceService;
