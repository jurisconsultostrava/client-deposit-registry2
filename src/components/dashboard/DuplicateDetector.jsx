
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, Trash2, Users } from "lucide-react";
import { format } from "date-fns";

export default function DuplicateDetector({ deposits, onRefresh }) {
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    findDuplicates();
  }, [deposits]);

  const findDuplicates = () => {
    const duplicateGroups = [];
    const processedIds = new Set();

    deposits.forEach((deposit, index) => {
      if (processedIds.has(deposit.id)) return;

      const duplicatesForThis = deposits.filter((other, otherIndex) => {
        if (index === otherIndex || processedIds.has(other.id)) return false;

        // Kritéria pro duplicitu
        const sameName = deposit.client_first_name === other.client_first_name && 
                        deposit.client_last_name === other.client_last_name;
        
        const sameContract = deposit.contract_number && other.contract_number && 
                           deposit.contract_number === other.contract_number;
        
        const sameEmail = deposit.email && other.email && 
                         deposit.email.toLowerCase() === other.email.toLowerCase();

        return sameName || sameContract || sameEmail;
      });

      if (duplicatesForThis.length > 0) {
        const group = [deposit, ...duplicatesForThis];
        duplicateGroups.push(group);
        
        // Označit všechny záznamy ve skupině jako zpracované
        group.forEach(item => processedIds.add(item.id));
      }
    });

    setDuplicates(duplicateGroups);
  };

  const formatClientName = (deposit) => {
    return `${deposit.client_first_name || ''} ${deposit.client_last_name || ''}`.trim();
  };

  const safeFormatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, "dd.MM.yyyy");
    } catch (error) {
      return "N/A";
    }
  };

  const getDuplicateReason = (group) => {
    const first = group[0];
    const reasons = [];

    if (group.some(d => d.contract_number === first.contract_number && first.contract_number)) {
      reasons.push("Stejné číslo smlouvy");
    }
    if (group.some(d => formatClientName(d) === formatClientName(first) && formatClientName(first))) {
      reasons.push("Stejné jméno");
    }
    if (group.some(d => d.email === first.email && first.email)) {
      reasons.push("Stejný email");
    }

    return reasons.join(", ");
  };

  if (duplicates.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="w-5 h-5" />
            Detekované duplicity
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {duplicates.length} skupin duplicit
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDuplicates(!showDuplicates)}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showDuplicates ? "Skrýt" : "Zobrazit"} duplicity
          </Button>
        </div>
      </CardHeader>

      {showDuplicates && (
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nalezeno {duplicates.length} skupin duplicitních záznamů.</strong>
              <br />
              Pro odstranění duplicit přejděte do Workspace → Data → Deposit a smažte nepotřebné záznamy.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {duplicates.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-orange-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-orange-900">
                    Skupina {groupIndex + 1} - {getDuplicateReason(group)}
                  </h4>
                  <Badge className="bg-orange-100 text-orange-800">
                    {group.length} záznamů
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.map((deposit, index) => (
                    <div key={deposit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {formatClientName(deposit) || "Bez jména"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Smlouva: {deposit.contract_number || "N/A"}</span>
                          <span>Email: {deposit.email || "N/A"}</span>
                          <span>Vytvořeno: {safeFormatDate(deposit.created_date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">ID: {deposit.id}</p>
                        {index > 0 && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Možná duplicita
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Postup odstranění duplicit:</h5>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Přejděte do Workspace → Data → Deposit</li>
              <li>Najděte záznamy se stejným ID jako výše</li>
              <li>Porovnejte data a ponechte nejúplnější záznam</li>
              <li>Označte duplicitní záznamy a smažte je</li>
              <li>Obnovte stránku pro aktualizaci</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
