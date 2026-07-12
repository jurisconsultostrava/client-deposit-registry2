
import React, { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Download } from "lucide-react";
import GoldPriceService from "../gold/GoldPriceService";

export default function DepositTable({ deposits, isLoading, onClientClick, priceData }) {
  const [generatingPDFs, setGeneratingPDFs] = useState(new Set());

  const getStatusColor = (status) => {
    return status === "Yes" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
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

  const formatValue = (value, priceData, commodity) => {
    const calculatedValue = GoldPriceService.calculateValueCZK(value, priceData, commodity);
    if (calculatedValue === 0) {
      return commodity === "Au" ? "N/A" : "-";
    }
    return calculatedValue.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' });
  };

  const safeFormatDate = (dateValue) => {
    if (!dateValue) return "-";
    try {
      // Pokud je dateValue už Date objekt
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return "-";
        return format(dateValue, "dd.MM.yyyy");
      }
      
      // Pokud je string
      if (typeof dateValue === 'string') {
        // Zkus různé formáty
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "-";
        return format(date, "dd.MM.yyyy");
      }
      
      return "-";
    } catch (error) {
      console.warn("Chyba při formátování data:", dateValue, error);
      return "-";
    }
  };

  const safeFormatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    return Number(value).toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
  };

  const handleGeneratePDF = async (deposit, e) => {
    e.stopPropagation(); // Zabráni otevření detailu
    
    setGeneratingPDFs(prev => new Set([...prev, deposit.id]));
    
    try {
      // Import funkce dynamicky
      const { generateDepositPDF } = await import("@/functions/generateDepositPDF");
      const response = await generateDepositPDF({ depositId: deposit.id });
      
      // Vytvoř blob z odpovědi
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Vytvoř a klikni na odkaz pro stažení
      const a = document.createElement('a');
      a.href = url;
      a.download = `smlouva_${deposit.contract_number || deposit.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Vyčisti
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Chyba při generování PDF:', error);
      alert('Chyba při generování PDF dokumentu');
    } finally {
      setGeneratingPDFs(prev => {
        const newSet = new Set(prev);
        newSet.delete(deposit.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              <TableHead>Klient</TableHead>
              <TableHead>Číslo smlouvy</TableHead>
              <TableHead>Komodita</TableHead>
              <TableHead className="text-right">Hmotnost (g)</TableHead>
              <TableHead className="text-right">Aktuální hodnota</TableHead>
              <TableHead>Datum smlouvy</TableHead>
              <TableHead>Lhůta pro ukončení</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-32">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(10).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(9).fill(0).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!deposits.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <div className="text-neutral-500">
          <p className="text-lg font-medium">Nebyly nalezeny žádné vklady</p>
          <p className="text-sm mt-2">Zkuste upravit vyhledávání nebo filtry</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50 hover:bg-neutral-100">
              <TableHead className="font-semibold min-w-[180px]">Klient</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Číslo smlouvy</TableHead>
              <TableHead className="font-semibold min-w-[80px]">Komodita</TableHead>
              <TableHead className="font-semibold text-right min-w-[100px]">Hmotnost (g)</TableHead>
              <TableHead className="font-semibold text-right min-w-[140px]">Aktuální hodnota CZK</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Datum smlouvy</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Lhůta pro ukončení</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Stav</TableHead>
              <TableHead className="font-semibold w-32 text-center">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.map((deposit) => (
              <TableRow 
                key={deposit.id} 
                className="hover:bg-neutral-50 transition-colors"
              >
                <TableCell className="font-medium">
                    <div className="font-bold">{deposit.client_first_name} {deposit.client_last_name}</div>
                    <div className="text-xs text-neutral-500">{deposit.email}</div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {deposit.contract_number || "-"}
                </TableCell>
                <TableCell>
                  <Badge className={getCommodityColor(deposit.commodity)}>
                    {deposit.commodity || "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {deposit.investment_amount ? safeFormatNumber(deposit.investment_amount) : "-"}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatValue(deposit.investment_amount, priceData, deposit.commodity)}
                </TableCell>
                <TableCell>
                  {safeFormatDate(deposit.contract_date)}
                </TableCell>
                <TableCell>
                  {safeFormatDate(deposit.maturity_date)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge className={getStatusColor(deposit.closed)}>
                      {deposit.closed === "Yes" ? "Ukončeno" : "Aktivní"}
                    </Badge>
                    <Badge variant={deposit.automatic_renewal === 'Yes' ? 'default' : 'secondary'} className="text-xs">
                      {deposit.automatic_renewal === "Yes" ? "Auto" : "Manuál"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="w-32">
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onClientClick(deposit)}
                      className="p-2 h-8 w-8"
                      title="Zobrazit detail"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleGeneratePDF(deposit, e)}
                      disabled={generatingPDFs.has(deposit.id)}
                      className="p-2 h-8 w-8 bg-green-50 border-green-200 hover:bg-green-100"
                      title="Stáhnout PDF"
                    >
                      {generatingPDFs.has(deposit.id) ? (
                        <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-3 h-3 text-green-600" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
