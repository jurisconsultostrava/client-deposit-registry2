
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Deposit } from "@/entities/Deposit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save, User, FileText, DollarSign, Info } from "lucide-react";
import GoldPriceService from "../components/gold/GoldPriceService";

export default function NewDeposit() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [isFetchingHistoricalPrice, setIsFetchingHistoricalPrice] = useState(false);
  const [historicalPriceError, setHistoricalPriceError] = useState(null);

  const [formData, setFormData] = useState({
    client_first_name: "",
    client_last_name: "",
    client_date_of_birth: "",
    phone: "",
    email: "",
    contract_type: "",
    contract_number: "",
    commodity: "",
    investment_amount: "",
    gold_price: "",
    contract_date: "",
    maturity_date: "",
    automatic_renewal: "No",
    closed: "No",
    notes: "",
    interest_paid_date: "",
    internal_information: "",
    current_value_czk: 0
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateMaturityDate = (contractDate) => {
    if (!contractDate) return "";
    const date = new Date(contractDate);
    date.setDate(date.getDate() + 359); // Přidat 359 dní
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    loadPriceData();
  }, []);

  useEffect(() => {
    const fetchAndSetData = async () => {
      if (formData.contract_date) {
        // Calculate maturity date
        const maturityDate = calculateMaturityDate(formData.contract_date);
        handleInputChange("maturity_date", maturityDate);

        // Fetch historical price
        setIsFetchingHistoricalPrice(true);
        setHistoricalPriceError(null);
        handleInputChange("gold_price", ""); // Reset price

        try {
          const price = await GoldPriceService.fetchHistoricalPrice(formData.contract_date);
          if (price) {
            handleInputChange("gold_price", price.toFixed(3));
          } else {
            setHistoricalPriceError("Cena pro tento den nenalezena (může být víkend/svátek).");
          }
        } catch (error) {
          console.error("Failed to fetch historical price", error);
          setHistoricalPriceError("Chyba při komunikaci s API.");
        } finally {
          setIsFetchingHistoricalPrice(false);
        }
      }
    };

    fetchAndSetData();
  }, [formData.contract_date]); // Dependency on contract_date

  useEffect(() => {
    const weight = parseFloat(formData.investment_amount) || 0;
    // Pass commodity type to calculation to enable conditional logic in GoldPriceService
    const currentValue = GoldPriceService.calculateValueCZK(weight, priceData, formData.commodity); 
    setFormData(prev => ({ ...prev, current_value_czk: currentValue }));
  }, [formData.investment_amount, formData.commodity, priceData]); // Added formData.commodity to dependencies

  const loadPriceData = async () => {
    try {
      const prices = await GoldPriceService.getCurrentPrices();
      setPriceData(prices);
      // Removed gold_price setting here, as it's now handled by historical price fetch
    } catch (error) {
      console.error("Chyba při načítání cenových dat:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.gold_price) {
        setHistoricalPriceError("Cena při založení musí být vyplněna. Zvolte platné datum smlouvy.");
        setIsSubmitting(false);
        return;
    }

    try {
      const submitData = {
        ...formData,
        investment_amount: parseFloat(formData.investment_amount) || 0,
        gold_price: parseFloat(formData.gold_price) || 0, // Ensure it's a number
        current_value_czk: parseFloat(formData.current_value_czk) || 0,
      };

      await Deposit.create(submitData);
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error creating deposit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-neutral-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="border-neutral-300 hover:bg-neutral-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na nástěnku
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Nový vklad</h1>
            <p className="text-neutral-600">Vytvořte nový záznam o klientském vkladu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informace o klientovi
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first-name" className="text-sm font-medium">
                  Křestní jméno <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first-name"
                  value={formData.client_first_name}
                  onChange={(e) => handleInputChange("client_first_name", e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last-name" className="text-sm font-medium">
                  Příjmení <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last-name"
                  value={formData.client_last_name}
                  onChange={(e) => handleInputChange("client_last_name", e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dob" className="text-sm font-medium">
                  Datum narození <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.client_date_of_birth}
                  onChange={(e) => handleInputChange("client_date_of_birth", e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detaily smlouvy
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contract-type" className="text-sm font-medium">
                  Typ smlouvy <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.contract_type} onValueChange={(value) => handleInputChange("contract_type", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte typ smlouvy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gold Deposit">Gold Deposit</SelectItem>
                    <SelectItem value="Silver Deposit">Silver Deposit</SelectItem>
                    <SelectItem value="Other">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contract-number" className="text-sm font-medium">
                  Číslo smlouvy <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contract-number"
                  value={formData.contract_number}
                  onChange={(e) => handleInputChange("contract_number", e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="commodity" className="text-sm font-medium">
                  Komodita <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.commodity} onValueChange={(value) => handleInputChange("commodity", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte komoditu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Au">Zlato (Au)</SelectItem>
                    <SelectItem value="Ag">Stříbro (Ag)</SelectItem>
                    <SelectItem value="Pt">Platina (Pt)</SelectItem>
                    <SelectItem value="Pd">Palladium (Pd)</SelectItem>
                    <SelectItem value="Other">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="investment-amount" className="text-sm font-medium">
                  Hmotnost kovu (g) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="investment-amount"
                  type="number"
                  step="0.01"
                  value={formData.investment_amount}
                  onChange={(e) => handleInputChange("investment_amount", e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Hmotnost v gramech"
                />
              </div>
              <div>
                <Label htmlFor="gold-price" className="text-sm font-medium">Cena AU (USD) při založení</Label>
                <Input
                  id="gold-price"
                  type="number"
                  step="0.001"
                  value={formData.gold_price}
                  disabled
                  className="mt-1 bg-neutral-100"
                  placeholder={isFetchingHistoricalPrice ? "Načítání..." : "Zadejte datum smlouvy"}
                />
                {isFetchingHistoricalPrice && <p className="text-xs text-neutral-500 mt-1">Získávám historickou cenu...</p>}
                {!isFetchingHistoricalPrice && !historicalPriceError && formData.gold_price && <p className="text-xs text-neutral-500 mt-1">Cena automaticky načtena k datu smlouvy.</p>}
                {historicalPriceError && <p className="text-xs text-red-500 mt-1">{historicalPriceError}</p>}
              </div>
              <div>
                <Label htmlFor="current-value" className="text-sm font-medium">Aktuální hodnota CZK</Label>
                <Input
                  id="current-value"
                  type="text"
                  value={formData.commodity === "Au" ? 
                    formData.current_value_czk.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' }) : 
                    "-"
                  }
                  disabled
                  className="mt-1 bg-neutral-100 font-semibold"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {formData.commodity === "Au" ? "Vypočítáno automaticky" : "Pouze pro zlato (Au)"}
                </p>
              </div>
              <div>
                <Label htmlFor="contract-date" className="text-sm font-medium">
                  Datum smlouvy <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contract-date"
                  type="date"
                  value={formData.contract_date}
                  onChange={(e) => handleInputChange("contract_date", e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maturity-date" className="text-sm font-medium">Lhůta pro ukončení</Label>
                <Input
                  id="maturity-date"
                  type="date"
                  value={formData.maturity_date}
                  disabled
                  className="mt-1 bg-neutral-100"
                />
                <p className="text-xs text-neutral-500 mt-1">Vypočítáno automaticky</p>
              </div>
              <div>
                <Label htmlFor="auto-renewal" className="text-sm font-medium">Automatické obnovení</Label>
                <Select value={formData.automatic_renewal} onValueChange={(value) => handleInputChange("automatic_renewal", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Ano</SelectItem>
                    <SelectItem value="No">Ne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="interest-paid" className="text-sm font-medium">Datum výplaty úroku</Label>
                <Input
                  id="interest-paid"
                  type="date"
                  value={formData.interest_paid_date}
                  onChange={(e) => handleInputChange("interest_paid_date", e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Doplňující informace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Veřejné poznámky</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Přidejte jakékoli veřejné poznámky k tomuto vkladu..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="internal-info" className="text-sm font-medium">Interní informace</Label>
                <Textarea
                  id="internal-info"
                  value={formData.internal_information}
                  onChange={(e) => handleInputChange("internal_information", e.target.value)}
                  placeholder="Přidejte interní informace (pouze pro zaměstnance)..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Dashboard"))}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gradient-bg hover:opacity-90 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Vytváření..." : "Vytvořit vklad"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
