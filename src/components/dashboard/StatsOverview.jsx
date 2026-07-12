import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Calendar, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import GoldPriceService from "../gold/GoldPriceService";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-neutral-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
          <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-neutral-800">{value}</span>
      </div>
    </CardContent>
  </Card>
);

export default function StatsOverview({ deposits, isLoading, priceData }) {
  const stats = React.useMemo(() => {
    if (!deposits.length) return null;

    const totalDeposits = deposits.length;

    const activeDepositsList = deposits.filter(d => {
      const closedValue = String(d.closed || "no").toLowerCase();
      return closedValue !== "yes" && closedValue !== "ano" && closedValue !== "true" && closedValue !== "ukončeno";
    });

    const activeDeposits = activeDepositsList.length;

    const activeGoldDeposits = activeDepositsList.filter(d => d.commodity === "Au");

    const totalGoldWeight = activeGoldDeposits.reduce((sum, d) => sum + (d.investment_amount || 0), 0);

    const averageGoldWeight = activeGoldDeposits.length > 0 ? totalGoldWeight / activeGoldDeposits.length : 0;

    const renewalRate = totalDeposits > 0 ? (deposits.filter(d => {
      const renewalValue = String(d.automatic_renewal || "").toLowerCase();
      return renewalValue === "yes" || renewalValue === "ano" || renewalValue === "true";
    }).length / totalDeposits) * 100 : 0;

    // Celková hodnota = hmotnost zlata * cena zlata CZK/g
    const goldPriceCZKperGram = priceData ? (priceData.price_czk_oz || 0) / 31.1035 : 0;
    const totalGoldValueCZK = totalGoldWeight * goldPriceCZKperGram;

    return {
      totalDeposits,
      activeDeposits,
      totalWeight: totalGoldWeight,
      averageWeight: averageGoldWeight,
      renewalRate,
      totalValueCZK: totalGoldValueCZK
    };
  }, [deposits, priceData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      <StatCard title="Celkem vkladů" value={stats.totalDeposits} icon={Users} color="bg-blue-500" />
      <StatCard title="Aktivní vklady" value={stats.activeDeposits} icon={TrendingUp} color="bg-green-500" />
      <StatCard title="Hmotnost Au (aktivní)" value={`${stats.totalWeight.toLocaleString('cs-CZ')} g`} icon={DollarSign} color="bg-yellow-500" />
      <StatCard title="Prům. hmotnost Au (aktivní)" value={`${stats.averageWeight.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} g`} icon={Calendar} color="bg-purple-500" />
      <StatCard title="Míra obnovení" value={`${stats.renewalRate.toFixed(1)}%`} icon={Percent} color="bg-orange-500" />
      <StatCard title="Hodnota Au (aktivní)" value={stats.totalValueCZK.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })} icon={DollarSign} color="bg-emerald-500" />
    </div>
  );
}