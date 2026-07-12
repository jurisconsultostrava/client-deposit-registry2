import React, { useState } from "react";
import { Deposit } from "@/entities/Deposit";
import { InvokeLLM, UploadFile } from "@/integrations/Core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Info } from "lucide-react";
import GoldPriceService from "../gold/GoldPriceService";

export default function ImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const resetState = () => {
    setFile(null);
    setIsProcessing(false);
    setIsImporting(false);
    setProgress(0);
    setExtractedData(null);
    setValidationResults(null);
    setError(null);
    setStatusMessage("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.toLowerCase();
      // Allow CSV or HTML file types
      if (fileType.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Prosím vyberte soubor ve formátu CSV.");
      }
    }
  };

  const calculateMaturityDate = (contractDate) => {
    if (!contractDate) return null;
    const date = new Date(contractDate);
    date.setDate(date.getDate() + 359); // Přidat 359 dní
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return null;

    // Pokud je již datetime objekt z API, převeď na string
    if (dateValue && typeof dateValue === 'object' && dateValue.constructor.name === 'Date') {
      return dateValue.toISOString().split('T')[0];
    }

    // Pokud je string ve formátu datetime objektu
    if (typeof dateValue === 'string' && dateValue.includes('datetime.date(')) {
      const match = dateValue.match(/datetime\.date\((\d{4}), (\d{1,2}), (\d{1,2})\)/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }

    if (typeof dateValue === 'string') {
      const ddmmyyyy = dateValue.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
      if (ddmmyyyy) {
        const day = ddmmyyyy[1].padStart(2, '0');
        const month = ddmmyyyy[2].padStart(2, '0');
        const year = ddmmyyyy[3];
        return `${year}-${month}-${day}`;
      }
    }

    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }

    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
       return null;
    }

    return null;
  };

  const normalizeValue = (value, field) => {
    if (value === null || value === undefined || value === '') return null;

    // Normalizace pro hodnoty "null" a "None"
    if (typeof value === 'string' && (value.toLowerCase() === 'null' || value.toLowerCase() === 'none')) {
      return null;
    }

    const selectMappings = {
      contract_type: {
        'Gold Deposit': 'Gold Deposit',
        'Silver Deposit': 'Silver Deposit',
        'Ostatní': 'Other',
        'Other': 'Other',
        'Gold Depozit': 'Gold Deposit',
        'Dep.GD.': 'Gold Deposit',
        'Gold deposit': 'Gold Deposit'
      },
      commodity: {
        'Zlato (Au)': 'Au',
        'Au': 'Au',
        'AU': 'Au',
        'Au ': 'Au', // with trailing space
        'Stříbro (Ag)': 'Ag',
        'Ag': 'Ag',
        'AG': 'Ag',
        'Platina (Pt)': 'Pt',
        'Pt': 'Pt',
        'PT': 'Pt',
        'Palladium (Pd)': 'Pd',
        'Pd': 'Pd',
        'Ostatní': 'Other',
        'Other': 'Other'
      },
      automatic_renewal: {
        'Ano': 'Yes',
        'Yes': 'Yes',
        'ANO': 'Yes',
        'Ne': 'No',
        'No': 'No',
        'NE': 'No'
      },
      closed: {
        'Aktivní': 'No',
        'Active': 'No',
        'No': 'No',
        'NE': 'No',
        'Otevřeno': 'No',
        'Otevřená': 'No',
        'Ukončeno': 'Yes',
        'Closed': 'Yes',
        'Yes': 'Yes',
        'ANO': 'Yes',
        'Uzavřeno': 'Yes',
        'Uzavřená': 'Yes'
      }
    };

    if (selectMappings[field] && selectMappings[field][String(value)]) {
      return selectMappings[field][String(value)];
    }

    return value;
  };

  const validateRecord = (record) => {
    const errors = [];
    // Odstraněna povinnost všech polí - nyní není žádné pole povinné

    // Pouze validace formátu, pokud jsou hodnoty zadané
    if (record.client_date_of_birth && !parseDate(record.client_date_of_birth)) {
      errors.push('Neplatné datum narození');
    }
    if (record.contract_date && !parseDate(record.contract_date)) {
      errors.push('Neplatné datum smlouvy');
    }
    if (record.investment_amount !== null && record.investment_amount !== undefined && (isNaN(parseFloat(record.investment_amount)) || parseFloat(record.investment_amount) < 0)) {
      errors.push('Hmotnost (g) musí být nezáporné číslo');
    }

    return { errors, warnings: [] };
  };
  
  const parseCsvFormat = (content) => {
    // Normalize line endings, strip BOM
    const text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Detect delimiter: semicolon or comma
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    // Detect format by headers
    const isNewFormat = headers.includes('id') || headers.includes('klient') || headers.includes('vklad');

    return lines.slice(1).map(line => {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      if (isNewFormat) {
        // Format: ID;Klient;začátek;Komodita;Vklad;bonus;Poznámky;Zdroj;aktuální termín
        const idxOf = (name) => headers.findIndex(h => h.includes(name));
        const id = cols[idxOf('id')] || cols[0] || '';
        const klient = cols[idxOf('klient')] || cols[1] || '';
        const parts = klient.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        const contractDate = cols[idxOf('za')] || cols[2] || ''; // "začátek"
        const komodita = cols[idxOf('komodita')] || cols[3] || '';
        const vklad = cols[idxOf('vklad')] || cols[4] || '';
        const poznamky = cols[idxOf('pozn')] || cols[6] || '';
        const termin = cols[idxOf('aktu')] || cols[8] || '';

        // Normalize commodity
        let commodity = 'Au';
        const k = komodita.toLowerCase();
        if (k.startsWith('ag')) commodity = 'Ag';
        else if (k.startsWith('pt')) commodity = 'Pt';
        else if (k.startsWith('pd')) commodity = 'Pd';
        else if (k.startsWith('au')) commodity = 'Au';
        else if (k.includes('a ') || k === 'a') commodity = 'Ag';
        else commodity = 'Other';

        return {
          contract_number: id,
          client_first_name: firstName,
          client_last_name: lastName,
          contract_date: contractDate,
          commodity,
          investment_amount: vklad,
          notes: poznamky !== 'chybí' ? poznamky : null,
          maturity_date: termin || null,
          contract_type: 'Gold Deposit',
        };
      } else {
        // Original format with named columns
        const get = (name) => cols[headers.indexOf(name)] || null;
        const klient = get('jméno klienta') || get('klient') || '';
        const parts = klient.split(' ');
        return {
          client_first_name: parts[0] || '',
          client_last_name: parts.slice(1).join(' ') || '',
          contract_number: get('číslo smlouvy') || get('contract_number') || '',
          contract_type: get('typ smlouvy') || get('contract_type') || 'Gold Deposit',
          commodity: get('komodita') || get('commodity') || '',
          investment_amount: get('hmotnost (g)') || get('investment_amount') || '0',
          contract_date: get('datum smlouvy') || get('contract_date') || null,
          maturity_date: get('lhůta pro ukončení') || get('maturity_date') || null,
          closed: get('stav') || get('closed') || 'Aktivní',
          automatic_renewal: get('obnovení') || get('automatic_renewal') || 'Ne',
          interest_paid_date: get('úrok vyplacen') || get('interest_paid_date') || null,
          phone: get('telefon') || get('phone') || null,
          email: get('email') || null,
          notes: get('poznámky') || get('notes') || null,
          internal_information: get('interní informace') || get('internal_information') || null,
          client_date_of_birth: get('datum narození') || get('client_date_of_birth') || null,
        };
      }
    }).filter(r => r.client_first_name || r.client_last_name || r.contract_number);
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setStatusMessage("Nahrávám soubor...");

    try {
      setProgress(30);
      setStatusMessage("Čtu soubor...");
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });

      setProgress(50);
      setStatusMessage("Parsuju data...");

      const records = parseCsvFormat(fileContent);
      
      const priceData = await GoldPriceService.getCurrentPrices();

      const transformedRecords = records.map((record) => {
          const transformed = {
            client_first_name: record.client_first_name || "",
            client_last_name: record.client_last_name || "",
            client_date_of_birth: parseDate(record.client_date_of_birth),
            phone: normalizeValue(record.phone, 'phone'),
            email: normalizeValue(record.email, 'email'),
            contract_type: normalizeValue(record.contract_type, 'contract_type') || "Other",
            contract_number: record.contract_number || "",
            commodity: normalizeValue(record.commodity, 'commodity') || "Other",
            investment_amount: parseFloat(String(record.investment_amount || "0").replace(",", ".")) || 0,
            gold_price: parseFloat(String(record.gold_price || "0").replace(",", ".")) || 0,
            contract_date: parseDate(record.contract_date),
            maturity_date: parseDate(record.maturity_date),
            automatic_renewal: normalizeValue(record.automatic_renewal || "Ne", 'automatic_renewal'),
            closed: normalizeValue(record.closed || "Aktivní", 'closed'),
            notes: normalizeValue(record.notes, 'notes'),
            interest_paid_date: parseDate(record.interest_paid_date),
            internal_information: normalizeValue(record.internal_information, 'internal_information')
          };

          if (!transformed.maturity_date && transformed.contract_date) {
            transformed.maturity_date = calculateMaturityDate(transformed.contract_date);
          }
          
          if (!transformed.gold_price && priceData) {
            transformed.gold_price = priceData.price_usd_oz || 0;
          }
          
          transformed.current_value_czk = GoldPriceService.calculateValueCZK(transformed.investment_amount, priceData, transformed.commodity);

          return transformed;
      }).filter(record => record.client_first_name || record.client_last_name || record.contract_number); // Filter out completely empty records

      setProgress(80);
      setStatusMessage("Validuji data...");

      if (transformedRecords.length === 0) {
        throw new Error("Nepodařilo se načíst žádná platná data ze souboru. Zkontrolujte, zda soubor obsahuje data a má správný formát.");
      }

      const validation = transformedRecords.map((record, index) => ({
        index: index + 1,
        record,
        ...validateRecord(record)
      }));

      setExtractedData(transformedRecords);
      setValidationResults(validation);
      setProgress(100);
      setStatusMessage(`Data připravena k importu (${transformedRecords.length} záznamů).`);

    } catch (error) {
      console.error("Chyba při zpracování souboru:", error);
      setError(error.message || "Došlo k chybě při zpracování souboru. Ujistěte se, že soubor má správný formát a zkuste to znovu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performImport = async () => {
    if (!extractedData || !validationResults) return;

    const hasErrors = validationResults.some(result => result.errors.length > 0);
    if (hasErrors) {
      setError("Nelze importovat data s chybami. Opravte chyby v souboru a zkuste znovu.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      await Deposit.bulkCreate(extractedData);
      onImportComplete();
      handleClose();
    } catch (error) {
      console.error("Chyba při importu:", error);
      setError("Došlo k chybě při importu dat: " + error.message);
    }
    setIsImporting(false);
  };

  const downloadTemplate = () => {
    const headers = [
      "Jméno klienta", "Číslo smlouvy", "Typ smlouvy", "Komodita",
      "Hmotnost (g)", "Aktuální hodnota CZK",
      "Datum smlouvy", "Lhůta pro ukončení", "Stav",
      "Obnovení", "Úrok vyplacen", "Telefon", "Email", "Poznámky", "Interní informace", "Datum narození"
    ];

    const sampleData = [[
      "Jan Novák", "SML-001", "Gold Deposit", "Au", "100.5", "62000",
      "15.01.2024", "15.12.2024", "Aktivní", "Ano", "",
      "+420123456789", "jan.novak@example.com", "Toto je poznámka.", "", "01.01.1990"
    ]];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_vkladu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import vkladů ze souboru
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!extractedData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="file-upload">Vyberte soubor ve formátu CSV</Label>
                <Button variant="outline" size="sm" onClick={downloadTemplate} >
                  <Download className="w-4 h-4 mr-2" /> Stáhnout CSV šablonu
                </Button>
              </div>
              <Input id="file-upload" type="file" accept=".csv" onChange={handleFileSelect} disabled={isProcessing} />
              
              {file && ( <div className="flex items-center gap-2 text-sm text-gray-600"> <FileText className="w-4 h-4" /> {file.name} ({(file.size / 1024).toFixed(1)} KB) </div> )}
              {isProcessing && ( <div className="space-y-2"> <div className="flex items-center gap-2 text-sm"> <span>{statusMessage}</span> </div> <Progress value={progress} /> </div> )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5"/>Důležité požadavky na formát souboru:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-4">
                  <li>Podporován je formát <strong>CSV</strong> oddělený středníkem nebo čárkou.</li>
                  <li>Nový formát: <strong>ID;Klient;začátek;Komodita;Vklad;bonus;Poznámky;Zdroj;aktuální termín</strong></li>
                  <li>Starý formát: Jméno klienta, Číslo smlouvy, Typ smlouvy, Komodita…</li>
                  <li className="font-semibold text-red-700">Soubor musí být v kódování UTF-8!</li>
                  <li>Datumy ve formátu DD.MM.YYYY nebo YYYY-MM-DD.</li>
                </ul>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
              </AlertDescription>
            </Alert>
          )}

          {validationResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Náhled importovaných dat ({validationResults.length} záznamů)</h3>
                <div className="flex gap-2">
                  <span className="text-sm text-green-600"> ✓ {validationResults.filter(r => r.errors.length === 0).length} v pořádku </span>
                  <span className="text-sm text-red-600"> ✗ {validationResults.filter(r => r.errors.length > 0).length} s chybami </span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Smlouva</TableHead>
                      <TableHead>Hmotnost (g)</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="w-12">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result) => (
                      <TableRow key={result.index} className={result.errors.length > 0 ? "bg-red-50" : ""}>
                        <TableCell>{result.index}</TableCell>
                        <TableCell> {result.record.client_first_name} {result.record.client_last_name} </TableCell>
                        <TableCell>{result.record.contract_number}</TableCell>
                        <TableCell>{result.record.investment_amount}</TableCell>
                        <TableCell>{normalizeValue(result.record.closed, 'closed') === "Yes" ? "Ukončeno" : "Aktivní"}</TableCell>
                        <TableCell> {result.errors.length === 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" title={result.errors.join(', ')} /> } </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {validationResults.some(r => r.errors.length > 0) && (
                <div className="bg-red-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                  <h4 className="font-medium text-red-900 mb-2">Nalezené chyby:</h4>
                  <div className="space-y-2 text-sm text-red-800">
                    {validationResults.map((result) => result.errors.length > 0 && ( <div key={result.index}> <strong>Řádek {result.index}:</strong> <ul className="ml-4 list-disc"> {result.errors.map((error, i) => <li key={i}>{error}</li>)} </ul> </div> ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}> <X className="w-4 h-4 mr-2" /> Zrušit </Button>
            {!extractedData && file && ( <Button onClick={processFile} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white"> {isProcessing ? "Zpracovávání..." : <><Upload className="w-4 h-4 mr-2" />Zpracovat soubor</>} </Button> )}
            {validationResults && ( <Button onClick={performImport} disabled={isImporting || validationResults.some(r => r.errors.length > 0)} className="bg-green-600 hover:bg-green-700 text-white"> {isImporting ? "Importování..." : <><CheckCircle className="w-4 h-4 mr-2" />Importovat ({validationResults.filter(r => r.errors.length === 0).length} záznamů)</>} </Button> )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}