
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Deposit } from "@/entities/Deposit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Save, X, Info, Download } from "lucide-react";
import GoldPriceService from "../gold/GoldPriceService";

export default function ClientDetailModal({ client, onClose, onUpdate, priceData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editedClient, setEditedClient] = useState(client);

  useEffect(() => {
    setEditedClient(client);
  }, [client]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...editedClient,
        investment_amount: parseFloat(editedClient.investment_amount) || 0,
        current_value_czk: GoldPriceService.calculateValueCZK(editedClient.investment_amount, priceData, editedClient.commodity)
      };
      // remove fields that are not in the entity
      delete dataToSave.total;
      delete dataToSave.total_metal;
      
      await Deposit.update(client.id, dataToSave);
      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating client:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedClient(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (isEditing) {
      const currentValue = GoldPriceService.calculateValueCZK(editedClient.investment_amount, priceData, editedClient.commodity);
      handleInputChange("current_value_czk", currentValue);
    }
  }, [editedClient.investment_amount, editedClient.commodity, priceData, isEditing]);

  const calculateMaturityDate = (contractDate) => {
    if (!contractDate) return null;
    const date = new Date(contractDate);
    date.setDate(date.getDate() + 359); // Přidat 359 dní
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isEditing && editedClient.contract_date) {
      const newMaturityDate = calculateMaturityDate(editedClient.contract_date);
      if (newMaturityDate !== editedClient.maturity_date) {
        handleInputChange("maturity_date", newMaturityDate);
      }
    }
  }, [editedClient.contract_date, isEditing]);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Dynamically import the function
      const { generateDepositPDF } = await import("@/functions/generateDepositPDF");
      const response = await generateDepositPDF({ depositId: client.id });
      
      // Vytvoř blob z odpovědi
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Vytvoř a klikni na odkaz pro stažení
      const a = document.createElement('a');
      a.href = url;
      a.download = `smlouva_${client.contract_number || client.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Vyčisti
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Chyba při generování PDF:', error);
      alert('Chyba při generování PDF dokumentu: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const displayValue = GoldPriceService.calculateValueCZK(editedClient.investment_amount, priceData, editedClient.commodity);

  // Bezpečná funkce pro formátování hodnot
  const safeFormatNumber = (value, options = {}) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    return Number(value).toLocaleString('cs-CZ', options);
  };

  const safeFormatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    return Number(value).toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' });
  };

  const safeFormatDate = (dateValue) => {
    if (!dateValue) return "-";
    try {
      // Pokud je dateValue už Date objekt
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return "-";
        return format(dateValue, "dd. MM. yyyy");
      }
      
      // Pokud je string
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "-";
        return format(date, "dd. MM. yyyy");
      }
      
      return "-";
    } catch (error) {
      console.warn("Chyba při formátování data:", dateValue, error);
      return "-";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="w-6 h-6" />
            Detail klienta - {editedClient.client_first_name} {editedClient.client_last_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Přehled</TabsTrigger>
            <TabsTrigger value="contract">Detaily smlouvy</TabsTrigger>
            <TabsTrigger value="interest">Úroky a odměny</TabsTrigger>
            <TabsTrigger value="notes">Poznámky</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Osobní údaje
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">Křestní jméno</Label>
                  {isEditing ? (
                    <Input
                      id="first-name"
                      value={editedClient.client_first_name}
                      onChange={(e) => handleInputChange("client_first_name", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-semibold">{editedClient.client_first_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last-name">Příjmení</Label>
                  {isEditing ? (
                    <Input
                      id="last-name"
                      value={editedClient.client_last_name}
                      onChange={(e) => handleInputChange("client_last_name", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-semibold">{editedClient.client_last_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dob">Datum narození</Label>
                  {isEditing ? (
                    <Input
                      id="dob"
                      type="date"
                      value={editedClient.client_date_of_birth?.split('T')[0] || ""}
                      onChange={(e) => handleInputChange("client_date_of_birth", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg">{safeFormatDate(editedClient.client_date_of_birth)}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedClient.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg">{editedClient.phone || "-"}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedClient.email || ""}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg">{editedClient.email || "-"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informace o smlouvě
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract-type">Typ smlouvy</Label>
                  {isEditing ? (
                    <Select value={editedClient.contract_type} onValueChange={(value) => handleInputChange("contract_type", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gold Deposit">Gold Deposit</SelectItem>
                        <SelectItem value="Silver Deposit">Silver Deposit</SelectItem>
                        <SelectItem value="Other">Ostatní</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-semibold">{editedClient.contract_type}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contract-number">Číslo smlouvy</Label>
                  {isEditing ? (
                    <Input
                      id="contract-number"
                      value={editedClient.contract_number}
                      onChange={(e) => handleInputChange("contract_number", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-mono">{editedClient.contract_number}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="commodity">Komodita</Label>
                  {isEditing ? (
                    <Select value={editedClient.commodity} onValueChange={(value) => handleInputChange("commodity", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Au">Zlato (Au)</SelectItem>
                        <SelectItem value="Ag">Stříbro (Ag)</SelectItem>
                        <SelectItem value="Pt">Platina (Pt)</SelectItem>
                        <SelectItem value="Pd">Palladium (Pd)</SelectItem>
                        <SelectItem value="Other">Ostatní</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 text-base">{editedClient.commodity}</Badge>
                  )}
                </div>
                <div>
                  <Label htmlFor="investment-amount">Hmotnost kovu (g)</Label>
                  {isEditing ? (
                    <Input
                      id="investment-amount"
                      type="number"
                      step="0.01"
                      value={editedClient.investment_amount}
                      onChange={(e) => handleInputChange("investment_amount", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-semibold">{safeFormatNumber(editedClient.investment_amount)} g</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="current-value">Aktuální hodnota CZK</Label>
                  <p className="text-lg font-bold text-green-600">
                    {editedClient.commodity === "Au" ? safeFormatCurrency(displayValue) : "-"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {editedClient.commodity === "Au" ? "Dynamicky vypočítáno" : "Pouze pro zlato (Au)"}
                  </p>
                </div>
                <div>
                  <Label htmlFor="gold-price-at-creation">Cena AU při založení</Label>
                   <p className="text-lg text-neutral-600">${editedClient.gold_price ? safeFormatNumber(editedClient.gold_price, { maximumFractionDigits: 3 }) : "N/A"} /oz</p>
                </div>
                
                <div>
                  <Label htmlFor="contract-date">Datum smlouvy</Label>
                  {isEditing ? (
                    <Input
                      id="contract-date"
                      type="date"
                      value={editedClient.contract_date?.split('T')[0] || ""}
                      onChange={(e) => handleInputChange("contract_date", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg">{safeFormatDate(editedClient.contract_date)}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="maturity-date">Lhůta pro ukončení</Label>
                  <p className="text-lg">{safeFormatDate(editedClient.maturity_date)}</p>
                  <p className="text-xs text-neutral-500">Vypočítáno automaticky</p>
                </div>
                <div>
                  <Label htmlFor="auto-renewal">Aut. obnovení</Label>
                  {isEditing ? (
                    <Select value={editedClient.automatic_renewal} onValueChange={(value) => handleInputChange("automatic_renewal", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Ano</SelectItem>
                        <SelectItem value="No">Ne</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                     <Badge variant={editedClient.automatic_renewal === 'Yes' ? 'default' : 'secondary'} className="text-base">{editedClient.automatic_renewal === "Yes" ? "Ano" : "Ne"}</Badge>
                  )}
                </div>
                <div>
                  <Label htmlFor="closed">Stav</Label>
                  {isEditing ? (
                    <Select value={editedClient.closed} onValueChange={(value) => handleInputChange("closed", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">Aktivní</SelectItem>
                        <SelectItem value="Yes">Ukončeno</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                     <Badge variant={editedClient.closed === 'Yes' ? 'destructive' : 'default'} className="text-base">{editedClient.closed === "Yes" ? "Ukončeno" : "Aktivní"}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interest" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Úroky a odměny
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Datum nároku na úrok</Label>
                    <p className="text-lg font-semibold text-blue-600">
                      {editedClient.contract_date ? 
                        (() => {
                          const contractDate = new Date(editedClient.contract_date);
                          const interestDueDate = new Date(contractDate);
                          interestDueDate.setDate(interestDueDate.getDate() + 30);
                          return safeFormatDate(interestDueDate.toISOString().split('T')[0]);
                        })() : 
                        "-"
                      }
                    </p>
                    <p className="text-xs text-neutral-500">30 dní od uzavření smlouvy</p>
                  </div>
                  
                  <div>
                    <Label>Výše odměny (10% z hmotnosti)</Label>
                    <p className="text-lg font-semibold text-green-600">
                      {editedClient.investment_amount ? 
                        `${(editedClient.investment_amount * 0.1).toLocaleString('cs-CZ')} g zlata` : 
                        "-"
                      }
                    </p>
                    <p className="text-xs text-neutral-500">Ve zlatých slitcích nejvyšší kvality</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="interest-paid">Datum skutečné výplaty úroku</Label>
                    {isEditing ? (
                      <Input
                        id="interest-paid"
                        type="date"
                        value={editedClient.interest_paid_date?.split('T')[0] || ""}
                        onChange={(e) => handleInputChange("interest_paid_date", e.target.value)}
                      />
                    ) : (
                      <div>
                        <p className="text-lg font-semibold">
                          {editedClient.interest_paid_date ? safeFormatDate(editedClient.interest_paid_date) : "-"}
                        </p>
                        {!editedClient.interest_paid_date && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 mt-1">
                            Čeká na výplatu
                          </Badge>
                        )}
                        {editedClient.interest_paid_date && (
                          <Badge className="bg-green-100 text-green-800 mt-1">
                            Vyplaceno
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Připomenutí fixace odměny</Label>
                    <p className="text-lg font-semibold text-purple-600">
                      {editedClient.contract_date ? 
                        (() => {
                          const contractDate = new Date(editedClient.contract_date);
                          const reminderDate = new Date(contractDate);
                          reminderDate.setDate(reminderDate.getDate() + 305); // 365 - 60 = 305
                          return safeFormatDate(reminderDate.toISOString().split('T')[0]);
                        })() : 
                        "-"
                      }
                    </p>
                    <p className="text-xs text-neutral-500">60 dní před výročím smlouvy</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h5 className="font-medium text-yellow-900 mb-2">Informace o úrocích:</h5>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Nárok na úrok vzniká 30 dní po uzavření smlouvy</li>
                    <li>Výše odměny je 10% z hmotnosti kovu ve zlatých slitcích</li>
                    <li>Připomenutí fixace se zobrazuje 60 dní před výročím</li>
                    <li>Po výplatě úroku zadejte datum do pole "Datum skutečné výplaty"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Poznámky
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notes">Veřejné poznámky</Label>
                  {isEditing ? (
                    <Textarea
                      id="notes"
                      value={editedClient.notes || ""}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Přidejte veřejné poznámky..."
                    />
                  ) : (
                    <p className="text-base bg-neutral-50 p-4 rounded-lg min-h-[60px]">{editedClient.notes || "Nebyly přidány žádné poznámky"}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="internal-info">Interní informace</Label>
                  {isEditing ? (
                    <Textarea
                      id="internal-info"
                      value={editedClient.internal_information || ""}
                      onChange={(e) => handleInputChange("internal_information", e.target.value)}
                      placeholder="Přidejte interní informace..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-base bg-red-50 p-4 rounded-lg border-l-4 border-red-400 min-h-[60px]">{editedClient.internal_information || "Nebyly přidány žádné interní informace"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? "Generování PDF..." : "Generovat PDF"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Zavřít
          </Button>
          {isEditing ? (
            <Button onClick={handleSave} disabled={isSaving} className="gradient-bg text-white">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Ukládání..." : "Uložit změny"}
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="gradient-bg text-white">
              <FileText className="w-4 h-4 mr-2" />
              Upravit detaily
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
