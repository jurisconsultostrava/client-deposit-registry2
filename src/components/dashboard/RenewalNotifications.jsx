import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, AlertCircle, CheckCircle, Users } from "lucide-react";
import { format } from "date-fns";
import AutoRenewalService from "./AutoRenewalService";

export default function RenewalNotifications() {
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUpcomingRenewals();
  }, []);

  const loadUpcomingRenewals = async () => {
    setIsLoading(true);
    try {
      const renewals = await AutoRenewalService.getUpcomingRenewals(90); // 90 dnů
      setUpcomingRenewals(renewals);
    } catch (error) {
      console.error("Chyba při načítání nadcházejících obnovení:", error);
    }
    setIsLoading(false);
  };

  const processRenewals = async () => {
    setIsProcessing(true);
    try {
      const processed = await AutoRenewalService.checkAndProcessRenewals();
      setLastProcessed(processed);
      
      // Znovu načíst nadcházející obnovení
      await loadUpcomingRenewals();
      
      if (processed.length === 0) {
        alert("Žádné vklady nebyly dnes obnoveny.");
      }
    } catch (error) {
      console.error("Chyba při zpracování obnovení:", error);
      alert("Chyba při zpracování automatických obnovení.");
    }
    setIsProcessing(false);
  };

  const getDaysUntilRenewal = (maturityDate) => {
    const today = new Date();
    const maturity = new Date(maturityDate);
    const diffTime = maturity - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBadgeColor = (days) => {
    if (days <= 0) return "bg-red-100 text-red-800";
    if (days <= 7) return "bg-red-100 text-red-800";
    if (days <= 30) return "bg-orange-100 text-orange-800";
    if (days <= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getCommodityColor = (commodity) => {
    const colors = {
      "Au": "bg-yellow-100 text-yellow-800",
      "Ag": "bg-gray-100 text-gray-800",
      "Pt": "bg-purple-100 text-purple-800",
      "Pd": "bg-indigo-100 text-indigo-800",
      "Other": "bg-orange-100 text-orange-800"
    };
    return colors[commodity] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Automatické obnovení vkladů
            <Badge variant="outline" className="ml-2">
              <Users className="w-3 h-3 mr-1" />
              {upcomingRenewals.length} klientů
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={processRenewals}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? "Zpracovávání..." : "Zkontrolovat obnovení"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastProcessed.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Dnes bylo automaticky obnoveno {lastProcessed.length} vkladů:</p>
                {lastProcessed.map((renewal, index) => (
                  <div key={index} className="text-sm">
                    • {renewal.client_name} ({renewal.contract_number}): {renewal.old_maturity} → {renewal.new_maturity}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Načítání nadcházejících obnovení...</p>
          </div>
        ) : upcomingRenewals.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Žádná nadcházející automatická obnovení v příštích 90 dnech</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">
              Nadcházející obnovení (příštích 90 dní): {upcomingRenewals.length} klientů
            </h4>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {upcomingRenewals.map((renewal) => {
                const days = getDaysUntilRenewal(renewal.maturity_date);
                return (
                  <div key={renewal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">{renewal.client_name}</p>
                        <Badge className={getCommodityColor(renewal.commodity)}>
                          {renewal.commodity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600">{renewal.contract_number}</p>
                        <p className="text-sm text-gray-600">
                          {renewal.investment_amount?.toLocaleString('cs-CZ')} g
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(renewal.maturity_date), "dd. MM. yyyy")}
                      </p>
                      <div className="flex justify-end mt-1">
                        <Badge className={getBadgeColor(days)}>
                          {days <= 0 ? "Dnes obnovit!" : 
                           days === 1 ? "Zítra" : 
                           days <= 7 ? `${days} dní` :
                           days <= 30 ? `${days} dní` :
                           `${days} dní`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Statistiky */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Přehled obnovení:</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-red-800">Do 7 dní: </span>
                  <span className="text-red-700">
                    {upcomingRenewals.filter(r => getDaysUntilRenewal(r.maturity_date) <= 7).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-orange-800">Do 30 dní: </span>
                  <span className="text-orange-700">
                    {upcomingRenewals.filter(r => getDaysUntilRenewal(r.maturity_date) <= 30).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-yellow-800">Do 60 dní: </span>
                  <span className="text-yellow-700">
                    {upcomingRenewals.filter(r => getDaysUntilRenewal(r.maturity_date) <= 60).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Do 90 dní: </span>
                  <span className="text-blue-700">
                    {upcomingRenewals.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}