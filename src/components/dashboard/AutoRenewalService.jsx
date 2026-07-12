
import { Deposit } from "@/entities/Deposit";

class AutoRenewalService {
  static async checkAndProcessRenewals() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Nastavit na začátek dne
      
      // Najít všechny aktivní vklady s automatickým obnovením
      const depositsToCheck = await Deposit.filter({
        automatic_renewal: "Yes",
        closed: "No"
      });
      
      const renewalsProcessed = [];
      
      for (const deposit of depositsToCheck) {
        if (deposit.maturity_date) {
          const maturityDate = new Date(deposit.maturity_date);
          maturityDate.setHours(0, 0, 0, 0);
          
          // Pokud je dnes den po uplynutí lhůty, obnovit
          const dayAfterMaturity = new Date(maturityDate);
          dayAfterMaturity.setDate(dayAfterMaturity.getDate() + 1);
          
          if (today.getTime() >= dayAfterMaturity.getTime()) { // Changed from '===' to '>='
            // Vypočítat novou lhůtu (+1 rok od původní lhůty)
            const newMaturityDate = new Date(maturityDate);
            newMaturityDate.setFullYear(newMaturityDate.getFullYear() + 1);
            // Removed: newMaturityDate.setDate(newMaturityDate.getDate() - 30);
            
            // Aktualizovat záznam
            await Deposit.update(deposit.id, {
              maturity_date: newMaturityDate.toISOString().split('T')[0],
              notes: deposit.notes ? 
                `${deposit.notes}\n[${today.toLocaleDateString('cs-CZ')}] Automaticky obnoveno do ${newMaturityDate.toLocaleDateString('cs-CZ')}` :
                `[${today.toLocaleDateString('cs-CZ')}] Automaticky obnoveno do ${newMaturityDate.toLocaleDateString('cs-CZ')}`
            });
            
            renewalsProcessed.push({
              id: deposit.id,
              client_name: `${deposit.client_first_name} ${deposit.client_last_name}`,
              contract_number: deposit.contract_number,
              old_maturity: maturityDate.toLocaleDateString('cs-CZ'),
              new_maturity: newMaturityDate.toLocaleDateString('cs-CZ')
            });
            
            console.log(`Automaticky obnoven vklad: ${deposit.contract_number} pro ${deposit.client_first_name} ${deposit.client_last_name}`);
          }
        }
      }
      
      return renewalsProcessed;
    } catch (error) {
      console.error("Chyba při kontrole automatického obnovení:", error);
      throw error;
    }
  }
  
  static async getUpcomingRenewals(daysAhead = 90) {
    try {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const depositsToCheck = await Deposit.filter({
        automatic_renewal: "Yes",
        closed: "No"
      });
      
      const upcomingRenewals = depositsToCheck.filter(deposit => {
        if (deposit.maturity_date) {
          const maturityDate = new Date(deposit.maturity_date);
          return maturityDate >= today && maturityDate <= futureDate;
        }
        return false;
      }).map(deposit => ({
        id: deposit.id,
        client_name: `${deposit.client_first_name} ${deposit.client_last_name}`,
        contract_number: deposit.contract_number,
        maturity_date: deposit.maturity_date,
        days_until_renewal: Math.ceil((new Date(deposit.maturity_date) - today) / (1000 * 60 * 60 * 24)),
        investment_amount: deposit.investment_amount,
        commodity: deposit.commodity
      }));
      
      return upcomingRenewals.sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date));
    } catch (error) {
      console.error("Chyba při získávání nadcházejících obnovení:", error);
      throw error;
    }
  }
}

export default AutoRenewalService;
