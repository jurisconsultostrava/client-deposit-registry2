
import React, { useState, useEffect } from "react";
import { Deposit } from "../entities/deposit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

import StatsOverview from "../components/dashboard/StatsOverview";
import DepositTable from "../components/dashboard/DepositTable";
import FilterSidebar from "../components/dashboard/FilterSidebar";
import ClientDetailModal from "../components/dashboard/ClientDetailModal";
import ImportModal from "../components/dashboard/ImportModal";
import GoldPriceService from "../components/gold/GoldPriceService";
import GoldPriceDisplay from "../components/gold/GoldPriceDisplay";
import AutoRenewalService from "../components/dashboard/AutoRenewalService";
import RenewalNotifications from "../components/dashboard/RenewalNotifications";
import InterestReminder from "../components/dashboard/InterestReminder";

export default function Dashboard() {
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [filters, setFilters] = useState({
    contractType: "all",
    commodity: "all",
    status: "all",
    renewal: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [priceData, setPriceData] = useState(null);

  const location = useLocation();

  useEffect(() => {
    loadDeposits();
    loadPriceData();
    checkRenewalsOnLoad();
    
    // Zkontroluj URL parametry pro automatické filtry
    const urlParams = new URLSearchParams(location.search);
    const filterParam = urlParams.get('filter');
    const viewParam = urlParams.get('view');
    
    if (filterParam === 'active') {
      setFilters(prev => ({ ...prev, status: "No" }));
      setShowFilters(true);
    }
    
    if (viewParam === 'clients') {
      setShowFilters(true);
    }
  }, [location.search]);

  useEffect(() => {
    applyFilters();
  }, [deposits, searchTerm, filters]);

  const loadDeposits = async () => {
    setIsLoading(true);
    try {
      const data = await Deposit.list("-created_date");
      // Filtruj prázdné záznamy při načítání
      const filteredData = data.filter(deposit => {
        // Záznam je platný, pokud má jméno klienta nebo číslo smlouvy
        const hasValidName = (deposit.client_first_name && deposit.client_first_name.trim() !== "" && deposit.client_first_name !== "null") ||
                            (deposit.client_last_name && deposit.client_last_name.trim() !== "" && deposit.client_last_name !== "null");
        const hasValidContract = deposit.contract_number && deposit.contract_number.trim() !== "" && deposit.contract_number !== "null";
        
        return hasValidName || hasValidContract;
      });
      setDeposits(filteredData);
    } catch (error) {
      console.error("Error loading deposits:", error);
    }
    setIsLoading(false);
  };

  const loadPriceData = async () => {
    try {
      const prices = await GoldPriceService.getCurrentPrices();
      setPriceData(prices);
    } catch (error) {
      console.error("Chyba při načítání cenových dat:", error);
    }
  };

  const handlePriceDataUpdate = (newPrices) => {
    setPriceData(newPrices);
  };

  const checkRenewalsOnLoad = async () => {
    try {
      await AutoRenewalService.checkAndProcessRenewals();
      // After processing renewals, reload deposits to reflect any changes
      loadDeposits();
    } catch (error) {
      console.error("Chyba při automatické kontrole obnovení:", error);
    }
  };

  const applyFilters = () => {
    let filtered = deposits;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(deposit =>
        `${deposit.client_first_name} ${deposit.client_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.contractType !== "all") {
      filtered = filtered.filter(deposit => deposit.contract_type === filters.contractType);
    }
    if (filters.commodity !== "all") {
      filtered = filtered.filter(deposit => deposit.commodity === filters.commodity);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter(deposit => deposit.closed === filters.status);
    }
    if (filters.renewal !== "all") {
      filtered = filtered.filter(deposit => deposit.automatic_renewal === filters.renewal);
    }

    setFilteredDeposits(filtered);
  };

  const handleClientClick = (deposit) => {
    setSelectedClient(deposit);
    setShowClientModal(true);
  };

  const exportToExcel = () => {
    const headers = [
      "Jméno klienta", "Číslo smlouvy", "Typ smlouvy", "Komodita",
      "Hmotnost (g)", "Aktuální hodnota CZK",
      "Datum smlouvy", "Lhůta pro ukončení", "Stav",
      "Obnovení", "Úrok vyplacen", "Telefon", "Email", "Poznámky", "Interní informace"
    ];

    const csvData = filteredDeposits.map(deposit => [
      `${deposit.client_first_name} ${deposit.client_last_name}`,
      deposit.contract_number,
      deposit.contract_type,
      deposit.commodity,
      deposit.investment_amount,
      deposit.commodity === "Au" ? 
        GoldPriceService.calculateValueCZK(deposit.investment_amount, priceData, deposit.commodity).toLocaleString() : 
        "-",
      deposit.contract_date ? format(new Date(deposit.contract_date), "dd-MM-yyyy") : "",
      deposit.maturity_date ? format(new Date(deposit.maturity_date), "dd-MM-yyyy") : "",
      deposit.closed === "Yes" ? "Ukončeno" : "Aktivní",
      deposit.automatic_renewal === "Yes" ? "Ano" : "Ne",
      deposit.interest_paid_date ? format(new Date(deposit.interest_paid_date), "dd-MM-yyyy") : "",
      deposit.phone || "",
      deposit.email || "",
      deposit.notes || "",
      deposit.internal_information || ""
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "export_vkladu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportComplete = () => {
    loadDeposits();
    setShowImportModal(false);
  };

  return (
    <div className="p-4 md:p-8 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Nástěnka vkladů</h1>
            <p className="text-neutral-600 mt-2">Spravujte klientské vklady a sledujte hmotnost uložených kovů</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="flex-1 md:flex-none border-neutral-300 hover:bg-neutral-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importovat
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={filteredDeposits.length === 0}
              className="flex-1 md:flex-none border-neutral-300 hover:bg-neutral-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportovat
            </Button>
            <Link to={createPageUrl("NewDeposit")} className="flex-1 md:flex-none">
              <Button className="w-full gradient-bg hover:opacity-90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nový vklad
              </Button>
            </Link>
          </div>
        </div>

        {/* Gold Price Display */}
        <GoldPriceDisplay
          priceData={priceData}
          onPriceUpdate={handlePriceDataUpdate}
        />

        {/* Interest Reminder instead of Duplicate Detection */}
        <InterestReminder deposits={deposits} onRefresh={loadDeposits} />

        {/* Renewal Notifications */}
        <RenewalNotifications />

        {/* Stats Overview */}
        <StatsOverview deposits={deposits} isLoading={isLoading} priceData={priceData} />

        {/* Search and Filter Controls */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Hledat podle jména klienta, čísla smlouvy nebo e-mailu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-neutral-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-neutral-300 hover:bg-neutral-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {showFilters && (
                <div className="w-72 flex-shrink-0">
                  <FilterSidebar filters={filters} setFilters={setFilters} />
                </div>
              )}
              <div className="flex-1">
                <DepositTable
                  deposits={filteredDeposits}
                  isLoading={isLoading}
                  onClientClick={handleClientClick}
                  priceData={priceData}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Modal */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />

        {/* Client Detail Modal */}
        {showClientModal && selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setShowClientModal(false)}
            onUpdate={loadDeposits}
            priceData={priceData}
          />
        )}
      </div>
    </div>
  );
}
