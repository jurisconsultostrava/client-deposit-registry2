
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TrendingUp, RefreshCw, Edit, DollarSign, Euro, Clock } from "lucide-react";
import GoldPriceService from "./GoldPriceService";

export default function GoldPriceDisplay({ priceData, onPriceUpdate, showTitle = true }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showManualUpdate, setShowManualUpdate] = useState(false);
  const [manualPriceCzk, setManualPriceCzk] = useState("");
  const [manualPriceUsd, setManualPriceUsd] = useState("");
  const [manualRate, setManualRate] = useState("");
  
  useEffect(() => {
    if (priceData) {
      setManualPriceCzk(priceData.price_czk_oz?.toString() || "");
      setManualPriceUsd(priceData.price_usd_oz?.toString() || "");
      setManualRate(priceData.exchange_rate_usd_czk?.toString() || "");
    }
  }, [priceData]);

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      const newPrices = await GoldPriceService.fetchFromGoldAPI();
      onPriceUpdate(newPrices);
    } catch (error) {
      console.error("Chyba při aktualizaci cen:", error);
      alert("Nepodařilo se aktualizovat ceny z API. Používají se poslední známé hodnoty.");
    }
    setIsUpdating(false);
  };

  const handleManualUpdate = async () => {
    if (!manualPriceCzk || isNaN(parseFloat(manualPriceCzk))) {
      alert("Prosím zadejte platnou cenu v CZK");
      return;
    }
    
    try {
      const newPrices = await GoldPriceService.updatePricesManually(
        parseFloat(manualPriceCzk),
        manualPriceUsd ? parseFloat(manualPriceUsd) : null,
        manualRate ? parseFloat(manualRate) : null
      );
      onPriceUpdate(newPrices);
      setShowManualUpdate(false);
    } catch (error) {
      console.error("Chyba při manuální aktualizaci:", error);
      alert("Chyba při ukládání cen: " + error.message);
    }
  };

  const getSourceBadge = (source) => {
    const badges = {
      'goldapi': { text: 'GoldAPI', color: 'bg-green-100 text-green-800' },
      'API': { text: 'API', color: 'bg-green-100 text-green-800' },
      'manual': { text: 'Manuální', color: 'bg-blue-100 text-blue-800' },
      'default': { text: 'Výchozí', color: 'bg-yellow-100 text-yellow-800' },
      'emergency': { text: 'Nouzové', color: 'bg-red-100 text-red-800' }
    };
    
    const badge = badges[source] || { text: source || 'N/A', color: 'bg-gray-100 text-gray-800' };
    return <Badge className={`${badge.color} text-xs`}>{badge.text}</Badge>;
  };

  // Bezpečné formátování cen s kontrolou undefined
  const formatPrice = (price, decimals = 0) => {
    if (price === null || price === undefined || isNaN(price)) {
      return "N/A";
    }
    // Using Number() to ensure it's a number before calling toLocaleString
    return Number(price).toLocaleString('cs-CZ', { maximumFractionDigits: decimals });
  };

  const formatCurrency = (price, currency = 'CZK') => {
    if (price === null || price === undefined || isNaN(price)) {
      return "N/A";
    }
    // Using Number() to ensure it's a number before calling toLocaleString
    return Number(price).toLocaleString('cs-CZ', { style: 'currency', currency: currency });
  };

  if (!showTitle) {
    return (
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-yellow-700">
          {priceData?.price_czk_oz ? formatCurrency(priceData.price_czk_oz, 'CZK') : "N/A"}
        </span>
        <span className="text-xs text-gray-500">/oz</span>
      </div>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-yellow-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <span className="text-lg">Aktuální cena zlata</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualUpdate(true)}
                className="text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Upravit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isUpdating}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                Aktualizovat
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
            {/* Hlavní cena v CZK */}
            <div className="flex items-baseline gap-2">
              <Euro className="w-6 h-6 text-green-700" />
              <div>
                <span className="text-3xl font-bold text-green-800">
                  {formatPrice(priceData?.price_czk_oz)}
                </span>
                <span className="text-sm text-gray-600 ml-1">CZK/oz</span>
              </div>
            </div>
            
            {/* Cena v USD (pokud je dostupná) */}
            {priceData?.price_usd_oz !== undefined && priceData?.price_usd_oz !== null && (
              <div className="flex items-baseline gap-2">
                <DollarSign className="w-5 h-5 text-blue-700" />
                <div>
                  <span className="text-xl font-bold text-blue-800">
                    {formatPrice(priceData.price_usd_oz, 3)}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">USD/oz</span>
                </div>
              </div>
            )}
            
            {/* Směnný kurz (pokud je dostupný) */}
            {priceData?.exchange_rate_usd_czk !== undefined && priceData?.exchange_rate_usd_czk !== null && (
              <div className="flex items-baseline gap-2">
                <Euro className="w-4 h-4 text-purple-700" />
                <div>
                  <span className="text-lg font-semibold text-purple-800">
                    {formatPrice(priceData.exchange_rate_usd_czk, 4)}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">USD/CZK</span>
                </div>
              </div>
            )}
            
            {/* Cena za gram */}
            <div className="flex items-baseline gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
              <div>
                <span className="text-lg font-semibold text-amber-800">
                  {priceData?.price_czk_oz ? formatPrice(priceData.price_czk_oz / GoldPriceService.TROY_OUNCE_IN_GRAMS, 2) : "N/A"}
                </span>
                <span className="text-sm text-gray-600 ml-1">CZK/g</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <Badge variant="outline" className="text-xs">
              {GoldPriceService.formatLastUpdate(priceData)}
            </Badge>
            {getSourceBadge(priceData?.source)}
          </div>
        </CardContent>
      </Card>

      {/* Manuální aktualizace dialog */}
      <Dialog open={showManualUpdate} onOpenChange={setShowManualUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuální aktualizace cen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-price-czk">
                Cena zlata (CZK za trojskou unci) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="manual-price-czk"
                type="number"
                step="0.01"
                value={manualPriceCzk}
                onChange={(e) => setManualPriceCzk(e.target.value)}
                placeholder="Např. 75000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-price-usd">Cena zlata (USD za trojskou unci)</Label>
              <Input
                id="manual-price-usd"
                type="number"
                step="0.001"
                value={manualPriceUsd}
                onChange={(e) => setManualPriceUsd(e.target.value)}
                placeholder="Např. 2650.50 (volitelné)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-rate">Směnný kurz USD/CZK</Label>
              <Input
                id="manual-rate"
                type="number"
                step="0.0001"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                placeholder="Např. 23.5000 (volitelné)"
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <strong>Poznámka:</strong> Povinná je pouze cena v CZK. Ostatní hodnoty jsou volitelné a slouží pouze pro informaci.
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowManualUpdate(false)}>
                Zrušit
              </Button>
              <Button onClick={handleManualUpdate}>
                Aktualizovat ceny
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
