
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle, Percent, Eye } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

export default function InterestReminder({ deposits, onRefresh }) {
  const [upcomingInterestReminders, setUpcomingInterestReminders] = useState([]);
  const [overdueInterest, setOverdueInterest] = useState([]);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    calculateInterestReminders();
  }, [deposits]);

  const calculateInterestReminders = () => {
    const today = new Date();
    const upcoming = [];
    const overdue = [];

    deposits.forEach(deposit => {
      if (!deposit.contract_date || deposit.closed === "Yes") return;

      try {
        const contractDate = new Date(deposit.contract_date);
        
        // Validace data smlouvy
        if (isNaN(contractDate.getTime())) {
          console.warn(`Neplatné datum smlouvy pro vklad ${deposit.id}:`, deposit.contract_date);
          return;
        }
        
        // Spočítej datum nároku na úrok (30 dní od uzavření smlouvy)
        const interestDueDate = addDays(contractDate, 30);
        
        // Spočítej datum připomenutí fixace (60 dní před aktuální lhůtou pro ukončení)
        let maturityDate;
        if (deposit.maturity_date) {
          maturityDate = new Date(deposit.maturity_date);
          if (isNaN(maturityDate.getTime())) {
            // Pokud je datum lhůty neplatné, vypočítej ho
            maturityDate = addDays(contractDate, 359);
          }
        } else {
          maturityDate = addDays(contractDate, 359);
        }
        
        const reminderDate = addDays(maturityDate, -60); // 60 dní před lhůtou
        
        // Zkontroluj, zda je potřeba připomenout fixaci
        const daysUntilReminder = differenceInDays(reminderDate, today);
        const daysAfterInterestDue = differenceInDays(today, interestDueDate);

        const reminderInfo = {
          id: deposit.id,
          client_name: `${deposit.client_first_name} ${deposit.client_last_name}`,
          contract_number: deposit.contract_number,
          contract_date: deposit.contract_date,
          interest_due_date: interestDueDate,
          reminder_date: reminderDate,
          maturity_date: maturityDate,
          interest_paid_date: deposit.interest_paid_date,
          investment_amount: deposit.investment_amount,
          commodity: deposit.commodity,
          days_until_reminder: daysUntilReminder,
          days_after_due: daysAfterInterestDue,
          interest_amount: (deposit.investment_amount || 0) * 0.1 // 10% z hmotnosti
        };

        // Pokud je doba připomenutí fixace v rozmezí 0-60 dní
        if (daysUntilReminder >= 0 && daysUntilReminder <= 60) {
          upcoming.push(reminderInfo);
        }

        // Pokud už uplynul nárok na úrok a nebyl vyplacen
        if (daysAfterInterestDue > 0 && !deposit.interest_paid_date) {
          overdue.push(reminderInfo);
        }
      } catch (error) {
        console.warn(`Chyba při zpracování dat pro vklad ${deposit.id}:`, error);
      }
    });

    // Seřaď podle blízkosti termínu
    upcoming.sort((a, b) => a.days_until_reminder - b.days_until_reminder);
    overdue.sort((a, b) => b.days_after_due - a.days_after_due);

    setUpcomingInterestReminders(upcoming);
    setOverdueInterest(overdue);
  };

  const getBadgeColor = (days, isOverdue = false) => {
    if (isOverdue) return "bg-red-100 text-red-800";
    if (days <= 7) return "bg-red-100 text-red-800";
    if (days <= 30) return "bg-orange-100 text-orange-800";
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

  const totalReminders = upcomingInterestReminders.length + overdueInterest.length;

  if (totalReminders === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Percent className="w-5 h-5" />
            Připomenutí fixace odměny
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {totalReminders} smluv
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReminders(!showReminders)}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showReminders ? "Skrýt" : "Zobrazit"} připomenutí
          </Button>
        </div>
      </CardHeader>

      {showReminders && (
        <CardContent className="space-y-4">
          {/* Upozornění na nevyplacené úroky */}
          {overdueInterest.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pozor!</strong> {overdueInterest.length} smluv má nárok na úrok, ale nebyl ještě vyplacen.
              </AlertDescription>
            </Alert>
          )}

          {/* Nadcházející připomenutí fixace */}
          {upcomingInterestReminders.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-orange-900">
                Nadcházející fixace odměny (60 dní před lhůtou):
              </h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {upcomingInterestReminders.map((reminder) => (
                  <div key={reminder.id} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-gray-900">{reminder.client_name}</p>
                          <Badge className={getCommodityColor(reminder.commodity)}>
                            {reminder.commodity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Smlouva:</span> {reminder.contract_number}
                          </div>
                          <div>
                            <span className="font-medium">Hmotnost:</span> {reminder.investment_amount?.toLocaleString('cs-CZ')} g
                          </div>
                          <div>
                            <span className="font-medium">Odměna (10%):</span> {reminder.interest_amount?.toLocaleString('cs-CZ')} g
                          </div>
                          <div>
                            <span className="font-medium">Lhůta pro ukončení:</span> {format(reminder.maturity_date, "dd.MM.yyyy")}
                          </div>
                          <div>
                            <span className="font-medium">Nárok od:</span> {format(reminder.interest_due_date, "dd.MM.yyyy")}
                          </div>
                          <div>
                            <span className="font-medium">Připomenout fixaci:</span> {format(reminder.reminder_date, "dd.MM.yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-900 mb-1">
                          Fixace za {reminder.days_until_reminder} dní
                        </p>
                        <Badge className={getBadgeColor(reminder.days_until_reminder)}>
                          {format(reminder.reminder_date, "dd.MM.yyyy")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nevyplacené úroky */}
          {overdueInterest.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-red-900">
                Nevyplacené úroky ({overdueInterest.length} smluv):
              </h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {overdueInterest.map((reminder) => (
                  <div key={reminder.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-gray-900">{reminder.client_name}</p>
                          <Badge className={getCommodityColor(reminder.commodity)}>
                            {reminder.commodity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Smlouva:</span> {reminder.contract_number}
                          </div>
                          <div>
                            <span className="font-medium">Odměna k výplatě:</span> {reminder.interest_amount?.toLocaleString('cs-CZ')} g
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-900 mb-1">
                          Nárok již {reminder.days_after_due} dní
                        </p>
                        <Badge className="bg-red-100 text-red-800">
                          Od {format(reminder.interest_due_date, "dd.MM.yyyy")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vysvětlení */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Informace o úrocích:</h5>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Nárok na úrok:</strong> 30 dní od uzavření smlouvy</li>
              <li><strong>Výše odměny:</strong> 10% z hmotnosti kovu ve zlatých slitcích</li>
              <li><strong>Připomenutí fixace:</strong> 60 dní před aktuální lhůtou pro ukončení</li>
              <li><strong>Datum výplaty:</strong> Zadejte v detailu smlouvy po vyplacení</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
