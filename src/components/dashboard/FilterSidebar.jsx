
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

export default function FilterSidebar({ filters, setFilters }) {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5" />
          Možnosti filtru
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contract-type">Typ smlouvy</Label>
          <Select value={filters.contractType} onValueChange={(value) => handleFilterChange("contractType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Všechny typy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny typy</SelectItem>
              <SelectItem value="Gold Deposit">Gold Deposit</SelectItem>
              <SelectItem value="Silver Deposit">Silver Deposit</SelectItem>
              <SelectItem value="Other">Ostatní</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="commodity">Komodita</Label>
          <Select value={filters.commodity} onValueChange={(value) => handleFilterChange("commodity", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Všechny komodity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny komodity</SelectItem>
              <SelectItem value="Au">Zlato (Au)</SelectItem>
              <SelectItem value="Ag">Stříbro (Ag)</SelectItem>
              <SelectItem value="Pt">Platina (Pt)</SelectItem>
              <SelectItem value="Pd">Palladium (Pd)</SelectItem>
              <SelectItem value="Other">Ostatní</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Stav</Label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Všechny stavy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny stavy</SelectItem>
              <SelectItem value="No">Aktivní</SelectItem>
              <SelectItem value="Yes">Ukončeno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="renewal">Automatické obnovení</Label>
          <Select value={filters.renewal} onValueChange={(value) => handleFilterChange("renewal", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Všechna obnovení" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechna obnovení</SelectItem>
              <SelectItem value="Yes">Ano</SelectItem>
              <SelectItem value="No">Ne</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
