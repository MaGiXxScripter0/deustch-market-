"use client";

import { useMemo, useState } from "react";
import { calculatePackages, euro } from "@/lib/catalog";

export function QuantityCalculator({
  coverage,
  price,
  unit,
}: {
  coverage: number;
  price: number;
  unit: string;
}) {
  const [area, setArea] = useState(10);
  const [waste, setWaste] = useState(10);
  const calculation = useMemo(
    () => calculatePackages(area, waste, coverage, price),
    [area, waste, coverage, price],
  );
  return (
    <section className="calculator">
      <p className="kicker">MENGENRECHNER</p>
      <h2>Wie viel brauchen Sie?</h2>
      <div className="calculator-fields">
        <label>
          Projektfläche
          <input
            type="number"
            min="0"
            step="0.1"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
          />
          <span>m²</span>
        </label>
        <label>
          Verschnitt
          <select value={waste} onChange={(event) => setWaste(Number(event.target.value))}>
            <option value="0">0 %</option>
            <option value="5">5 %</option>
            <option value="10">10 %</option>
            <option value="15">15 %</option>
          </select>
        </label>
      </div>
      <div className="calculator-result">
        <span>Sie benötigen</span>
        <strong>
          {calculation.packages} {unit}
        </strong>
        <small>
          {calculation.covered.toLocaleString("de-DE", { maximumFractionDigits: 2 })} m² inklusive{" "}
          {waste} % Reserve
        </small>
        <b>{euro.format(calculation.total)}</b>
      </div>
    </section>
  );
}
